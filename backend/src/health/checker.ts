import { DatabaseSync } from 'node:sqlite';
import { safeFetch, SafeFetchError } from '../ingestion/safe-fetcher.js';
import { validateUrlSafety } from '../ingestion/ssrf.js';
import {
  HealthStatus,
  ProbeResult,
  HealthCheckOptions,
  HealthCheckBatchOptions,
  BatchRunResult,
} from './types.js';

/**
 * Extracts the first sub-variant playlist URL from an HLS master manifest.
 */
export function extractFirstVariantUrl(manifestContent: string, baseUrl: string): string | null {
  const lines = manifestContent.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('#EXT-X-STREAM-INF:') && i + 1 < lines.length) {
      const nextLine = lines[i + 1].trim();
      if (nextLine.length > 0 && !nextLine.startsWith('#')) {
        try {
          return new URL(nextLine, baseUrl).toString();
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

/**
 * Executes a bounded probe on a stream URL.
 * Never downloads media video segments. Bounded to max 64KB manifests.
 */
export async function probeStreamUrl(
  url: string,
  options: HealthCheckOptions = {}
): Promise<ProbeResult> {
  const startTime = Date.now();
  const timeoutMs = options.timeoutMs ?? 5000;
  const maxBytes = options.maxBytes ?? 65536; // 64 KB ceiling

  // 1. Identify external web platform pages (e.g. YouTube/Twitch live channels)
  const lowerUrl = url.toLowerCase();
  if (lowerUrl.includes('youtube.com') || lowerUrl.includes('twitch.tv')) {
    return {
      status: 'unsupported',
      responseTimeMs: Date.now() - startTime,
      errorSummary: 'External web platform stream (requires proprietary web player)',
    };
  }

  // 2. SSRF Pre-flight check
  const safety = await validateUrlSafety(url);
  if (!safety.safe) {
    return {
      status: 'unreachable',
      responseTimeMs: Date.now() - startTime,
      errorSummary: `Security validation blocked URL: ${safety.reason}`,
    };
  }

  // 3. Probe top-level manifest
  let masterContent = '';
  let httpStatus = 0;

  try {
    const res = await safeFetch(url, {
      timeoutMs,
      maxBytes,
      maxRedirects: 3,
    });
    httpStatus = res.status;
    masterContent = res.data;
  } catch (err) {
    const duration = Date.now() - startTime;
    if (err instanceof SafeFetchError) {
      return {
        status: 'unreachable',
        responseTimeMs: duration,
        errorSummary: err.message,
      };
    }
    return {
      status: 'unreachable',
      responseTimeMs: duration,
      errorSummary: err instanceof Error ? err.message : String(err),
    };
  }

  // 4. Validate HLS Manifest signature
  const trimmed = masterContent.trim();
  const hasHlsSignature = trimmed.startsWith('#EXTM3U') || trimmed.includes('#EXT-X-');

  if (!hasHlsSignature) {
    return {
      status: 'unreachable',
      httpStatus,
      responseTimeMs: Date.now() - startTime,
      errorSummary: 'Response missing valid HLS manifest signature (#EXTM3U)',
    };
  }

  // 5. Optional Deep HLS Check: If master manifest, probe first variant
  if (options.checkVariant !== false && trimmed.includes('#EXT-X-STREAM-INF:')) {
    const variantUrl = extractFirstVariantUrl(trimmed, url);
    if (variantUrl) {
      try {
        const variantRes = await safeFetch(variantUrl, {
          timeoutMs,
          maxBytes,
          maxRedirects: 3,
        });

        const variantContent = variantRes.data.trim();
        const isMediaPlaylist =
          variantContent.includes('#EXT-X-TARGETDURATION') ||
          variantContent.includes('#EXTINF:') ||
          variantContent.includes('#EXT-X-MEDIA-SEQUENCE');

        if (!isMediaPlaylist) {
          return {
            status: 'intermittent',
            httpStatus: variantRes.status,
            responseTimeMs: Date.now() - startTime,
            errorSummary: 'Master manifest valid, but sub-variant playlist missing media segment tags',
          };
        }
      } catch (err) {
        return {
          status: 'unreachable',
          responseTimeMs: Date.now() - startTime,
          errorSummary: `Master manifest reachable (200), but variant playlist failed: ${err instanceof Error ? err.message : String(err)}`,
        };
      }
    }
  }

  return {
    status: 'working',
    httpStatus,
    responseTimeMs: Date.now() - startTime,
    isHlsValid: true,
  };
}

/**
 * Runs a bounded, resumable background batch of health checks.
 * Uses per-host concurrency (1 per host) and global concurrency caps.
 */
export async function runHealthCheckBatch(
  db: DatabaseSync,
  options: HealthCheckBatchOptions = {}
): Promise<BatchRunResult> {
  const startTime = Date.now();
  const batchSize = options.batchSize ?? 20;
  const globalConcurrency = options.globalConcurrency ?? 5;
  const timeoutMs = options.timeoutMs ?? 5000;
  const maxBytes = options.maxBytes ?? 65536;

  const jobId = `hc_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

  // 1. Get or initialize checkpoint from latest health check job
  const selectCheckpoint = db.prepare(`
    SELECT checkpoint_data FROM jobs 
    WHERE type = 'health_check' 
    ORDER BY rowid DESC LIMIT 1
  `);
  const existingJob = selectCheckpoint.get() as { checkpoint_data: string | null } | undefined;

  let lastProcessedId = 0;
  if (existingJob && existingJob.checkpoint_data) {
    try {
      const parsedData = JSON.parse(existingJob.checkpoint_data);
      if (typeof parsedData.lastProcessedId === 'number') {
        lastProcessedId = parsedData.lastProcessedId;
      }
    } catch {
      // Reset if corrupt
      lastProcessedId = 0;
    }
  }

  // 2. Select next batch of channel streams
  const selectStreams = db.prepare(`
    SELECT id, stream_url 
    FROM channel_sources 
    WHERE is_active = 1 AND id > ?
    ORDER BY id ASC
    LIMIT ?
  `);
  let streams = selectStreams.all(lastProcessedId, batchSize) as unknown as { id: number; stream_url: string }[];

  // If reached end of list, wrap around to beginning
  if (streams.length === 0) {
    lastProcessedId = 0;
    streams = selectStreams.all(0, batchSize) as unknown as { id: number; stream_url: string }[];
  }

  // Record job in jobs table
  const insertJob = db.prepare(`
    INSERT INTO jobs (id, type, status, progress_current, progress_total, checkpoint_data, started_at)
    VALUES (?, 'health_check', 'running', 0, ?, ?, datetime('now'))
  `);
  insertJob.run(jobId, streams.length, JSON.stringify({ lastProcessedId }));

  const insertCheck = db.prepare(`
    INSERT INTO health_checks (channel_source_id, status, http_status, response_time_ms, error_summary, checked_at)
    VALUES (?, ?, ?, ?, ?, datetime('now'))
  `);

  const updateJobProgress = db.prepare(`
    UPDATE jobs 
    SET progress_current = ?, checkpoint_data = ?, updated_at = datetime('now')
    WHERE id = ?
  `);

  let workingCount = 0;
  let unreachableCount = 0;
  let unsupportedCount = 0;
  let completedCount = 0;

  // Execute probes with host concurrency tracking
  const activeHosts = new Map<string, number>();

  async function probeStream(stream: { id: number; stream_url: string }) {
    let hostname = 'unknown';
    try {
      hostname = new URL(stream.stream_url).hostname;
    } catch {
      hostname = 'invalid';
    }

    // Wait if this host is already being probed by another concurrent task
    while ((activeHosts.get(hostname) || 0) >= 1) {
      await new Promise((r) => setTimeout(r, 100));
    }

    activeHosts.set(hostname, (activeHosts.get(hostname) || 0) + 1);

    try {
      const probeRes = await probeStreamUrl(stream.stream_url, { timeoutMs, maxBytes });

      // Save to database
      insertCheck.run(
        stream.id,
        probeRes.status,
        probeRes.httpStatus || null,
        probeRes.responseTimeMs,
        probeRes.errorSummary || null
      );

      if (probeRes.status === 'working') workingCount++;
      else if (probeRes.status === 'unreachable') unreachableCount++;
      else if (probeRes.status === 'unsupported') unsupportedCount++;

      completedCount++;
      lastProcessedId = stream.id;

      // Update checkpoint
      updateJobProgress.run(completedCount, JSON.stringify({ lastProcessedId }), jobId);
    } finally {
      activeHosts.set(hostname, Math.max(0, (activeHosts.get(hostname) || 1) - 1));
    }
  }

  // Worker pool for global concurrency control
  const queue = [...streams];
  const workers = Array.from({ length: Math.min(globalConcurrency, queue.length) }, async () => {
    while (queue.length > 0) {
      const item = queue.shift();
      if (item) {
        await probeStream(item);
      }
    }
  });

  await Promise.all(workers);

  // Mark job completed
  const completeJob = db.prepare(`
    UPDATE jobs 
    SET status = 'completed', progress_current = ?, finished_at = datetime('now'), updated_at = datetime('now')
    WHERE id = ?
  `);
  completeJob.run(completedCount, jobId);

  return {
    jobId,
    totalChecked: completedCount,
    workingCount,
    unreachableCount,
    unsupportedCount,
    durationMs: Date.now() - startTime,
    checkpointId: lastProcessedId,
  };
}

/**
 * Marks channel sources as 'stale' when their latest check is older than threshold.
 */
export function expireStaleChecks(
  db: DatabaseSync,
  staleThresholdHours: number = 24
): number {
  const insertStaleStmt = db.prepare(`
    INSERT INTO health_checks (channel_source_id, status, error_summary, checked_at)
    SELECT cs.id, 'stale', 'Check results expired outside freshness window', datetime('now')
    FROM channel_sources cs
    WHERE cs.is_active = 1
      AND (
        SELECT hc.checked_at 
        FROM health_checks hc 
        WHERE hc.channel_source_id = cs.id 
        ORDER BY hc.checked_at DESC 
        LIMIT 1
      ) < datetime('now', '-' || ? || ' hours')
  `);

  const res = insertStaleStmt.run(staleThresholdHours);
  return Number(res.changes);
}
