import test, { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { createDatabase } from './database.js';
import {
  normalizeCanonicalName,
  persistParsedPlaylist,
  listChannels,
  getChannelById,
  listCategories,
  listCountries,
} from './repository.js';
import { parseM3U } from '../parser/m3u.js';

describe('Database & Channel Normalization Layer', () => {
  let db: DatabaseSync;

  beforeEach(() => {
    db = createDatabase(':memory:');
  });

  describe('Database Initialization & Schema', () => {
    it('creates all tables and seeds approved sources', () => {
      const sourcesStmt = db.prepare('SELECT id, name, enabled FROM sources');
      const sources = sourcesStmt.all() as { id: string; name: string; enabled: number }[];

      assert.ok(sources.length >= 2);
      const freeTv = sources.find((s) => s.id === 'free-tv');
      assert.ok(freeTv);
      assert.equal(freeTv?.enabled, 1);

      const iptvOrg = sources.find((s) => s.id === 'iptv-org-news');
      assert.ok(iptvOrg);
    });
  });

  describe('normalizeCanonicalName()', () => {
    it('removes resolution tags, brackets, platform symbols, and trims whitespace', () => {
      assert.equal(normalizeCanonicalName('BBC One (1080p) [Geo-blocked] Ⓢ'), 'bbc one');
      assert.equal(normalizeCanonicalName('CNN International (720p) Ⓨ'), 'cnn international');
      assert.equal(normalizeCanonicalName('  Al Jazeera News  '), 'al jazeera news');
    });

    it('preserves Unicode and multilingual channel titles', () => {
      assert.equal(normalizeCanonicalName('NHK 総合 (1080p)'), 'nhk 総合');
      assert.equal(normalizeCanonicalName('الجزيرة (1080p)'), 'الجزيرة');
    });
  });

  describe('Idempotent Ingestion & Multi-Stream Association', () => {
    const samplePlaylist =
      '#EXTM3U\n' +
      '#EXTINF:-1 tvg-id="cnn.us" tvg-country="US" group-title="News",CNN Live (1080p)\n' +
      'https://stream.example.com/cnn-primary.m3u8\n' +
      '#EXTINF:-1 tvg-id="bbc.uk" tvg-country="GB" group-title="News",BBC News\n' +
      'https://stream.example.com/bbc-main.m3u8\n';

    it('persists channels and streams on initial import', () => {
      const parsed = parseM3U(samplePlaylist);
      const result = persistParsedPlaylist(db, 'free-tv', parsed);

      assert.equal(result.channelsCreated, 2);
      assert.equal(result.insertedStreams, 2);
      assert.equal(result.updatedStreams, 0);

      const list = listChannels(db);
      assert.equal(list.total, 2);
      assert.equal(list.channels.length, 2);
    });

    it('is completely idempotent when re-importing the identical playlist', () => {
      const parsed = parseM3U(samplePlaylist);

      // First import
      persistParsedPlaylist(db, 'free-tv', parsed);

      // Second import of identical data
      const secondResult = persistParsedPlaylist(db, 'free-tv', parsed);
      assert.equal(secondResult.channelsCreated, 0, 'No duplicate channels should be created');
      assert.equal(secondResult.insertedStreams, 0, 'No duplicate streams should be created');
      assert.equal(secondResult.updatedStreams, 2, 'Existing streams should be updated with new last_seen_at');

      const list = listChannels(db);
      assert.equal(list.total, 2, 'Total unique channel count must remain unchanged');
    });

    it('attaches alternative stream URLs to the existing channel', () => {
      const parsedInitial = parseM3U(samplePlaylist);
      persistParsedPlaylist(db, 'free-tv', parsedInitial);

      // An alternative stream for CNN (different URL, same channel identity)
      const alternativePlaylist =
        '#EXTM3U\n' +
        '#EXTINF:-1 tvg-id="cnn.us" tvg-country="US" group-title="News",CNN Live (Backup Stream)\n' +
        'https://stream.example.com/cnn-backup.m3u8\n';

      const parsedAlt = parseM3U(alternativePlaylist);
      const altResult = persistParsedPlaylist(db, 'free-tv', parsedAlt);

      assert.equal(altResult.channelsCreated, 0, 'Should not create a duplicate CNN channel entity');
      assert.equal(altResult.insertedStreams, 1, 'Should insert the new backup stream URL');

      // Check CNN channel details
      const list = listChannels(db, { search: 'CNN' });
      assert.equal(list.total, 1);
      const cnnChannelId = list.channels[0].id;

      const detail = getChannelById(db, cnnChannelId);
      assert.ok(detail);
      assert.equal(detail?.streams.length, 2, 'CNN must now have both primary and backup streams linked');
      assert.ok(detail?.streams.some((s) => s.stream_url === 'https://stream.example.com/cnn-primary.m3u8'));
      assert.ok(detail?.streams.some((s) => s.stream_url === 'https://stream.example.com/cnn-backup.m3u8'));
    });
  });

  describe('Querying, Filtering & Aggregations', () => {
    beforeEach(() => {
      const testData =
        '#EXTM3U\n' +
        '#EXTINF:-1 tvg-country="US" group-title="News",CNN USA\n' +
        'https://stream.example.com/cnn.m3u8\n' +
        '#EXTINF:-1 tvg-country="US" group-title="Sports",ESPN USA\n' +
        'https://stream.example.com/espn.m3u8\n' +
        '#EXTINF:-1 tvg-country="GB" group-title="News",Sky News UK\n' +
        'https://stream.example.com/sky.m3u8\n' +
        '#EXTINF:-1 tvg-country="FR" group-title="Movies",Cinema France\n' +
        'https://stream.example.com/cinema.m3u8\n';

      persistParsedPlaylist(db, 'free-tv', parseM3U(testData));
    });

    it('filters by category', () => {
      const newsOnly = listChannels(db, { category: 'News' });
      assert.equal(newsOnly.total, 2);
      assert.ok(newsOnly.channels.every((c) => c.category === 'News'));

      const sportsOnly = listChannels(db, { category: 'Sports' });
      assert.equal(sportsOnly.total, 1);
      assert.equal(sportsOnly.channels[0].display_name, 'ESPN USA');
    });

    it('filters by country code', () => {
      const usOnly = listChannels(db, { country: 'US' });
      assert.equal(usOnly.total, 2);

      const gbOnly = listChannels(db, { country: 'GB' });
      assert.equal(gbOnly.total, 1);
      assert.equal(gbOnly.channels[0].display_name, 'Sky News UK');
    });

    it('searches channels by query string', () => {
      const searchRes = listChannels(db, { search: 'cinema' });
      assert.equal(searchRes.total, 1);
      assert.equal(searchRes.channels[0].display_name, 'Cinema France');
    });

    it('paginates channels using limit and offset', () => {
      const page1 = listChannels(db, { limit: 2, offset: 0 });
      assert.equal(page1.channels.length, 2);
      assert.equal(page1.total, 4);

      const page2 = listChannels(db, { limit: 2, offset: 2 });
      assert.equal(page2.channels.length, 2);
      assert.equal(page2.total, 4);
      assert.notEqual(page1.channels[0].id, page2.channels[0].id);
    });

    it('aggregates category counts with listCategories()', () => {
      const categories = listCategories(db);
      assert.ok(categories.length >= 3);
      const newsCat = categories.find((c) => c.category === 'News');
      assert.equal(newsCat?.count, 2);
    });

    it('aggregates country counts with listCountries()', () => {
      const countries = listCountries(db);
      assert.ok(countries.length >= 3);
      const us = countries.find((c) => c.country === 'US');
      assert.equal(us?.count, 2);
    });
  });
});

