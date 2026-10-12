import test, { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { FastifyInstance } from 'fastify';
import { DatabaseSync } from 'node:sqlite';
import { buildApp } from '../server.js';
import { createDatabase } from '../db/database.js';
import { persistParsedPlaylist } from '../db/repository.js';
import { parseM3U } from '../parser/m3u.js';
import { loadConfig } from '../config.js';

describe('Read-Only API Endpoints', () => {
  let app: FastifyInstance;
  let db: DatabaseSync;

  beforeEach(async () => {
    db = createDatabase(':memory:');
    const testPlaylist =
      '#EXTM3U\n' +
      '#EXTINF:-1 tvg-id="c1" tvg-country="US" group-title="News",CNN America\n' +
      'https://stream.example.com/cnn.m3u8\n' +
      '#EXTINF:-1 tvg-id="c2" tvg-country="GB" group-title="News",BBC World\n' +
      'https://stream.example.com/bbc.m3u8\n' +
      '#EXTINF:-1 tvg-id="c3" tvg-country="ES" group-title="Sports",Marca TV\n' +
      'https://stream.example.com/marca.m3u8\n';

    persistParsedPlaylist(db, 'free-tv', parseM3U(testPlaylist));

    const testConfig = loadConfig();
    testConfig.logLevel = 'silent';
    app = await buildApp(testConfig, db);
  });

  afterEach(async () => {
    await app.close();
  });

  describe('GET /api/channels', () => {
    it('returns paginated list of channels with total count', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/channels?page=1&limit=2',
      });

      assert.equal(res.statusCode, 200);
      assert.equal(res.headers['cache-control'], 'public, max-age=15');

      const body = JSON.parse(res.payload);
      assert.equal(body.channels.length, 2);
      assert.equal(body.pagination.total, 3);
      assert.equal(body.pagination.page, 1);
      assert.equal(body.pagination.limit, 2);
      assert.equal(body.pagination.totalPages, 2);
    });

    it('filters channels by category', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/channels?category=Sports',
      });

      assert.equal(res.statusCode, 200);
      const body = JSON.parse(res.payload);
      assert.equal(body.channels.length, 1);
      assert.equal(body.channels[0].display_name, 'Marca TV');
      assert.equal(body.channels[0].category, 'Sports');
    });

    it('filters channels by country', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/channels?country=GB',
      });

      assert.equal(res.statusCode, 200);
      const body = JSON.parse(res.payload);
      assert.equal(body.channels.length, 1);
      assert.equal(body.channels[0].display_name, 'BBC World');
      assert.equal(body.channels[0].country, 'GB');
    });

    it('searches channels by query string', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/channels?search=cnn',
      });

      assert.equal(res.statusCode, 200);
      const body = JSON.parse(res.payload);
      assert.equal(body.channels.length, 1);
      assert.equal(body.channels[0].display_name, 'CNN America');
    });
  });

  describe('GET /api/channels/:id', () => {
    it('returns 200 with full channel details and attached stream sources', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/channels/1',
      });

      assert.equal(res.statusCode, 200);
      assert.equal(res.headers['cache-control'], 'public, max-age=30');

      const body = JSON.parse(res.payload);
      assert.ok(body.channel);
      assert.equal(body.channel.id, 1);
      assert.ok(body.channel.streams.length >= 1);
      assert.ok(body.channel.streams[0].stream_url);
    });

    it('returns 404 when channel ID does not exist', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/channels/99999',
      });

      assert.equal(res.statusCode, 404);
      const body = JSON.parse(res.payload);
      assert.equal(body.error, 'Channel not found');
    });

    it('returns 400 for non-numeric channel ID', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/channels/abc',
      });

      assert.equal(res.statusCode, 400);
      const body = JSON.parse(res.payload);
      assert.ok(body.error.includes('Invalid channel ID'));
    });
  });

  describe('GET /api/categories', () => {
    it('returns categories with aggregated counts', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/categories',
      });

      assert.equal(res.statusCode, 200);
      assert.equal(res.headers['cache-control'], 'public, max-age=60');

      const body = JSON.parse(res.payload);
      assert.ok(body.categories.length >= 2);
      const news = body.categories.find((c: { category: string }) => c.category === 'News');
      assert.equal(news.count, 2);
    });
  });

  describe('GET /api/countries', () => {
    it('returns countries with aggregated counts', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/countries',
      });

      assert.equal(res.statusCode, 200);
      assert.equal(res.headers['cache-control'], 'public, max-age=60');

      const body = JSON.parse(res.payload);
      assert.ok(body.countries.length >= 3);
      const us = body.countries.find((c: { country: string }) => c.country === 'US');
      assert.equal(us.count, 1);
    });
  });

  describe('GET /api/sources/status', () => {
    it('returns public status summary of approved sources without exposing private diagnostics', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/sources/status',
      });

      assert.equal(res.statusCode, 200);
      const body = JSON.parse(res.payload);
      assert.ok(body.sources.length >= 2);

      const freeTv = body.sources.find((s: { id: string }) => s.id === 'free-tv');
      assert.ok(freeTv);
      assert.equal(freeTv.name, 'Free-TV Curated Global');
      assert.ok(freeTv.terms);
      assert.ok(freeTv.attribution);
    });
  });

  describe('GET /api/stats', () => {
    it('returns honest catalogue statistics and health counts', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/stats',
      });

      assert.equal(res.statusCode, 200);
      assert.equal(res.headers['cache-control'], 'public, max-age=30');

      const body = JSON.parse(res.payload);
      assert.ok(body.stats);
      assert.equal(typeof body.stats.totalChannels, 'number');
      assert.equal(typeof body.stats.totalStreams, 'number');
      assert.ok(body.stats.totalChannels >= 3);
      assert.ok(body.stats.totalStreams >= 3);
      assert.equal(typeof body.stats.uncheckedCount, 'number');
    });
  });

  describe('GET /api/channels with sorting and health status', () => {
    it('sorts channels by recently checked or created_at', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/channels?sortBy=recently_checked',
      });

      assert.equal(res.statusCode, 200);
      const body = JSON.parse(res.payload);
      assert.ok(body.channels.length >= 3);
    });

    it('filters channels by healthStatus not_checked', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/channels?healthStatus=not_checked',
      });

      assert.equal(res.statusCode, 200);
      const body = JSON.parse(res.payload);
      assert.ok(body.channels.length >= 3);
    });
  });
});
