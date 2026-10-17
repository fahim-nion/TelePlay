import { FastifyPluginAsync } from 'fastify';
import { DatabaseSync } from 'node:sqlite';
import { AppConfig } from '../config.js';
import { createAdminAuthHook } from '../admin/auth.js';
import {
  getSystemDiagnostics,
  createDatabaseBackup,
  listDatabaseBackups,
  updateReportStatus,
} from '../admin/recovery.js';
import { listChannelReports, persistParsedPlaylist } from '../db/repository.js';
import { getSourceById as getApprovedSource } from '../ingestion/sources.js';
import { safeFetch } from '../ingestion/safe-fetcher.js';
import { parseM3U } from '../parser/m3u.js';
import { runHealthCheckBatch } from '../health/checker.js';

export interface AdminRoutesOptions {
  db: DatabaseSync;
  config: AppConfig;
}

export const adminRoutes: FastifyPluginAsync<AdminRoutesOptions> = async (app, options) => {
  const { db, config } = options;

  // Protect all routes in this plugin with admin token verification
  app.addHook('preHandler', createAdminAuthHook(config.adminToken));

  // 1. GET /api/admin/system (Diagnostics & Termux metrics)
  app.get('/system', async () => {
    const diagnostics = getSystemDiagnostics(db, config);
    return { diagnostics };
  });

  // 2. GET /api/admin/jobs (List recent background jobs)
  app.get('/jobs', async (req) => {
    const query = req.query as { limit?: string; status?: string };
    const limit = Math.min(100, Math.max(1, parseInt(query.limit || '50', 10)));

    let sql = 'SELECT * FROM jobs';
    const params: (string | number)[] = [];

    if (query.status) {
      sql += ' WHERE status = ?';
      params.push(query.status);
    }

    sql += ' ORDER BY started_at DESC LIMIT ?';
    params.push(limit);

    const stmt = db.prepare(sql);
    const jobs = stmt.all(...params);
    return { jobs };
  });

  // 3. GET /api/admin/jobs/:id (Get single job progress)
  app.get('/jobs/:id', async (req, reply) => {
    const params = req.params as { id: string };
    const stmt = db.prepare('SELECT * FROM jobs WHERE id = ?');
    const job = stmt.get(params.id);

    if (!job) {
      reply.status(404);
      return { error: 'Job not found', statusCode: 404 };
    }

    return { job };
  });

  // 4. POST /api/admin/jobs/:id/cancel (Cancel an active background job)
  app.post('/jobs/:id/cancel', async (req, reply) => {
    const params = req.params as { id: string };
    const stmt = db.prepare(`
      UPDATE jobs
      SET status = 'failed',
          error_summary = 'Cancelled by administrator.',
          finished_at = datetime('now')
      WHERE id = ? AND status IN ('pending', 'running')
    `);

    const result = stmt.run(params.id);
    if (result.changes === 0) {
      reply.status(400);
      return { error: 'Job is not actively running or does not exist.', statusCode: 400 };
    }

    return { success: true, message: `Job ${params.id} cancelled successfully.` };
  });

  // 5. POST /api/admin/sources/:id/refresh (Trigger manual source ingestion)
  app.post('/sources/:id/refresh', async (req, reply) => {
    const params = req.params as { id: string };
    const source = getApprovedSource(params.id);

    if (!source) {
      reply.status(404);
      return { error: `Source '${params.id}' is not in the approved whitelist.`, statusCode: 404 };
    }

    const jobId = `import_${params.id}_${Date.now()}`;
    const insertJob = db.prepare(`
      INSERT INTO jobs (id, type, status, started_at)
      VALUES (?, 'import', 'running', datetime('now'))
    `);
    insertJob.run(jobId);

    // Launch ingestion asynchronously
    setImmediate(async () => {
      try {
        const fetchRes = await safeFetch(source.url);
        const parsed = parseM3U(fetchRes.data);
        const stats = persistParsedPlaylist(db, source.id, parsed, source.categoryDefault);

        const completeJob = db.prepare(`
          UPDATE jobs
          SET status = 'completed',
              progress_current = ?,
              progress_total = ?,
              finished_at = datetime('now')
          WHERE id = ?
        `);
        completeJob.run(stats.insertedStreams + stats.updatedStreams, parsed.entries.length, jobId);
      } catch (err: any) {
        const failJob = db.prepare(`
          UPDATE jobs
          SET status = 'failed',
              error_summary = ?,
              finished_at = datetime('now')
          WHERE id = ?
        `);
        failJob.run(err.message || 'Unknown ingestion error', jobId);
      }
    });

    reply.status(202);
    return {
      success: true,
      jobId,
      message: `Ingestion job launched for source '${source.name}'.`,
    };
  });

  // 6. POST /api/admin/health-check/run (Manual scan budget control)
  app.post('/health-check/run', async (req) => {
    const body = (req.body as {
      batchSize?: number;
      concurrency?: number;
      timeoutMs?: number;
      maxBytes?: number;
    }) || {};

    const batchSize = Math.min(100, Math.max(1, body.batchSize || config.healthCheckBatchSize));
    const concurrency = Math.min(10, Math.max(1, body.concurrency || config.healthCheckConcurrency));
    const timeoutMs = Math.min(15000, Math.max(1000, body.timeoutMs || config.healthCheckTimeoutMs));
    const maxBytes = Math.min(262144, Math.max(8192, body.maxBytes || config.healthCheckMaxBytes));

    const result = await runHealthCheckBatch(db, {
      batchSize,
      globalConcurrency: concurrency,
      timeoutMs,
      maxBytes,
    });

    return {
      success: true,
      jobId: result.jobId,
      totalChecked: result.totalChecked,
      workingCount: result.workingCount,
      unreachableCount: result.unreachableCount,
      unsupportedCount: result.unsupportedCount,
      durationMs: result.durationMs,
      checkpointId: result.checkpointId,
      appliedBudget: {
        batchSize,
        concurrency,
        timeoutMs,
        maxBytes,
      },
    };
  });

  // 7. POST /api/admin/backup (Atomic SQLite backup snapshot)
  app.post('/backup', async (_req, reply) => {
    const backup = createDatabaseBackup(db, config.backupDir, config.databasePath);
    reply.status(201);
    return {
      success: true,
      backup,
      message: 'Database backup created successfully via atomic VACUUM INTO.',
    };
  });

  // 8. GET /api/admin/backups (List available backups)
  app.get('/backups', async () => {
    const backups = listDatabaseBackups(config.backupDir);
    return { backups };
  });

  // 9. GET /api/admin/reports (List submitted broken link reports)
  app.get('/reports', async (req) => {
    const query = req.query as { limit?: string };
    const limit = Math.min(100, Math.max(1, parseInt(query.limit || '50', 10)));
    const reports = listChannelReports(db, limit);
    return { reports };
  });

  // 10. PATCH /api/admin/reports/:id (Update investigation status of a report)
  app.patch('/reports/:id', async (req, reply) => {
    const params = req.params as { id: string };
    const reportId = parseInt(params.id, 10);

    if (isNaN(reportId)) {
      reply.status(400);
      return { error: 'Invalid report ID', statusCode: 400 };
    }

    const body = req.body as { status?: 'pending' | 'investigated' | 'dismissed' };
    const validStatuses = ['pending', 'investigated', 'dismissed'];

    if (!body || !body.status || !validStatuses.includes(body.status)) {
      reply.status(400);
      return { error: 'Invalid status. Must be pending, investigated, or dismissed.', statusCode: 400 };
    }

    const updated = updateReportStatus(db, reportId, body.status);
    if (!updated) {
      reply.status(404);
      return { error: 'Report not found', statusCode: 404 };
    }

    return { success: true, message: `Report ${reportId} status updated to ${body.status}.` };
  });
};
