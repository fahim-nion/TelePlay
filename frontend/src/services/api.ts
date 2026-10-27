import {
  ChannelsResponse,
  ChannelDetail,
  CategoryCount,
  CountryCount,
  SourceRecord,
  SourceDetail,
  CatalogueStats,
  ChannelFilters,
  ReportSubmission,
} from '../types';

export class ApiError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
    this.name = 'ApiError';
  }
}

export function getApiBaseUrl(): string {
  if (typeof window !== 'undefined') {
    const custom = localStorage.getItem('teleplay_backend_url');
    if (custom) return custom.trim().replace(/\/$/, '');
  }
  const envUrl = (import.meta as any).env?.VITE_API_BASE_URL;
  if (envUrl) return String(envUrl).trim().replace(/\/$/, '');
  return '';
}

export function setApiBaseUrl(url: string): void {
  if (typeof window !== 'undefined') {
    if (url && url.trim()) {
      localStorage.setItem('teleplay_backend_url', url.trim().replace(/\/$/, ''));
    } else {
      localStorage.removeItem('teleplay_backend_url');
    }
  }
}

async function request<T>(path: string): Promise<T> {
  const base = getApiBaseUrl();
  const url = path.startsWith('http') ? path : `${base}${path}`;
  const res = await fetch(url);
  if (!res.ok) {
    const errorText = await res.text().catch(() => '');
    let parsedMessage = `HTTP ${res.status}: ${res.statusText}`;
    try {
      const parsed = JSON.parse(errorText);
      if (parsed.error) parsedMessage = parsed.error;
    } catch {
      // Keep HTTP statusText
    }
    throw new ApiError(parsedMessage, res.status);
  }
  return res.json();
}

export async function fetchHealth(): Promise<{ status: string; service: string; version: string; uptimeSeconds: number }> {
  return request('/api/health');
}

export async function fetchStats(): Promise<{ stats: CatalogueStats }> {
  return request('/api/stats');
}

export async function fetchChannels(filters: ChannelFilters = {}): Promise<ChannelsResponse> {
  const params = new URLSearchParams();
  if (filters.search) params.set('search', filters.search);
  if (filters.category) params.set('category', filters.category);
  if (filters.country) params.set('country', filters.country);
  if (filters.healthStatus) params.set('healthStatus', filters.healthStatus);
  if (filters.sourceId) params.set('sourceId', filters.sourceId);
  if (filters.sortBy) params.set('sortBy', filters.sortBy);
  if (filters.page) params.set('page', filters.page.toString());
  if (filters.limit) params.set('limit', filters.limit.toString());

  const queryString = params.toString();
  const url = queryString ? `/api/channels?${queryString}` : '/api/channels';
  return request<ChannelsResponse>(url);
}

export async function fetchChannelById(id: number): Promise<{ channel: ChannelDetail }> {
  return request<{ channel: ChannelDetail }>(`/api/channels/${id}`);
}

export async function fetchSourceById(id: string): Promise<{ source: SourceDetail }> {
  return request<{ source: SourceDetail }>(`/api/sources/${encodeURIComponent(id)}`);
}

export async function submitReport(
  report: ReportSubmission
): Promise<{ success: boolean; reportId: number; message: string }> {
  const base = getApiBaseUrl();
  const res = await fetch(`${base}/api/reports`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(report),
  });
  if (!res.ok) {
    const errorText = await res.text().catch(() => '');
    let msg = `HTTP ${res.status}: ${res.statusText}`;
    try {
      const parsed = JSON.parse(errorText);
      if (parsed.error) msg = parsed.error;
    } catch {}
    throw new ApiError(msg, res.status);
  }
  return res.json();
}

export async function fetchCategories(): Promise<{ categories: CategoryCount[] }> {
  return request<{ categories: CategoryCount[] }>('/api/categories');
}

export async function fetchCountries(): Promise<{ countries: CountryCount[] }> {
  return request<{ countries: CountryCount[] }>('/api/countries');
}

export async function fetchSources(): Promise<{ sources: SourceRecord[] }> {
  return request<{ sources: SourceRecord[] }>('/api/sources/status');
}

export function getPlaylistExportUrl(options: {
  category?: string;
  country?: string;
  healthStatus?: string;
  channelIds?: number[];
  includeAllStreams?: boolean;
}): string {
  const params = new URLSearchParams();
  if (options.category) params.set('category', options.category);
  if (options.country) params.set('country', options.country);
  if (options.healthStatus) params.set('healthStatus', options.healthStatus);
  if (options.channelIds && options.channelIds.length > 0) {
    params.set('channelIds', options.channelIds.join(','));
  }
  if (options.includeAllStreams) params.set('includeAllStreams', 'true');

  const qs = params.toString();
  const base = getApiBaseUrl();
  return `${base}/api/playlists/export.m3u${qs ? `?${qs}` : ''}`;
}

