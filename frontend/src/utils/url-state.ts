import { NavigationTab, ChannelFilters } from '../types';

export interface ParsedUrlState {
  tab: NavigationTab;
  filters: ChannelFilters;
}

const VALID_TABS: NavigationTab[] = [
  'discover',
  'channels',
  'categories',
  'countries',
  'playlist',
  'favorites',
  'about',
];

/**
 * Parses browser URL query string into active navigation tab and channel filters.
 */
export function parseUrlState(search: string): ParsedUrlState {
  const params = new URLSearchParams(search);

  const rawTab = params.get('tab') as NavigationTab | null;
  const tab: NavigationTab = rawTab && VALID_TABS.includes(rawTab) ? rawTab : 'discover';

  const parsedPage = parseInt(params.get('page') || '1', 10);
  const page = isNaN(parsedPage) || parsedPage < 1 ? 1 : parsedPage;

  const filters: ChannelFilters = {
    search: params.get('search') || '',
    category: params.get('category') || '',
    country: params.get('country') || '',
    healthStatus: params.get('healthStatus') || '',
    sourceId: params.get('sourceId') || '',
    sortBy: (params.get('sortBy') as 'name' | 'recently_checked' | 'created_at') || 'name',
    page,
    limit: 24,
  };

  return { tab, filters };
}

/**
 * Serializes active tab and non-empty channel filters into a clean query string.
 */
export function buildUrlQuery(tab: NavigationTab, filters: ChannelFilters): string {
  const params = new URLSearchParams();

  if (tab !== 'discover') {
    params.set('tab', tab);
  }

  if (filters.search && filters.search.trim()) {
    params.set('search', filters.search.trim());
  }
  if (filters.category && filters.category.trim()) {
    params.set('category', filters.category.trim());
  }
  if (filters.country && filters.country.trim()) {
    params.set('country', filters.country.trim());
  }
  if (filters.healthStatus && filters.healthStatus.trim()) {
    params.set('healthStatus', filters.healthStatus.trim());
  }
  if (filters.sourceId && filters.sourceId.trim()) {
    params.set('sourceId', filters.sourceId.trim());
  }
  if (filters.sortBy && filters.sortBy !== 'name') {
    params.set('sortBy', filters.sortBy);
  }
  if (filters.page && filters.page > 1) {
    params.set('page', filters.page.toString());
  }

  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

/**
 * Copies the shareable URL for the current filtered view to clipboard.
 */
export async function copyShareableLink(tab: NavigationTab, filters: ChannelFilters): Promise<boolean> {
  const qs = buildUrlQuery(tab, filters);
  const fullUrl = `${window.location.origin}${window.location.pathname}${qs}`;

  try {
    await navigator.clipboard.writeText(fullUrl);
    return true;
  } catch {
    return false;
  }
}
