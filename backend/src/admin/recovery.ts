import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { AppConfig } from '../config.js';

export interface BackupRecord {
  filename: string;
  filePath: string;
  sizeBytes: number;
  createdAt: string;
}

export interface SystemDiagnostics {
  service: string;
  version: string;
  uptimeSeconds: number;
  nodeVersion: string;
  platform: string;
  arch: string;
  memoryUsageMb: {
    rss: number;
    heapTotal: number;
    heapUsed: number;
    external: number;
  };
  database: {
    path: string;
    sizeBytes: number | null;
    totalChannels: number;
    totalStreams: number;
    totalReports: number;
    pendingReports: number;
    activeJobs: number;
  };
  budgets: {
    healthCheckIntervalMinutes: number;
    healthCheckBatchSize: number;
    healthCheckConcurrency: number;
    healthCheckTimeoutMs: number;
    healthCheckMaxBytes: number;
  };
}

/**
 * Recovers jobs that were left in 'running' state if Android Termux or the
 * backend process was killed or restarted.
 */
export function recoverInterruptedJobs(db: DatabaseSync): { recoveredJobsCount: number } {
  const selectRunning = db.prepare("SELECT id, type FROM jobs WHERE status = 'running'");
  const runningJobs = selectRunning.all() as unknown as { id: string; type: string }[];

  if (runningJobs.length === 0) {
    return { recoveredJobsCount: 0 };
  }

  const updateStmt = db.prepare(`
    UPDATE jobs
    SET status = 'failed',
        error_summary = 'Interrupted by server restart; resumable from checkpoint.',
        updated_at = datetime('now')
    WHERE id = ?
  `);

  for (const job of runningJobs) {
    updateStmt.run(job.id);
  }

  return { recoveredJobsCount: runningJobs.length };
}

/**
 * Creates an atomic snapshot backup of the current SQLite database using VACUUM INTO.
 */
export function createDatabaseBackup(
  db: DatabaseSync,
  backupDir: string,
  _databasePath: string
): BackupRecord {
  const resolvedDir = path.resolve(process.cwd(), backupDir);
  fs.mkdirSync(resolvedDir, { recursive: true });

  const filename = `teleplay_backup_${Date.now()}.sqlite`;
  const targetPath = path.join(resolvedDir, filename);

  // Use SQLite standard atomic VACUUM INTO
  db.exec(`VACUUM INTO '${targetPath}';`);

  const stat = fs.statSync(targetPath);
  return {
    filename,
    filePath: targetPath,
    sizeBytes: stat.size,
    createdAt: stat.birthtime.toISOString(),
  };
}

/**
 * Lists available SQLite database backups sorted newest first.
 */
export function listDatabaseBackups(backupDir: string): BackupRecord[] {
  const resolvedDir = path.resolve(process.cwd(), backupDir);
  if (!fs.existsSync(resolvedDir)) return [];

  const files = fs.readdirSync(resolvedDir);
  const backups: BackupRecord[] = [];

  for (const file of files) {
    if (file.endsWith('.sqlite')) {
      const fullPath = path.join(resolvedDir, file);
      try {
        const stat = fs.statSync(fullPath);
        backups.push({
          filename: file,
          filePath: fullPath,
          sizeBytes: stat.size,
          createdAt: stat.birthtime.toISOString(),
        });
      } catch {
        // Skip unreadable files
      }
    }
  }

  return backups.sort((a, b) => b.filename.localeCompare(a.filename));
}

/**
 * Collects runtime system, memory, Termux health, and database metrics.
 */
export function getSystemDiagnostics(db: DatabaseSync, config: AppConfig): SystemDiagnostics {
  const mem = process.memoryUsage();

  const toMb = (bytes: number) => Math.round((bytes / 1024 / 1024) * 100) / 100;

  const channelCount = (db.prepare('SELECT COUNT(*) as c FROM channels').get() as { c: number }).c;
  const streamCount = (db.prepare('SELECT COUNT(*) as c FROM channel_sources').get() as { c: number }).c;
  const totalReports = (db.prepare('SELECT COUNT(*) as c FROM channel_reports').get() as { c: number }).c;
  const pendingReports = (db.prepare("SELECT COUNT(*) as c FROM channel_reports WHERE status = 'pending'").get() as { c: number }).c;
  const activeJobs = (db.prepare("SELECT COUNT(*) as c FROM jobs WHERE status IN ('pending', 'running')").get() as { c: number }).c;

  let dbSizeBytes: number | null = null;
  if (config.databasePath && config.databasePath !== ':memory:') {
    try {
      dbSizeBytes = fs.statSync(config.databasePath).size;
    } catch {
      dbSizeBytes = null;
    }
  }

  return {
    service: 'teleplay-backend',
    version: '0.1.0',
    uptimeSeconds: Math.floor(process.uptime()),
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
    memoryUsageMb: {
      rss: toMb(mem.rss),
      heapTotal: toMb(mem.heapTotal),
      heapUsed: toMb(mem.heapUsed),
      external: toMb(mem.external),
    },
    database: {
      path: config.databasePath,
      sizeBytes: dbSizeBytes,
      totalChannels: channelCount,
      totalStreams: streamCount,
      totalReports,
      pendingReports,
      activeJobs,
    },
    budgets: {
      healthCheckIntervalMinutes: config.healthCheckIntervalMinutes,
      healthCheckBatchSize: config.healthCheckBatchSize,
      healthCheckConcurrency: config.healthCheckConcurrency,
      healthCheckTimeoutMs: config.healthCheckTimeoutMs,
      healthCheckMaxBytes: config.healthCheckMaxBytes,
    },
  };
}

/**
 * Updates status of a submitted channel report.
 */
export function updateReportStatus(
  db: DatabaseSync,
  reportId: number,
  status: 'pending' | 'investigated' | 'dismissed'
): boolean {
  const stmt = db.prepare('UPDATE channel_reports SET status = ? WHERE id = ?');
  const res = stmt.run(status, reportId);
  return res.changes > 0;
}

