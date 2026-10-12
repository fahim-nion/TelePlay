import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { formatRelativeTime, getChannelInitials } from './time.js';

describe('Frontend Time & Avatar Utilities', () => {
  describe('formatRelativeTime()', () => {
    it('returns "Never" for null, undefined, or empty values', () => {
      assert.equal(formatRelativeTime(null), 'Never');
      assert.equal(formatRelativeTime(undefined), 'Never');
      assert.equal(formatRelativeTime(''), 'Never');
    });

    it('returns "Just now" for dates within 60 seconds', () => {
      const justNow = new Date(Date.now() - 10 * 1000).toISOString();
      assert.equal(formatRelativeTime(justNow), 'Just now');
    });

    it('returns minutes ago for dates within an hour', () => {
      const tenMinsAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      assert.equal(formatRelativeTime(tenMinsAgo), '10m ago');
    });

    it('returns hours ago for dates within 24 hours', () => {
      const threeHoursAgo = new Date(Date.now() - 3 * 3600 * 1000).toISOString();
      assert.equal(formatRelativeTime(threeHoursAgo), '3h ago');
    });

    it('returns days ago for dates within 30 days', () => {
      const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString();
      assert.equal(formatRelativeTime(fiveDaysAgo), '5d ago');
    });
  });

  describe('getChannelInitials()', () => {
    it('extracts two letters from multi-word channel names', () => {
      assert.equal(getChannelInitials('Al Jazeera'), 'AJ');
      assert.equal(getChannelInitials('BBC News World'), 'BN');
      assert.equal(getChannelInitials('France 24 English'), 'F2');
    });

    it('extracts first two letters from single-word channel names', () => {
      assert.equal(getChannelInitials('Euronews'), 'EU');
      assert.equal(getChannelInitials('Bloomberg'), 'BL');
    });

    it('falls back to "TV" for empty name', () => {
      assert.equal(getChannelInitials(''), 'TV');
    });
  });
});

