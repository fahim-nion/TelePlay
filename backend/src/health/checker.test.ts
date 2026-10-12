import test, { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { createDatabase } from '../db/database.js';
import { persistParsedPlaylist } from '../db/repository.js';
import { parseM3U } from '../parser/m3u.js';
import {
  extractFirstVariantUrl,
  probeStreamUrl,
  runHealthCheckBatch,
  expireStaleChecks,
} from './checker.js';

describe('Channel Health Checker Engine', () => {
  describe('extractFirstVariantUrl()', () => {
    it('extracts and resolves relative variant URL against master manifest URL', () => {
      const manifest =
        '#EXTM3U\n' +
        '#EXT-X-STREAM-INF:BANDWIDTH=1280000,RESOLUTION=1280x720\n' +
        'variant_720p.m3u8\n' +
        '#EXT-X-STREAM-INF:BANDWIDTH=800000,RESOLUTION=854x480\n' +
        'variant_480p.m3u8\n';

      const resolved = extractFirstVariantUrl(manifest, 'https://cdn.example.com/live/master.m3u8');
      assert.equal(resolved, 'https://cdn.example.com/live/variant_720p.m3u8');
    });

    it('returns null if manifest contains no #EXT-X-STREAM-INF tags', () => {
      const mediaManifest =
        '#EXTM3U\n' +
        '#EXT-X-TARGETDURATION:6\n' +
        '#EXTINF:6.0,\n' +
        'segment1.ts\n';

      const resolved = extractFirstVariantUrl(mediaManifest, 'https://cdn.example.com/live/index.m3u8');
      assert.equal(resolved, null);
    });
  });

  describe('probeStreamUrl() Safety & Formats', () => {
    it('flags YouTube and Twitch live web pages as unsupported without network call', async () => {
      const ytResult = await probeStreamUrl('https://www.youtube.com/@EuronewsAlbania/live');
      assert.equal(ytResult.status, 'unsupported');
      assert.ok(ytResult.errorSummary?.includes('External web platform'));

      const twitchResult = await probeStreamUrl('https://www.twitch.tv/abcnewsal');
      assert.equal(twitchResult.status, 'unsupported');
    });

    it('aborts and marks unreachable when SSRF targets private IP', async () => {
      const result = await probeStreamUrl('http://192.168.1.100:8080/stream.m3u8');
      assert.equal(result.status, 'unreachable');
      assert.ok(result.errorSummary?.includes('Security validation'));
    });
  });

  describe('runHealthCheckBatch() Checkpoints & Concurrency', () => {
    let db: DatabaseSync;

    beforeEach(() => {
      db = createDatabase(':memory:');
      const testPlaylist =
        '#EXTM3U\n' +
        '#EXTINF:-1 group-title="News",Stream 1\n' +
        'https://www.youtube.com/@stream1/live\n' +
        '#EXTINF:-1 group-title="News",Stream 2\n' +
        'https://www.twitch.tv/stream2\n' +
        '#EXTINF:-1 group-title="News",Stream 3 (Private IP)\n' +
        'http://10.0.0.5/stream3.m3u8\n' +
        '#EXTINF:-1 group-title="News",Stream 4 (Loopback)\n' +
        'http://127.0.0.1:8000/stream4.m3u8\n';

      persistParsedPlaylist(db, 'free-tv', parseM3U(testPlaylist));
    });

    it('executes a bounded batch, persists health records, and advances checkpoint', async () => {
      const batchResult = await runHealthCheckBatch(db, {
        batchSize: 2,
        globalConcurrency: 2,
      });

      assert.equal(batchResult.totalChecked, 2);
      assert.equal(batchResult.unsupportedCount, 2); // Both stream 1 & 2 are youtube/twitch
      assert.equal(batchResult.checkpointId, 2);

      // Verify records saved to health_checks table
      const checksStmt = db.prepare('SELECT status, channel_source_id FROM health_checks');
      const checks = checksStmt.all() as { status: string; channel_source_id: number }[];
      assert.equal(checks.length, 2);
      assert.equal(checks[0].status, 'unsupported');

      // Second batch run picks up exactly from checkpoint (id > 2)
      const secondBatch = await runHealthCheckBatch(db, {
        batchSize: 2,
        globalConcurrency: 2,
      });

      assert.equal(secondBatch.totalChecked, 2);
      assert.equal(secondBatch.unreachableCount, 2); // Streams 3 & 4 are private IPs (unreachable)
      assert.equal(secondBatch.checkpointId, 4);

      const allChecks = checksStmt.all();
      assert.equal(allChecks.length, 4);
    });
  });

  describe('expireStaleChecks()', () => {
    let db: DatabaseSync;

    beforeEach(() => {
      db = createDatabase(':memory:');
      const testPlaylist =
        '#EXTM3U\n' +
        '#EXTINF:-1 group-title="News",Test Channel\n' +
        'https://www.youtube.com/@channel/live\n';

      persistParsedPlaylist(db, 'free-tv', parseM3U(testPlaylist));
    });

    it('transitions old check results outside freshness window to stale', () => {
      // Insert check result backdated to 48 hours ago
      const insertOldCheck = db.prepare(`
        INSERT INTO health_checks (channel_source_id, status, response_time_ms, checked_at)
        VALUES (1, 'working', 150, datetime('now', '-48 hours'))
      `);
      insertOldCheck.run();

      // Expire checks older than 24 hours
      const expiredCount = expireStaleChecks(db, 24);
      assert.equal(expiredCount, 1);

      // Verify the latest check record is now 'stale'
      const latestCheck = db.prepare(`
        SELECT status, error_summary FROM health_checks 
        WHERE channel_source_id = 1 
        ORDER BY checked_at DESC LIMIT 1
      `).get() as { status: string; error_summary: string };

      assert.equal(latestCheck.status, 'stale');
      assert.ok(latestCheck.error_summary.includes('freshness window'));
    });
  });
});

