import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Mock localStorage in Node environment if not present
if (!globalThis.localStorage) {
  const store = new Map<string, string>();
  globalThis.localStorage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, val: string) => store.set(key, String(val)),
    removeItem: (key: string) => store.delete(key),
    clear: () => store.clear(),
    key: (i: number) => Array.from(store.keys())[i] ?? null,
    length: 0,
  } as Storage;
}

import {
  getFavorites,
  toggleFavorite,
  removeFavorite,
  isFavorite,
  getRecentlyWatched,
  addRecentlyWatched,
  getViewMode,
  setViewMode,
} from './storage.js';
import { Channel } from '../types.js';

describe('Frontend LocalStorage Services', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  const sampleChannel: Channel = {
    id: 42,
    canonical_name: 'test news',
    display_name: 'Test News HD',
    category: 'News',
    country: 'US',
    language: 'English',
    logo_url: 'https://example.com/logo.png',
    tvg_id: 'test.us',
    stream_count: 2,
    health_status: 'working',
    last_checked_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  it('initially returns empty favorites', () => {
    assert.deepEqual(getFavorites(), []);
    assert.equal(isFavorite(42), false);
  });

  it('toggles favorite channel on and off', () => {
    const isNowFav = toggleFavorite(sampleChannel);
    assert.equal(isNowFav, true);
    assert.equal(isFavorite(42), true);

    const favs = getFavorites();
    assert.equal(favs.length, 1);
    assert.equal(favs[0].id, 42);
    assert.equal(favs[0].name, 'Test News HD');

    // Toggle off
    const toggledOff = toggleFavorite(sampleChannel);
    assert.equal(toggledOff, false);
    assert.equal(isFavorite(42), false);
    assert.equal(getFavorites().length, 0);
  });

  it('removes favorite by channel ID', () => {
    toggleFavorite(sampleChannel);
    assert.equal(isFavorite(42), true);

    removeFavorite(42);
    assert.equal(isFavorite(42), false);
    assert.equal(getFavorites().length, 0);
  });

  it('manages recently watched channels with max capacity', () => {
    assert.deepEqual(getRecentlyWatched(), []);

    addRecentlyWatched(sampleChannel);
    const recent = getRecentlyWatched();
    assert.equal(recent.length, 1);
    assert.equal(recent[0].id, 42);

    // Adding same channel unshifts it to top without duplicates
    addRecentlyWatched(sampleChannel);
    assert.equal(getRecentlyWatched().length, 1);

    // Add 25 channels and check truncation at 20
    for (let i = 1; i <= 25; i++) {
      addRecentlyWatched({ ...sampleChannel, id: 100 + i, display_name: `Channel ${i}` });
    }
    assert.equal(getRecentlyWatched().length, 20);
  });

  it('manages view mode preferences', () => {
    assert.equal(getViewMode(), 'grid'); // default

    setViewMode('list');
    assert.equal(getViewMode(), 'list');

    setViewMode('grid');
    assert.equal(getViewMode(), 'grid');
  });
});

