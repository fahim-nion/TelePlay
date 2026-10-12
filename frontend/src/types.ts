export type HealthStatus = 'working' | 'intermittent' | 'unreachable' | 'unsupported' | 'stale' | 'not_checked';

export interface Channel {
  id: number;
  canonical_name: string;
  display_name: string;
  category: string;
  country: string | null;
  language: string | null;
  logo_url: string | null;
  tvg_id: string | null;
  stream_count: number;
  health_status?: HealthStatus | null;
  last_checked_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface StreamSource {
  id: number;
  channel_id: number;
  source_id: string;
  stream_url: string;
  stream_type: string;
  source_name: string | null;
  source_logo: string | null;
  source_group: string | null;
  health_status?: HealthStatus | null;
  last_checked_at?: string | null;
  first_seen_at: string;
  last_seen_at: string;
  is_active: number;
}

export interface ChannelDetail extends Channel {
  streams: StreamSource[];
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ChannelsResponse {
  channels: Channel[];
  pagination: Pagination;
}

export interface CategoryCount {
  category: string;
  count: number;
}

export interface CountryCount {
  country: string;
  count: number;
}

export interface SourceRecord {
  id: string;
  name: string;
  source_url: string;
  terms: string;
  attribution: string;
  enabled: number;
  refresh_interval_hours: number;
  last_fetched_at: string | null;
  last_status: string | null;
}

export interface CatalogueStats {
  totalChannels: number;
  totalStreams: number;
  workingCount: number;
  intermittentCount: number;
  unreachableCount: number;
  unsupportedCount: number;
  staleCount: number;
  uncheckedCount: number;
  lastRefreshedAt: string | null;
}

export interface ChannelFilters {
  search?: string;
  category?: string;
  country?: string;
  healthStatus?: string;
  sortBy?: 'name' | 'recently_checked' | 'created_at';
  page?: number;
  limit?: number;
}

export type ViewMode = 'grid' | 'list';
export type NavigationTab = 'discover' | 'channels' | 'categories' | 'countries' | 'favorites' | 'about';

export interface FavoriteChannel {
  id: number;
  name: string;
  category: string;
  country: string | null;
  logo_url: string | null;
  health_status?: HealthStatus | null;
  last_checked_at?: string | null;
  stream_count: number;
  saved_at: string;
}

