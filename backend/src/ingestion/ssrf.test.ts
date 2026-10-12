import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isPrivateIpv4, isPrivateIpv6, validateUrlSafety } from './ssrf.js';
import { safeFetch, SafeFetchError } from './safe-fetcher.js';

describe('SSRF Protection & URL Safety', () => {
  describe('isPrivateIpv4()', () => {
    it('identifies loopback addresses as private', () => {
      assert.equal(isPrivateIpv4('127.0.0.1'), true);
      assert.equal(isPrivateIpv4('127.255.255.255'), true);
    });

    it('identifies RFC 1918 private ranges as private', () => {
      assert.equal(isPrivateIpv4('10.0.0.1'), true);
      assert.equal(isPrivateIpv4('10.254.254.254'), true);
      assert.equal(isPrivateIpv4('172.16.0.1'), true);
      assert.equal(isPrivateIpv4('172.31.255.255'), true);
      assert.equal(isPrivateIpv4('192.168.1.1'), true);
      assert.equal(isPrivateIpv4('192.168.100.254'), true);
    });

    it('identifies AWS/Cloud link-local metadata as private', () => {
      assert.equal(isPrivateIpv4('169.254.169.254'), true);
      assert.equal(isPrivateIpv4('169.254.1.1'), true);
    });

    it('allows public IPv4 addresses', () => {
      assert.equal(isPrivateIpv4('8.8.8.8'), false);
      assert.equal(isPrivateIpv4('1.1.1.1'), false);
      assert.equal(isPrivateIpv4('142.250.190.46'), false);
    });
  });

  describe('isPrivateIpv6()', () => {
    it('identifies IPv6 loopback as private', () => {
      assert.equal(isPrivateIpv6('::1'), true);
    });

    it('identifies IPv6 unique local and link-local as private', () => {
      assert.equal(isPrivateIpv6('fc00::1'), true);
      assert.equal(isPrivateIpv6('fd12:3456:789a::1'), true);
      assert.equal(isPrivateIpv6('fe80::1'), true);
    });

    it('allows public IPv6 addresses', () => {
      assert.equal(isPrivateIpv6('2607:f8b0:4004:800::200e'), false);
    });
  });

  describe('validateUrlSafety()', () => {
    it('rejects forbidden protocols like file: and ftp:', async () => {
      const res1 = await validateUrlSafety('file:///etc/passwd');
      assert.equal(res1.safe, false);
      assert.ok(res1.reason?.includes('Forbidden protocol'));

      const res2 = await validateUrlSafety('ftp://example.com/playlist.m3u');
      assert.equal(res2.safe, false);
    });

    it('rejects localhost hostnames', async () => {
      const res = await validateUrlSafety('http://localhost:8080/secret');
      assert.equal(res.safe, false);
      assert.ok(res.reason?.includes('Forbidden local hostname'));
    });

    it('rejects raw private IP URLs', async () => {
      const res = await validateUrlSafety('http://192.168.1.50/admin');
      assert.equal(res.safe, false);
      assert.ok(res.reason?.includes('private/local IPv4'));
    });

    it('rejects cloud metadata endpoint URL', async () => {
      const res = await validateUrlSafety('http://169.254.169.254/latest/meta-data/');
      assert.equal(res.safe, false);
    });
  });

  describe('safeFetch() SSRF Interception', () => {
    it('aborts immediately when an internal IP is passed without making network calls', async () => {
      await assert.rejects(
        async () => {
          await safeFetch('http://127.0.0.1:9099/private-data');
        },
        (err: Error) => {
          assert.ok(err instanceof SafeFetchError);
          assert.equal(err.code, 'SSRF_BLOCKED');
          return true;
        }
      );
    });
  });
});

