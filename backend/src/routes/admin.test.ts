import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { FastifyInstance } from 'fastify';
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { buildApp } from '../server.js';
import { createDatabase } from '../db/database.js';
import { persistParsedPlaylist, createChannelReport } from '../db/repository.js';
import { parseM3U } from '../parser/m3u.js';
import { loadConfig, AppConfig } from '../config.js';
import { recoverInterruptedJobs } from '../admin/recovery.js';

describe('Admin and Recovery Engine (Phase 11)', () => {
  let app: FastifyInstance;
  let db: DatabaseSync;
  let testConfig: AppConfig;
  const ADMIN_SECRET = 'test-admin-secret-xyz';
  const TEST_BACKUP_DIR = './data/test_backups_' + Date.now();

  beforeEach(async () => {
    db = createDatabase(':memory:');
    const testPlaylist =
      '#EXTM3U\n' +
      '#EXTINF:-1 tvg-id="c1" tvg-country="US" group-title="News",CNN America\n' +
      'https://stream.example.com/cnn.m3u8\n' +
      '#EXTINF:-1 tvg-id="c2" tvg-country="GB" group-title="News",BBC World\n' +
      'https://stream.example.com/bbc.m3u8\n';

    persistParsedPlaylist(db, 'free-tv', parseM3U(testPlaylist));

    testConfig = loadConfig();
    testConfig.logLevel = 'silent';
    testConfig.adminToken = ADMIN_SECRET;
    testConfig.backupDir = TEST_BACKUP_DIR;

    app = await buildApp(testConfig, db);
  });

  afterEach(async () => {
    await app.close();
    // Clean up test backup directory
    if (fs.existsSync(TEST_BACKUP_DIR)) {
      fs.rmSync(TEST_BACKUP_DIR, { recursive: true, force: true });
    }
  });

  describe('Admin Authentication & Protection', () => {
    it('rejects unauthenticated requests to /api/admin routes with 401', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/admin/system',
      });

      assert.equal(res.statusCode, 401);
      const body = JSON.parse(res.payload);
      assert.equal(body.error, 'Unauthorized: Valid admin token required.');
    });

    it('rejects requests with incorrect admin token with 401', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/admin/system',
        headers: {
          'x-admin-token': 'wrong-secret-token',
        },
      });

      assert.equal(res.statusCode, 401);
    });

    it('authenticates successfully via x-admin-token header', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/admin/system',
        headers: {
          'x-admin-token': ADMIN_SECRET,
        },
      });

      assert.equal(res.statusCode, 200);
      const body = JSON.parse(res.payload);
      assert.ok(body.diagnostics);
      assert.equal(body.diagnostics.service, 'teleplay-backend');
    });

    it('authenticates successfully via Authorization Bearer header', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/admin/system',
        headers: {
          authorization: `Bearer ${ADMIN_SECRET}`,
        },
      });

      assert.equal(res.statusCode, 200);
    });
  });

  describe('System Diagnostics & Termux Metrics', () => {
    it('returns complete memory, database, and scan budget metrics', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/admin/system',
        headers: { 'x-admin-token': ADMIN_SECRET },
      });

      assert.equal(res.statusCode, 200);
      const { diagnostics } = JSON.parse(res.payload);
      assert.equal(typeof diagnostics.uptimeSeconds, 'number');
      assert.ok(diagnostics.nodeVersion.startsWith('v'));
      assert.ok(diagnostics.platform);
      assert.ok(diagnostics.memoryUsageMb.rss > 0);
      assert.equal(diagnostics.database.totalChannels, 2);
      assert.equal(diagnostics.database.totalStreams, 2);
      assert.equal(diagnostics.budgets.healthCheckConcurrency, testConfig.healthCheckConcurrency);
    });
  });

  describe('Termux Restart Recovery & Job Checkpoints', () => {
    it('recovers interrupted jobs left in running state upon server restart', () => {
      const jobId = 'test_interrupted_job_' + Date.now();
      db.prepare(`
        INSERT INTO jobs (id, type, status, started_at)
        VALUES (?, 'health_check', 'running', datetime('now'))
      `).run(jobId);

      const recoveryResult = recoverInterruptedJobs(db);
      assert.equal(recoveryResult.recoveredJobsCount, 1);

      const job = db.prepare('SELECT status, error_summary FROM jobs WHERE id = ?').get(jobId) as {
        status: string;
        error_summary: string;
      };

      assert.equal(job.status, 'failed');
      assert.ok(job.error_summary.includes('Interrupted by server restart'));
    });

    it('lists and cancels active jobs via admin API', async () => {
      const jobId = 'active_job_to_cancel_' + Date.now();
      db.prepare(`
        INSERT INTO jobs (id, type, status, started_at)
        VALUES (?, 'import', 'running', datetime('now'))
      `).run(jobId);

      // 1. List jobs
      const listRes = await app.inject({
        method: 'GET',
        url: '/api/admin/jobs',
        headers: { 'x-admin-token': ADMIN_SECRET },
      });
      assert.equal(listRes.statusCode, 200);
      const { jobs } = JSON.parse(listRes.payload);
      assert.ok(jobs.some((j: { id: string }) => j.id === jobId));

      // 2. Cancel job
      const cancelRes = await app.inject({
        method: 'POST',
        url: `/api/admin/jobs/${jobId}/cancel`,
        headers: { 'x-admin-token': ADMIN_SECRET },
      });
      assert.equal(cancelRes.statusCode, 200);

      // 3. Verify job status updated
      const getRes = await app.inject({
        method: 'GET',
        url: `/api/admin/jobs/${jobId}`,
        headers: { 'x-admin-token': ADMIN_SECRET },
      });
      const { job } = JSON.parse(getRes.payload);
      assert.equal(job.status, 'failed');
      assert.equal(job.error_summary, 'Cancelled by administrator.');
    });
  });

  describe('Scan Budget Control & Manual Health Check Run', () => {
    it('runs bounded health check batch with admin-supplied budget parameters', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/admin/health-check/run',
        headers: { 'x-admin-token': ADMIN_SECRET },
        payload: {
          batchSize: 5,
          concurrency: 2,
          timeoutMs: 3000,
        },
      });

      assert.equal(res.statusCode, 200);
      const body = JSON.parse(res.payload);
      assert.equal(body.success, true);
      assert.equal(typeof body.totalChecked, 'number');
      assert.equal(body.appliedBudget.concurrency, 2);
      assert.equal(body.appliedBudget.batchSize, 5);
      assert.equal(body.appliedBudget.timeoutMs, 3000);
    });
  });

  describe('Source Manual Refresh Control', () => {
    it('triggers manual refresh for approved source', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/admin/sources/free-tv/refresh',
        headers: { 'x-admin-token': ADMIN_SECRET },
      });

      assert.equal(res.statusCode, 202);
      const body = JSON.parse(res.payload);
      assert.equal(body.success, true);
      assert.ok(body.jobId.startsWith('import_free-tv_'));
    });

    it('rejects manual refresh for unapproved source ID', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/admin/sources/unapproved-source-xyz/refresh',
        headers: { 'x-admin-token': ADMIN_SECRET },
      });

      assert.equal(res.statusCode, 404);
      const body = JSON.parse(res.payload);
      assert.ok(body.error.includes('whitelist'));
    });
  });

  describe('Database Atomic Backup & Listing', () => {
    it('creates an atomic SQLite backup snapshot and lists it', async () => {
      // 1. Create backup
      const backupRes = await app.inject({
        method: 'POST',
        url: '/api/admin/backup',
        headers: { 'x-admin-token': ADMIN_SECRET },
      });

      assert.equal(backupRes.statusCode, 201);
      const body = JSON.parse(backupRes.payload);
      assert.equal(body.success, true);
      assert.ok(body.backup.filename.startsWith('teleplay_backup_'));
      assert.ok(body.backup.sizeBytes > 0);
      assert.ok(fs.existsSync(body.backup.filePath));

      // 2. List backups
      const listRes = await app.inject({
        method: 'GET',
        url: '/api/admin/backups',
        headers: { 'x-admin-token': ADMIN_SECRET },
      });

      assert.equal(listRes.statusCode, 200);
      const listBody = JSON.parse(listRes.payload);
      assert.ok(Array.isArray(listBody.backups));
      assert.ok(listBody.backups.length >= 1);
      assert.equal(listBody.backups[0].filename, body.backup.filename);
    });
  });

  describe('Report Investigation Status Updates', () => {
    it('updates report status to investigated or dismissed', async () => {
      const { id } = createChannelReport(db, {
        channelName: 'CNN America',
        reason: 'broken',
        details: 'Checking report investigation flow',
      });

      // Update to investigated
      const patchRes = await app.inject({
        method: 'PATCH',
        url: `/api/admin/reports/${id}`,
        headers: { 'x-admin-token': ADMIN_SECRET },
        payload: { status: 'investigated' },
      });

      assert.equal(patchRes.statusCode, 200);

      // Verify update in reports listing
      const listRes = await app.inject({
        method: 'GET',
        url: '/api/admin/reports',
        headers: { 'x-admin-token': ADMIN_SECRET },
      });

      assert.equal(listRes.statusCode, 200);
      const { reports } = JSON.parse(listRes.payload);
      const updatedReport = reports.find((r: { id: number }) => r.id === id);
      assert.equal(updatedReport.status, 'investigated');
    });

    it('rejects invalid status transitions with 400', async () => {
      const patchRes = await app.inject({
        method: 'PATCH',
        url: '/api/admin/reports/1',
        headers: { 'x-admin-token': ADMIN_SECRET },
        payload: { status: 'invalid_status_xyz' },
      });

      assert.equal(patchRes.statusCode, 400);
    });
  });
});
