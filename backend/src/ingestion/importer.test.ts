import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getApprovedSources, getSourceById, isApprovedSource } from './sources.js';
import { ingestSource } from './importer.js';

describe('Approved Source Registry & Ingestion Engine', () => {
  describe('Source Registry', () => {
    it('contains approved sources Free-TV and iptv-org-news', () => {
      const sources = getApprovedSources();
      assert.ok(sources.length >= 2);

      const freeTv = getSourceById('free-tv');
      assert.ok(freeTv);
      assert.equal(freeTv?.enabled, true);
      assert.ok(freeTv?.url.includes('Free-TV/IPTV'));

      const iptvOrgNews = getSourceById('iptv-org-news');
      assert.ok(iptvOrgNews);
      assert.equal(iptvOrgNews?.enabled, true);
      assert.ok(iptvOrgNews?.url.includes('iptv-org.github.io'));
    });

    it('rejects unapproved or unknown source IDs', () => {
      assert.equal(isApprovedSource('unknown-random-source'), false);
      assert.equal(isApprovedSource('fmhy-pirate-list'), false);
    });
  });

  describe('ingestSource() dry-run pipeline', () => {
    it('throws error when attempting to ingest unapproved source', async () => {
      await assert.rejects(
        async () => {
          await ingestSource('unapproved-source-id');
        },
        /Not found in approved source registry/
      );
    });

    it('processes playlist content, detects duplicates and categories without network dependency', async () => {
      const sampleM3U =
        '#EXTM3U\n' +
        '#EXTINF:-1 tvg-id="c1" tvg-country="US" group-title="News",Channel One\n' +
        'https://stream.example.com/live1.m3u8\n' +
        '#EXTINF:-1 tvg-id="c2" tvg-country="US" group-title="Sports",Channel Two\n' +
        'https://stream.example.com/live2.m3u8\n' +
        '#EXTINF:-1 tvg-id="c3" tvg-country="GB" group-title="News",Channel Three (Duplicate URL)\n' +
        'https://stream.example.com/live1.m3u8\n';

      const summary = await ingestSource('free-tv', {
        dryRun: true,
        injectedContent: sampleM3U,
      });

      assert.equal(summary.sourceId, 'free-tv');
      assert.equal(summary.dryRun, true);
      assert.equal(summary.totalParsed, 3);
      assert.equal(summary.uniqueUrls, 2);
      assert.equal(summary.duplicateUrls, 1);
      assert.equal(summary.categories['News'], 2);
      assert.equal(summary.categories['Sports'], 1);
      assert.equal(summary.countries['US'], 2);
      assert.equal(summary.countries['GB'], 1);
      assert.equal(summary.sampleEntries.length, 3);
      assert.equal(summary.warningsCount, 0);
    });
  });
});

