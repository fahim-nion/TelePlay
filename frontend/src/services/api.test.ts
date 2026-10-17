import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getPlaylistExportUrl } from './api.js';

describe('Playlist Export URL Builder', () => {
  it('generates base catalogue export path with no query options', () => {
    const url = getPlaylistExportUrl({});
    assert.equal(url, '/api/playlists/export.m3u');
  });

  it('generates category-filtered export path', () => {
    const url = getPlaylistExportUrl({ category: 'News' });
    assert.equal(url, '/api/playlists/export.m3u?category=News');
  });

  it('generates country and health status filtered export path', () => {
    const url = getPlaylistExportUrl({ country: 'US', healthStatus: 'working' });
    assert.equal(url, '/api/playlists/export.m3u?country=US&healthStatus=working');
  });

  it('generates custom channel IDs selection export path', () => {
    const url = getPlaylistExportUrl({ channelIds: [1, 5, 42] });
    assert.equal(url, '/api/playlists/export.m3u?channelIds=1%2C5%2C42');
  });

  it('includes multi-stream query flag when requested', () => {
    const url = getPlaylistExportUrl({ category: 'Sports', includeAllStreams: true });
    assert.equal(url, '/api/playlists/export.m3u?category=Sports&includeAllStreams=true');
  });
});

