import {
  ChannelsResponse,
  ChannelDetail,
  CategoryCount,
  CountryCount,
  SourceRecord,
  CatalogueStats,
  ChannelFilters,
} from '../types';

export class ApiError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(url: string): Promise<T> {
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

export async function fetchCategories(): Promise<{ categories: CategoryCount[] }> {
  return request<{ categories: CategoryCount[] }>('/api/categories');
}

export async function fetchCountries(): Promise<{ countries: CountryCount[] }> {
  return request<{ countries: CountryCount[] }>('/api/countries');
}

export async function fetchSources(): Promise<{ sources: SourceRecord[] }> {
  return request<{ sources: SourceRecord[] }>('/api/sources/status');
}
