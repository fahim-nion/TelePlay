export interface ApprovedSource {
  id: string;
  name: string;
  url: string;
  categoryDefault?: string;
  countryDefault?: string;
  terms: string;
  attribution: string;
  enabled: boolean;
  refreshIntervalHours: number;
}

/**
 * Registry of approved public IPTV playlist sources.
 * Only sources formally vetted during Phase 0 are enabled.
 */
export const APPROVED_SOURCES: Record<string, ApprovedSource> = {
  'free-tv': {
    id: 'free-tv',
    name: 'Free-TV Curated Global',
    url: 'https://raw.githubusercontent.com/Free-TV/IPTV/master/playlist.m3u8',
    terms: 'Free-To-Air public broadcasts; community curated; non-commercial links',
    attribution: 'Free-TV Project (https://github.com/free-tv/iptv)',
    enabled: true,
    refreshIntervalHours: 24,
  },
  'iptv-org-bd': {
    id: 'iptv-org-bd',
    name: 'iptv-org Bangladesh',
    url: 'https://iptv-org.github.io/iptv/countries/bd.m3u',
    categoryDefault: 'General',
    countryDefault: 'BD',
    terms: 'Dedicated to the Public Domain under The Unlicense',
    attribution: 'iptv-org Project (https://github.com/iptv-org/iptv)',
    enabled: true,
    refreshIntervalHours: 24,
  },
  'iptv-org-news': {
    id: 'iptv-org-news',
    name: 'iptv-org News Partition',
    url: 'https://iptv-org.github.io/iptv/categories/news.m3u',
    categoryDefault: 'News',
    terms: 'Dedicated to the Public Domain under The Unlicense',
    attribution: 'iptv-org Project (https://github.com/iptv-org/iptv)',
    enabled: true,
    refreshIntervalHours: 24,
  },
  'iptv-org-sports': {
    id: 'iptv-org-sports',
    name: 'iptv-org Sports Partition',
    url: 'https://iptv-org.github.io/iptv/categories/sports.m3u',
    categoryDefault: 'Sports',
    terms: 'Dedicated to the Public Domain under The Unlicense',
    attribution: 'iptv-org Project (https://github.com/iptv-org/iptv)',
    enabled: true,
    refreshIntervalHours: 24,
  },
};

export function getApprovedSources(): ApprovedSource[] {
  return Object.values(APPROVED_SOURCES);
}

export function getSourceById(id: string): ApprovedSource | undefined {
  return APPROVED_SOURCES[id];
}

export function isApprovedSource(id: string): boolean {
  return id in APPROVED_SOURCES && APPROVED_SOURCES[id].enabled;
}

