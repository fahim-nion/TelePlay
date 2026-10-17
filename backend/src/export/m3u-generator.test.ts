import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { generateM3U } from './m3u-generator.js';
import { parseM3U } from '../parser/m3u.js';
import { ExportChannelItem } from './types.js';

describe('M3U Playlist Generator Engine', () => {
  const sampleChannels: ExportChannelItem[] = [
    {
      id: 1,
      displayName: 'Al Jazeera English HD',
      category: 'News',
      country: 'QA',
      language: 'English',
      logoUrl: 'https://example.com/aljazeera.png',
      tvgId: 'aljazeera.en',
      streams: [
        {
          streamUrl: 'https://live.aljazeera.com/en/live.m3u8',
          healthStatus: 'working',
        },
      ],
    },
    {
      id: 2,
      displayName: 'NHK World-Japan',
      category: 'General',
      country: 'JP',
      language: 'Japanese',
      logoUrl: 'https://example.com/nhk.png',
      tvgId: 'nhk.jp',
      streams: [
        {
          streamUrl: 'https://nhk.example.com/stream1.m3u8',
          healthStatus: 'working',
        },
        {
          streamUrl: 'https://nhk.example.com/stream2.m3u8',
          healthStatus: 'intermittent',
        },
      ],
    },
  ];

  it('generates a valid #EXTM3U playlist with all TVG attributes', () => {
    const m3u = generateM3U(sampleChannels);

    assert.ok(m3u.startsWith('#EXTM3U\n'));
    assert.ok(m3u.includes('#EXTINF:-1 tvg-id="aljazeera.en" tvg-name="Al Jazeera English HD" tvg-logo="https://example.com/aljazeera.png" group-title="News" tvg-country="QA" tvg-language="English",Al Jazeera English HD'));
    assert.ok(m3u.includes('https://live.aljazeera.com/en/live.m3u8'));
  });

  it('exports multiple stream sources when includeAllStreams is enabled', () => {
    const m3u = generateM3U(sampleChannels, { includeAllStreams: true });

    assert.ok(m3u.includes('https://nhk.example.com/stream1.m3u8'));
    assert.ok(m3u.includes('https://nhk.example.com/stream2.m3u8'));
    assert.ok(m3u.includes('NHK World-Japan (Stream 1)'));
    assert.ok(m3u.includes('NHK World-Japan (Stream 2)'));
  });

  it('sanitizes quotes and removes newlines to prevent M3U injection', () => {
    const maliciousChannel: ExportChannelItem = {
      id: 3,
      displayName: 'Channel "With" Quotes\nIn Title',
      category: 'Movies\r\n#EXTINF:0,Fake Channel',
      tvgId: 'id"with"quotes',
      streams: [
        { streamUrl: 'https://stream.example.com/safe.m3u8' },
      ],
    };

    const m3u = generateM3U([maliciousChannel]);
    // Quotes inside attributes replaced with single quotes
    assert.ok(m3u.includes("tvg-name=\"Channel 'With' Quotes In Title\""));
    assert.ok(m3u.includes("group-title=\"Movies #EXTINF:0,Fake Channel\""));
    // Title has no newlines
    assert.ok(m3u.includes(',Channel "With" Quotes In Title'));
  });

  it('skips channels that have no streams', () => {
    const emptyChannel: ExportChannelItem = {
      id: 4,
      displayName: 'Channel Without Streams',
      category: 'Empty',
      streams: [],
    };

    const m3u = generateM3U([emptyChannel]);
    assert.equal(m3u.trim(), '#EXTM3U');
  });

  it('passes round-trip validation through the TelePlay M3U parser', () => {
    const m3u = generateM3U(sampleChannels, { includeAllStreams: true });
    const parsed = parseM3U(m3u);

    assert.equal(parsed.entries.length, 3);
    assert.equal(parsed.entries[0].name, 'Al Jazeera English HD');
    assert.equal(parsed.entries[0].tvgId, 'aljazeera.en');
    assert.equal(parsed.entries[0].groupTitle, 'News');
    assert.equal(parsed.entries[0].url, 'https://live.aljazeera.com/en/live.m3u8');
    assert.equal(parsed.entries[1].url, 'https://nhk.example.com/stream1.m3u8');
    assert.equal(parsed.entries[2].url, 'https://nhk.example.com/stream2.m3u8');
  });
});

