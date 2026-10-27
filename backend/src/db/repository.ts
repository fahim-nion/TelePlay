import { DatabaseSync } from 'node:sqlite';
import { withTransaction } from './database.js';
import { ParsedPlaylist, M3UEntry } from '../parser/types.js';
import { ExportChannelItem, ExportChannelStream } from '../export/types.js';

export interface ChannelRecord {
  id: number;
  canonical_name: string;
  display_name: string;
  category: string;
  country: string | null;
  language: string | null;
  logo_url: string | null;
  tvg_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChannelStreamRecord {
  id: number;
  channel_id: number;
  source_id: string;
  stream_url: string;
  stream_type: string;
  source_name: string | null;
  source_logo: string | null;
  source_group: string | null;
  first_seen_at: string;
  last_seen_at: string;
  is_active: number;
  health_status?: string | null;
  last_checked_at?: string | null;
}

export interface ChannelDetail extends ChannelRecord {
  streams: ChannelStreamRecord[];
}

export interface ChannelFilterOptions {
  search?: string;
  category?: string;
  country?: string;
  healthStatus?: string;
  sourceId?: string;
  limit?: number;
  offset?: number;
  sortBy?: 'name' | 'recently_checked' | 'created_at';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Normalizes a raw channel name to produce a canonical key for conservative matching.
 * Strips resolution markers e.g. "(1080p)", special badges "Ⓢ", and normalizes spacing/casing.
 */
export function normalizeCanonicalName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s*\(\d+p\)/gi, '') // Remove (1080p), (720p)
    .replace(/\s*\[[^\]]+\]/gi, '') // Remove [Geo-blocked], [Not 24/7]
    .replace(/[ⓈⓉⓎⓌ]/g, '') // Remove special platform symbols
    .replace(/[^\p{L}\p{N}\s]/gu, ' ') // Replace punctuation with space, preserving Unicode letters
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Persists an ingested playlist into SQLite with exact URL deduplication,
 * channel normalization, and multi-stream association.
 */
export function persistParsedPlaylist(
  db: DatabaseSync,
  sourceId: string,
  parsed: ParsedPlaylist,
  categoryDefault: string = 'Uncategorized'
): { insertedStreams: number; updatedStreams: number; channelsCreated: number } {
  return withTransaction(db, () => {
    // 1. Prepared statements for queries and updates
    const selectStream = db.prepare('SELECT id, channel_id FROM channel_sources WHERE stream_url = ?');
    const updateStream = db.prepare(`
      UPDATE channel_sources 
      SET last_seen_at = datetime('now'), is_active = 1, source_name = ?, source_logo = ?, source_group = ?
      WHERE id = ?
    `);
    const insertStream = db.prepare(`
      INSERT INTO channel_sources (channel_id, source_id, stream_url, stream_type, source_name, source_logo, source_group, extra_tags)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const selectChannelByNameAndCat = db.prepare(`
      SELECT id FROM channels WHERE canonical_name = ? AND category = ?
    `);
    const selectChannelByTvgId = db.prepare(`
      SELECT id FROM channels WHERE tvg_id = ? AND tvg_id IS NOT NULL AND tvg_id != ''
    `);
    const insertChannel = db.prepare(`
      INSERT INTO channels (canonical_name, display_name, category, country, language, logo_url, tvg_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const updateSourceStatus = db.prepare(`
      UPDATE sources SET last_fetched_at = datetime('now'), last_status = 'success', last_error = NULL WHERE id = ?
    `);

    let insertedStreams = 0;
    let updatedStreams = 0;
    let channelsCreated = 0;

    for (const entry of parsed.entries) {
      const canonicalName = normalizeCanonicalName(entry.name);
      const category = entry.groupTitle || categoryDefault;
      const tvgId = entry.tvgId || null;
      let country = entry.tvgCountry || entry.rawAttributes['country'] || null;
      if (!country && tvgId && tvgId.includes('.')) {
        const parts = tvgId.split('.');
        const lastPart = parts[parts.length - 1].toUpperCase();
        if (lastPart.length === 2 && /^[A-Z]{2}$/.test(lastPart)) {
          country = lastPart;
        }
      }
      const normalizedCountry = country ? country.toUpperCase().trim() : null;
      const language = entry.tvgLanguage || null;
      const logoUrl = entry.tvgLogo || null;

      // Classify stream type
      let streamType = 'hls';
      if (entry.url.includes('youtube.com') || entry.url.includes('twitch.tv')) {
        streamType = 'http_external';
      } else if (entry.url.endsWith('.mpd')) {
        streamType = 'dash';
      }

      // Check if this exact stream URL already exists
      const existingStream = selectStream.get(entry.url) as { id: number; channel_id: number } | undefined;

      if (existingStream) {
        // Stream URL already exists: update last seen
        updateStream.run(entry.name, logoUrl, category, existingStream.id);
        updatedStreams++;
      } else {
        // Find existing channel to attach to, or create a new channel
        let channelId: number | null = null;

        // Try matching by tvg-id first if present
        if (tvgId) {
          const matchByTvg = selectChannelByTvgId.get(tvgId) as { id: number } | undefined;
          if (matchByTvg) channelId = matchByTvg.id;
        }

        // Next try matching by canonical name and category
        if (!channelId) {
          const matchByName = selectChannelByNameAndCat.get(canonicalName, category) as { id: number } | undefined;
          if (matchByName) channelId = matchByName.id;
        }

        // If no matching channel found, create new channel record
        if (!channelId) {
          const res = insertChannel.run(
            canonicalName,
            entry.name,
            category,
            normalizedCountry,
            language,
            logoUrl,
            tvgId
          );
          channelId = Number(res.lastInsertRowid);
          channelsCreated++;
        }

        // Insert new stream source linked to the channel
        insertStream.run(
          channelId,
          sourceId,
          entry.url,
          streamType,
          entry.name,
          logoUrl,
          category,
          entry.extraTags ? JSON.stringify(entry.extraTags) : null
        );
        insertedStreams++;
      }
    }

    updateSourceStatus.run(sourceId);

    return { insertedStreams, updatedStreams, channelsCreated };
  });
}

/**
 * Queries channels with pagination, search, category, and country filtering.
 */
export function listChannels(
  db: DatabaseSync,
  options: ChannelFilterOptions = {}
): { channels: (ChannelRecord & { stream_count: number; health_status?: string | null; last_checked_at?: string | null })[]; total: number } {
  const limit = options.limit ?? 50;
  const offset = options.offset ?? 0;
  const whereClauses: string[] = [];
  const params: (string | number)[] = [];

  if (options.search && options.search.trim().length > 0) {
    whereClauses.push('(c.display_name LIKE ? OR c.canonical_name LIKE ?)');
    const searchTerm = `%${options.search.trim().toLowerCase()}%`;
    params.push(searchTerm, searchTerm);
  }

  if (options.category && options.category.trim().length > 0) {
    whereClauses.push('c.category = ?');
    params.push(options.category);
  }

  if (options.country && options.country.trim().length > 0) {
    whereClauses.push('c.country = ?');
    params.push(options.country.toUpperCase());
  }

  if (options.sourceId && options.sourceId.trim().length > 0) {
    whereClauses.push(`EXISTS (
      SELECT 1 FROM channel_sources cs_src
      WHERE cs_src.channel_id = c.id AND cs_src.source_id = ?
    )`);
    params.push(options.sourceId.trim());
  }

  if (options.healthStatus && options.healthStatus.trim().length > 0) {
    if (options.healthStatus === 'not_checked') {
      whereClauses.push(`NOT EXISTS (
        SELECT 1 FROM health_checks hc
        JOIN channel_sources cs2 ON cs2.id = hc.channel_source_id
        WHERE cs2.channel_id = c.id
      )`);
    } else {
      whereClauses.push(`(
        SELECT hc.status FROM health_checks hc
        JOIN channel_sources cs2 ON cs2.id = hc.channel_source_id
        WHERE cs2.channel_id = c.id
        ORDER BY hc.checked_at DESC LIMIT 1
      ) = ?`);
      params.push(options.healthStatus);
    }
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  // Get total count
  const countStmt = db.prepare(`SELECT COUNT(*) as count FROM channels c ${whereSql}`);
  const totalRow = (params.length > 0 ? countStmt.get(...params) : countStmt.get()) as { count: number };
  const total = totalRow.count;

  // Determine sort order
  let orderSql = 'c.display_name COLLATE NOCASE ASC';
  if (options.sortBy === 'name_desc') {
    orderSql = 'c.display_name COLLATE NOCASE DESC';
  } else if (options.sortBy === 'recently_checked') {
    orderSql = 'last_checked_at DESC NULLS LAST, c.display_name COLLATE NOCASE ASC';
  } else if (options.sortBy === 'created_at') {
    orderSql = 'c.created_at DESC, c.display_name COLLATE NOCASE ASC';
  }

  // Query channels with stream count and latest health status
  const querySql = `
    SELECT c.*, COUNT(cs.id) as stream_count,
      (SELECT hc.status FROM health_checks hc 
       JOIN channel_sources cs2 ON cs2.id = hc.channel_source_id 
       WHERE cs2.channel_id = c.id 
       ORDER BY hc.checked_at DESC LIMIT 1) as health_status,
      (SELECT hc.checked_at FROM health_checks hc 
       JOIN channel_sources cs2 ON cs2.id = hc.channel_source_id 
       WHERE cs2.channel_id = c.id 
       ORDER BY hc.checked_at DESC LIMIT 1) as last_checked_at
    FROM channels c
    LEFT JOIN channel_sources cs ON cs.channel_id = c.id
    ${whereSql}
    GROUP BY c.id
    ORDER BY ${orderSql}
    LIMIT ? OFFSET ?
  `;

  const queryParams = [...params, limit, offset];
  const queryStmt = db.prepare(querySql);
  const channels = queryStmt.all(...queryParams) as unknown as (ChannelRecord & {
    stream_count: number;
    health_status?: string | null;
    last_checked_at?: string | null;
  })[];

  return { channels, total };
}

export interface CatalogueSummary {
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

/**
 * Computes live, honest catalogue statistics for the discovery homepage.
 */
export function getCatalogueSummary(db: DatabaseSync): CatalogueSummary {
  const channelCount = (db.prepare('SELECT COUNT(*) as count FROM channels').get() as { count: number }).count;
  const streamCount = (db.prepare('SELECT COUNT(*) as count FROM channel_sources WHERE is_active = 1').get() as { count: number }).count;
  const lastRefreshRow = db.prepare('SELECT MAX(last_fetched_at) as last_refreshed FROM sources').get() as { last_refreshed: string | null };

  const statusCountsStmt = db.prepare(`
    WITH LatestChecks AS (
      SELECT c.id as channel_id,
        (SELECT hc.status FROM health_checks hc
         JOIN channel_sources cs ON cs.id = hc.channel_source_id
         WHERE cs.channel_id = c.id
         ORDER BY hc.checked_at DESC LIMIT 1) as latest_status
      FROM channels c
    )
    SELECT
      COUNT(CASE WHEN latest_status = 'working' THEN 1 END) as working,
      COUNT(CASE WHEN latest_status = 'intermittent' THEN 1 END) as intermittent,
      COUNT(CASE WHEN latest_status = 'unreachable' THEN 1 END) as unreachable,
      COUNT(CASE WHEN latest_status = 'unsupported' THEN 1 END) as unsupported,
      COUNT(CASE WHEN latest_status = 'stale' THEN 1 END) as stale,
      COUNT(CASE WHEN latest_status IS NULL THEN 1 END) as unchecked
    FROM LatestChecks
  `);
  const counts = statusCountsStmt.get() as {
    working: number;
    intermittent: number;
    unreachable: number;
    unsupported: number;
    stale: number;
    unchecked: number;
  };

  return {
    totalChannels: channelCount,
    totalStreams: streamCount,
    workingCount: counts.working,
    intermittentCount: counts.intermittent,
    unreachableCount: counts.unreachable,
    unsupportedCount: counts.unsupported,
    staleCount: counts.stale,
    uncheckedCount: counts.unchecked,
    lastRefreshedAt: lastRefreshRow?.last_refreshed ?? null,
  };
}

/**
 * Retrieves a single channel by ID with all its stream sources and health status.
 */
export function getChannelById(db: DatabaseSync, id: number): ChannelDetail | null {
  const channelStmt = db.prepare('SELECT * FROM channels WHERE id = ?');
  const channel = channelStmt.get(id) as unknown as ChannelRecord | undefined;
  if (!channel) return null;

  const streamsStmt = db.prepare(`
    SELECT cs.*, 
      (SELECT hc.status FROM health_checks hc WHERE hc.channel_source_id = cs.id ORDER BY hc.checked_at DESC LIMIT 1) as health_status,
      (SELECT hc.checked_at FROM health_checks hc WHERE hc.channel_source_id = cs.id ORDER BY hc.checked_at DESC LIMIT 1) as last_checked_at
    FROM channel_sources cs
    WHERE cs.channel_id = ?
    ORDER BY cs.id ASC
  `);
  const streams = streamsStmt.all(id) as unknown as ChannelStreamRecord[];

  return {
    ...channel,
    streams,
  };
}

/**
 * Lists categories with channel counts.
 */
export function listCategories(db: DatabaseSync): { category: string; count: number }[] {
  const stmt = db.prepare(`
    SELECT category, COUNT(*) as count
    FROM channels
    GROUP BY category
    ORDER BY count DESC, category ASC
  `);
  return stmt.all() as unknown as { category: string; count: number }[];
}

/**
 * Lists countries with channel counts.
 */
export function listCountries(db: DatabaseSync): { country: string; count: number }[] {
  const stmt = db.prepare(`
    SELECT country, COUNT(*) as count
    FROM channels
    WHERE country IS NOT NULL AND country != ''
    GROUP BY country
    ORDER BY count DESC, country ASC
  `);
  return stmt.all() as unknown as { country: string; count: number }[];
}

export interface ExportFilterOptions {
  category?: string;
  country?: string;
  healthStatus?: string;
  search?: string;
  channelIds?: number[];
  limit?: number;
}

/**
 * Retrieves channels with their active stream sources for M3U playlist export.
 */
export function queryChannelsForExport(
  db: DatabaseSync,
  options: ExportFilterOptions = {}
): ExportChannelItem[] {
  const whereClauses: string[] = [];
  const params: (string | number)[] = [];

  if (options.category && options.category.trim().length > 0) {
    whereClauses.push('c.category = ?');
    params.push(options.category);
  }

  if (options.country && options.country.trim().length > 0) {
    whereClauses.push('c.country = ?');
    params.push(options.country.toUpperCase());
  }

  if (options.search && options.search.trim().length > 0) {
    whereClauses.push('(c.display_name LIKE ? OR c.canonical_name LIKE ?)');
    const searchTerm = `%${options.search.trim().toLowerCase()}%`;
    params.push(searchTerm, searchTerm);
  }

  if (options.channelIds && options.channelIds.length > 0) {
    const placeholders = options.channelIds.map(() => '?').join(',');
    whereClauses.push(`c.id IN (${placeholders})`);
    params.push(...options.channelIds);
  }

  if (options.healthStatus && options.healthStatus.trim().length > 0) {
    whereClauses.push(`(
      SELECT hc.status FROM health_checks hc
      JOIN channel_sources cs2 ON cs2.id = hc.channel_source_id
      WHERE cs2.channel_id = c.id
      ORDER BY hc.checked_at DESC LIMIT 1
    ) = ?`);
    params.push(options.healthStatus);
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
  const limitSql = options.limit ? `LIMIT ${options.limit}` : '';

  const channelsStmt = db.prepare(`
    SELECT c.id, c.display_name, c.category, c.country, c.language, c.logo_url, c.tvg_id
    FROM channels c
    ${whereSql}
    ORDER BY c.display_name ASC
    ${limitSql}
  `);

  const channelRows = (params.length > 0 ? channelsStmt.all(...params) : channelsStmt.all()) as unknown as {
    id: number;
    display_name: string;
    category: string;
    country: string | null;
    language: string | null;
    logo_url: string | null;
    tvg_id: string | null;
  }[];

  if (channelRows.length === 0) return [];

  const streamsStmt = db.prepare(`
    SELECT cs.channel_id, cs.stream_url, cs.stream_type, cs.source_name,
      (SELECT hc.status FROM health_checks hc WHERE hc.channel_source_id = cs.id ORDER BY hc.checked_at DESC LIMIT 1) as health_status
    FROM channel_sources cs
    WHERE cs.is_active = 1
    ORDER BY cs.id ASC
  `);

  const allStreams = streamsStmt.all() as unknown as {
    channel_id: number;
    stream_url: string;
    stream_type: string;
    source_name: string | null;
    health_status: string | null;
  }[];

  // Group streams by channel_id
  const streamMap = new Map<number, ExportChannelStream[]>();
  for (const s of allStreams) {
    if (!streamMap.has(s.channel_id)) {
      streamMap.set(s.channel_id, []);
    }
    streamMap.get(s.channel_id)!.push({
      streamUrl: s.stream_url,
      streamType: s.stream_type,
      sourceName: s.source_name,
      healthStatus: s.health_status,
    });
  }

  return channelRows.map((c) => ({
    id: c.id,
    displayName: c.display_name,
    category: c.category,
    country: c.country,
    language: c.language,
    logoUrl: c.logo_url,
    tvgId: c.tvg_id,
    streams: streamMap.get(c.id) || [],
  }));
}

export interface ChannelReportRecord {
  id: number;
  channel_id: number | null;
  channel_name: string;
  stream_url: string | null;
  reason: string;
  details: string | null;
  reported_at: string;
  status: string;
}

export interface CreateReportOptions {
  channelId?: number | null;
  channelName: string;
  streamUrl?: string | null;
  reason: string;
  details?: string | null;
}

/**
 * Inserts a user-reported broken link or metadata correction.
 */
export function createChannelReport(
  db: DatabaseSync,
  options: CreateReportOptions
): { id: number; reportedAt: string } {
  const stmt = db.prepare(`
    INSERT INTO channel_reports (channel_id, channel_name, stream_url, reason, details)
    VALUES (?, ?, ?, ?, ?)
  `);
  stmt.run(
    options.channelId ?? null,
    options.channelName.trim(),
    options.streamUrl?.trim() ?? null,
    options.reason.trim(),
    options.details?.trim() ?? null
  );

  const row = db.prepare('SELECT id, reported_at FROM channel_reports ORDER BY id DESC LIMIT 1').get() as {
    id: number;
    reported_at: string;
  };
  return { id: row.id, reportedAt: row.reported_at };
}

/**
 * Lists submitted channel reports (ordered newest first).
 */
export function listChannelReports(db: DatabaseSync, limit: number = 50): ChannelReportRecord[] {
  const stmt = db.prepare(`
    SELECT * FROM channel_reports ORDER BY reported_at DESC LIMIT ?
  `);
  return stmt.all(limit) as unknown as ChannelReportRecord[];
}

export interface SourceDetail {
  id: string;
  name: string;
  source_url: string;
  category_default: string | null;
  terms: string;
  attribution: string;
  enabled: number;
  refresh_interval_hours: number;
  last_fetched_at: string | null;
  last_status: string | null;
  last_error: string | null;
  created_at: string;
  channel_count: number;
  stream_count: number;
  channels: {
    id: number;
    display_name: string;
    category: string;
    country: string | null;
    logo_url: string | null;
  }[];
}

/**
 * Retrieves full details, provenance metrics, and sample channels for an approved source.
 */
export function getSourceById(db: DatabaseSync, sourceId: string): SourceDetail | null {
  const sourceStmt = db.prepare('SELECT * FROM sources WHERE id = ?');
  const source = sourceStmt.get(sourceId) as unknown as any | undefined;
  if (!source) return null;

  const countRow = db.prepare(`
    SELECT 
      COUNT(DISTINCT channel_id) as channel_count,
      COUNT(CASE WHEN is_active = 1 THEN 1 END) as stream_count
    FROM channel_sources
    WHERE source_id = ?
  `).get(sourceId) as { channel_count: number; stream_count: number };

  const sampleChannels = db.prepare(`
    SELECT DISTINCT c.id, c.display_name, c.category, c.country, c.logo_url
    FROM channels c
    JOIN channel_sources cs ON cs.channel_id = c.id
    WHERE cs.source_id = ?
    ORDER BY c.display_name ASC
    LIMIT 60
  `).all(sourceId) as unknown as { id: number; display_name: string; category: string; country: string | null; logo_url: string | null }[];

  return {
    id: source.id,
    name: source.name,
    source_url: source.source_url,
    category_default: source.category_default,
    terms: source.terms,
    attribution: source.attribution,
    enabled: source.enabled,
    refresh_interval_hours: source.refresh_interval_hours,
    last_fetched_at: source.last_fetched_at,
    last_status: source.last_status,
    last_error: source.last_error,
    created_at: source.created_at,
    channel_count: countRow.channel_count,
    stream_count: countRow.stream_count,
    channels: sampleChannels,
  };
}
