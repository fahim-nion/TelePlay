import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseM3U, parseAttributes, parseExtInfLine } from './m3u.js';

describe('M3U / M3U8 Pure Parser', () => {
  describe('parseAttributes()', () => {
    it('parses standard double-quoted attributes', () => {
      const attrs = parseAttributes('tvg-id="cnn.us" tvg-name="CNN" group-title="News"');
      assert.equal(attrs['tvg-id'], 'cnn.us');
      assert.equal(attrs['tvg-name'], 'CNN');
      assert.equal(attrs['group-title'], 'News');
    });

    it('parses unquoted and single-quoted attributes', () => {
      const attrs = parseAttributes("tvg-country=US tvg-language='English' tvg-logo=\"https://example.com/logo.png\"");
      assert.equal(attrs['tvg-country'], 'US');
      assert.equal(attrs['tvg-language'], 'English');
      assert.equal(attrs['tvg-logo'], 'https://example.com/logo.png');
    });

    it('handles empty string gracefully', () => {
      const attrs = parseAttributes('');
      assert.deepEqual(attrs, {});
    });
  });

  describe('parseExtInfLine()', () => {
    it('handles commas inside quotes in attributes and title', () => {
      const line = '#EXTINF:-1 tvg-name="News, Live" group-title="News, World",World News, 24/7 Edition';
      const parsed = parseExtInfLine(line);
      assert.equal(parsed.duration, -1);
      assert.equal(parsed.attributes['tvg-name'], 'News, Live');
      assert.equal(parsed.attributes['group-title'], 'News, World');
      assert.equal(parsed.name, 'World News, 24/7 Edition');
    });

    it('handles Unicode and emojis in channel titles', () => {
      const line = '#EXTINF:0 tvg-id="NHK.jp" tvg-country="JP",NHK 総合 📺 東京';
      const parsed = parseExtInfLine(line);
      assert.equal(parsed.duration, 0);
      assert.equal(parsed.name, 'NHK 総合 📺 東京');
      assert.equal(parsed.attributes['tvg-id'], 'NHK.jp');
    });
  });

  describe('parseM3U() full playlist parsing', () => {
    it('parses a valid M3U8 playlist with CRLF line endings', () => {
      const content =
        '#EXTM3U x-tvg-url="https://epg.example.com/guide.xml"\r\n' +
        '#EXTINF:-1 tvg-id="bbc1.uk" tvg-name="BBC One" tvg-logo="https://img.com/bbc.png" group-title="Entertainment",BBC One HD\r\n' +
        'https://stream.example.com/bbc1.m3u8\r\n' +
        '#EXTINF:-1 tvg-id="aljazeera.qa" tvg-logo="https://img.com/aj.png" group-title="News",الجزيرة الإخبارية\r\n' +
        'https://stream.example.com/aj.m3u8\r\n';

      const result = parseM3U(content);
      assert.equal(result.warnings.length, 0);
      assert.equal(result.entries.length, 2);
      assert.equal(result.header?.tvgUrl, 'https://epg.example.com/guide.xml');

      const entry1 = result.entries[0];
      assert.equal(entry1.name, 'BBC One HD');
      assert.equal(entry1.url, 'https://stream.example.com/bbc1.m3u8');
      assert.equal(entry1.tvgId, 'bbc1.uk');
      assert.equal(entry1.tvgLogo, 'https://img.com/bbc.png');
      assert.equal(entry1.groupTitle, 'Entertainment');

      const entry2 = result.entries[1];
      assert.equal(entry2.name, 'الجزيرة الإخبارية');
      assert.equal(entry2.url, 'https://stream.example.com/aj.m3u8');
      assert.equal(entry2.groupTitle, 'News');
    });

    it('captures intermediary tags like #EXTGRP when group-title is absent', () => {
      const content =
        '#EXTM3U\n' +
        '#EXTINF:-1 tvg-id="france24.fr",France 24 English\n' +
        '#EXTGRP:International News\n' +
        '#EXTVLCOPT:http-user-agent=CustomUA\n' +
        'https://stream.example.com/f24.m3u8\n';

      const result = parseM3U(content);
      assert.equal(result.entries.length, 1);
      assert.equal(result.entries[0].groupTitle, 'International News');
      assert.equal(result.entries[0].extraTags.length, 2);
    });

    it('recovers from missing URLs, empty lines, and malformed entries gracefully', () => {
      const content =
        '#EXTM3U\n' +
        '\n' +
        '# Some comment line\n' +
        '#EXTINF:-1 tvg-id="orphan.channel",Orphan Channel Without URL\n' +
        '#EXTINF:-1 tvg-id="valid.channel",Valid Channel\n' +
        'https://stream.example.com/valid.m3u8\n' +
        'https://stream.example.com/orphan-url.m3u8\n' +
        '#EXTINF:-1,Trailing Channel With No URL';

      const result = parseM3U(content);
      assert.equal(result.entries.length, 2); // Valid Channel + Orphan URL fallback
      assert.equal(result.warnings.length, 3);

      // Warning 1: Orphan #EXTINF followed by another #EXTINF
      assert.ok(result.warnings[0].message.includes('missing a stream URL'));
      // Warning 2: Orphan stream URL without #EXTINF
      assert.ok(result.warnings[1].message.includes('without preceding #EXTINF'));
      // Warning 3: Trailing #EXTINF at end of file
      assert.ok(result.warnings[2].message.includes('Trailing #EXTINF'));
    });

    it('handles empty input without crashing', () => {
      const result = parseM3U('');
      assert.equal(result.entries.length, 0);
      assert.equal(result.warnings.length, 1);
    });
  });
});

