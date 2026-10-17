import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseUrlState, buildUrlQuery } from './url-state.js';
import { ChannelFilters } from '../types.js';

describe('Shareable URL State Parser & Serializer', () => {
  it('parses empty query string to default discover tab and empty filters', () => {
    const state = parseUrlState('');
    assert.equal(state.tab, 'discover');
    assert.equal(state.filters.category, '');
    assert.equal(state.filters.country, '');
    assert.equal(state.filters.healthStatus, '');
    assert.equal(state.filters.sourceId, '');
    assert.equal(state.filters.sortBy, 'name');
    assert.equal(state.filters.page, 1);
  });

  it('parses valid filtered query string into structured state', () => {
    const search = '?tab=channels&category=News&country=US&healthStatus=working&sourceId=free-tv&sortBy=recently_checked&page=3&search=bbc';
    const state = parseUrlState(search);

    assert.equal(state.tab, 'channels');
    assert.equal(state.filters.category, 'News');
    assert.equal(state.filters.country, 'US');
    assert.equal(state.filters.healthStatus, 'working');
    assert.equal(state.filters.sourceId, 'free-tv');
    assert.equal(state.filters.sortBy, 'recently_checked');
    assert.equal(state.filters.page, 3);
    assert.equal(state.filters.search, 'bbc');
  });

  it('falls back to discover tab when unknown tab is specified', () => {
    const state = parseUrlState('?tab=unknown_admin_view');
    assert.equal(state.tab, 'discover');
  });

  it('clamps invalid or negative page numbers to 1', () => {
    const state = parseUrlState('?page=-5');
    assert.equal(state.filters.page, 1);

    const stateNan = parseUrlState('?page=abc');
    assert.equal(stateNan.filters.page, 1);
  });

  it('builds clean query string omitting defaults', () => {
    const qs = buildUrlQuery('discover', {
      search: '',
      category: '',
      country: '',
      healthStatus: '',
      sourceId: '',
      sortBy: 'name',
      page: 1,
    });
    assert.equal(qs, '');
  });

  it('builds query string containing non-default tab and filters', () => {
    const filters: ChannelFilters = {
      search: 'al jazeera',
      category: 'News',
      country: 'QA',
      healthStatus: 'working',
      sourceId: 'iptv-org-news',
      sortBy: 'recently_checked',
      page: 2,
    };
    const qs = buildUrlQuery('channels', filters);

    assert.ok(qs.includes('tab=channels'));
    assert.ok(qs.includes('search=al+jazeera') || qs.includes('search=al%20jazeera'));
    assert.ok(qs.includes('category=News'));
    assert.ok(qs.includes('country=QA'));
    assert.ok(qs.includes('healthStatus=working'));
    assert.ok(qs.includes('sourceId=iptv-org-news'));
    assert.ok(qs.includes('sortBy=recently_checked'));
    assert.ok(qs.includes('page=2'));
  });

  it('guarantees round-trip serialization and parsing fidelity', () => {
    const originalFilters: ChannelFilters = {
      search: 'cnn',
      category: 'News',
      country: 'US',
      healthStatus: 'intermittent',
      sourceId: 'free-tv',
      sortBy: 'recently_checked',
      page: 4,
    };

    const qs = buildUrlQuery('channels', originalFilters);
    const parsed = parseUrlState(qs);

    assert.equal(parsed.tab, 'channels');
    assert.equal(parsed.filters.search, originalFilters.search);
    assert.equal(parsed.filters.category, originalFilters.category);
    assert.equal(parsed.filters.country, originalFilters.country);
    assert.equal(parsed.filters.healthStatus, originalFilters.healthStatus);
    assert.equal(parsed.filters.sourceId, originalFilters.sourceId);
    assert.equal(parsed.filters.sortBy, originalFilters.sortBy);
    assert.equal(parsed.filters.page, originalFilters.page);
  });
});
