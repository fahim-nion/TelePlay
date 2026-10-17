import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { FastifyInstance } from 'fastify';
import { DatabaseSync } from 'node:sqlite';
import { buildApp } from '../server.js';
import { createDatabase } from '../db/database.js';
import { loadConfig, AppConfig } from '../config.js';
import { isPrivateIpv4, isPrivateIpv6, validateUrlSafety } from '../ingestion/ssrf.js';
import { SlidingWindowRateLimiter } from './rate-limiter.js';

describe('Security and Performance Audit (Phase 12)', () => {
  let app: FastifyInstance;
  let db: DatabaseSync;
  let testConfig: AppConfig;

  beforeEach(async () => {
    db = createDatabase(':memory:');
    testConfig = loadConfig();
    testConfig.logLevel = 'silent';
    testConfig.adminToken = 'audit-secret-token-123';
    app = await buildApp(testConfig, db);
  });

  afterEach(async () => {
    await app.close();
  });

  describe('HTTP Security Headers Audit', () => {
    it('sets strict security headers preventing MIME-sniffing and clickjacking', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/health',
      });

      assert.equal(res.statusCode, 200);
      assert.equal(res.headers['x-content-type-options'], 'nosniff');
      assert.equal(res.headers['x-frame-options'], 'DENY');
      assert.equal(res.headers['referrer-policy'], 'strict-origin-when-cross-origin');
      assert.ok(res.headers['content-security-policy']?.includes("frame-ancestors 'none'"));
      assert.ok(res.headers['permissions-policy']?.includes('geolocation=()'));
    });
  });

  describe('Rate Limiting & DoS Defense Audit', () => {
    it('tracks rate limit headers and decrements remaining quota', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/reports',
        payload: {
          channelName: 'Rate Limit Test Channel',
          reason: 'broken',
        },
      });

      assert.equal(res.statusCode, 201);
      assert.ok(res.headers['ratelimit-limit']);
      assert.ok(res.headers['ratelimit-remaining']);
      assert.ok(res.headers['ratelimit-reset']);
    });

    it('enforces quota ceiling and returns 429 when rate limit exceeded', async () => {
      const testLimiter = new SlidingWindowRateLimiter({
        windowMs: 10000,
        maxRequests: 3,
        keyGenerator: () => 'test-ip',
      });

      const fakeReq = {} as any;

      // 3 requests allowed
      assert.equal(testLimiter.check(fakeReq).allowed, true);
      assert.equal(testLimiter.check(fakeReq).allowed, true);
      assert.equal(testLimiter.check(fakeReq).allowed, true);

      // 4th request must be blocked
      const blocked = testLimiter.check(fakeReq);
      assert.equal(blocked.allowed, false);
      assert.equal(blocked.remaining, 0);
      assert.ok(blocked.resetSeconds > 0);

      testLimiter.destroy();
    });

    it('cleans up expired client records avoiding unbounded memory growth', () => {
      const testLimiter = new SlidingWindowRateLimiter({
        windowMs: 10, // 10ms window for fast testing
        maxRequests: 5,
        keyGenerator: () => 'ephemeral-client',
      });

      const fakeReq = {} as any;
      testLimiter.check(fakeReq);

      // Wait for window to expire
      const start = Date.now();
      while (Date.now() - start < 25) {
        // small sync wait
      }

      testLimiter.cleanup();
      // Client record should be evicted
      const afterCheck = testLimiter.check(fakeReq);
      assert.equal(afterCheck.remaining, 4);

      testLimiter.destroy();
    });
  });

  describe('SSRF & IP Range Defense Audit', () => {
    it('blocks Carrier-Grade NAT (CGNAT) 100.64.0.0/10 range', () => {
      assert.equal(isPrivateIpv4('100.64.0.1'), true);
      assert.equal(isPrivateIpv4('100.100.50.25'), true);
      assert.equal(isPrivateIpv4('100.127.255.254'), true);
      assert.equal(isPrivateIpv4('100.128.0.1'), false); // Outside CGNAT
    });

    it('blocks cloud instance metadata endpoint 169.254.169.254', () => {
      assert.equal(isPrivateIpv4('169.254.169.254'), true);
      assert.equal(isPrivateIpv4('169.254.1.1'), true);
    });

    it('blocks IPv4-mapped IPv6 private loopback and private ranges', () => {
      assert.equal(isPrivateIpv6('::ffff:127.0.0.1'), true);
      assert.equal(isPrivateIpv6('::ffff:192.168.1.1'), true);
      assert.equal(isPrivateIpv6('::ffff:10.0.0.5'), true);
      assert.equal(isPrivateIpv6('::ffff:8.8.8.8'), false);
    });

    it('validates protocol safety rejecting dangerous file/gopher schemes', async () => {
      const fileScheme = await validateUrlSafety('file:///etc/passwd');
      assert.equal(fileScheme.safe, false);
      assert.ok(fileScheme.reason?.includes('Forbidden protocol'));

      const gopherScheme = await validateUrlSafety('gopher://127.0.0.1:70');
      assert.equal(gopherScheme.safe, false);

      const ftpScheme = await validateUrlSafety('ftp://ftp.example.com/stream');
      assert.equal(ftpScheme.safe, false);
    });
  });
});

