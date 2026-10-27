import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { DatabaseSync } from 'node:sqlite';
import {
  listChannels,
  getChannelById,
  listCategories,
  listCountries,
  getCatalogueSummary,
  queryChannelsForExport,
  getSourceById,
  createChannelReport,
  listChannelReports,
} from '../db/repository.js';
import { generateM3U } from '../export/m3u-generator.js';
import { createRateLimitHook } from '../security/rate-limiter.js';

export interface ApiRoutesOptions {
  db: DatabaseSync;
}

export const apiRoutes: FastifyPluginAsync<ApiRoutesOptions> = async (app, options) => {
  const db = options.db;

  // Rate limiter for report submissions (prevents spam on mobile server)
  const reportRateLimiter = createRateLimitHook({
    windowMs: 60000,
    maxRequests: 15,
  });

  // 1. GET /api/channels
  app.get('/channels', async (req, reply) => {
    const query = req.query as {
      search?: string;
      category?: string;
      country?: string;
      healthStatus?: string;
      sourceId?: string;
      sortBy?: 'name' | 'name_desc' | 'recently_checked' | 'created_at';
      page?: string;
      limit?: string;
    };

    const page = Math.max(1, parseInt(query.page || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(query.limit || '50', 10)));
    const offset = (page - 1) * limit;

    const { channels, total } = listChannels(db, {
      search: query.search,
      category: query.category,
      country: query.country,
      healthStatus: query.healthStatus,
      sourceId: query.sourceId,
      sortBy: query.sortBy,
      limit,
      offset,
    });

    reply.header('Cache-Control', 'public, max-age=15'); // 15 seconds cache
    return {
      channels,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  });

  // 2. GET /api/channels/:id
  app.get('/channels/:id', async (req, reply) => {
    const params = req.params as { id: string };
    const id = parseInt(params.id, 10);

    if (isNaN(id)) {
      reply.status(400);
      return { error: 'Invalid channel ID. Must be an integer.', statusCode: 400 };
    }

    const channel = getChannelById(db, id);
    if (!channel) {
      reply.status(404);
      return { error: 'Channel not found', statusCode: 404 };
    }

    reply.header('Cache-Control', 'public, max-age=30');
    return { channel };
  });

  // 3. GET /api/categories
  app.get('/categories', async (_req, reply) => {
    const categories = listCategories(db);
    reply.header('Cache-Control', 'public, max-age=60'); // 1 minute cache
    return { categories };
  });

  // 4. GET /api/countries
  app.get('/countries', async (_req, reply) => {
    const countries = listCountries(db);
    reply.header('Cache-Control', 'public, max-age=60'); // 1 minute cache
    return { countries };
  });

  // 5. GET /api/sources/status (Safe public summary of sources)
  app.get('/sources/status', async (_req, reply) => {
    const stmt = db.prepare(`
      SELECT id, name, source_url, terms, attribution, enabled, refresh_interval_hours, last_fetched_at, last_status
      FROM sources
      ORDER BY name ASC
    `);
    const sources = stmt.all();

    reply.header('Cache-Control', 'public, max-age=60');
    return { sources };
  });

  // 5b. GET /api/sources/:id (Full provenance, metrics, and channels)
  app.get('/sources/:id', async (req, reply) => {
    const params = req.params as { id: string };
    const source = getSourceById(db, params.id);
    if (!source) {
      reply.status(404);
      return { error: 'Source not found', statusCode: 404 };
    }

    reply.header('Cache-Control', 'public, max-age=60');
    return { source };
  });

  // 6. GET /api/stats (Real catalogue and health statistics)
  app.get('/stats', async (_req, reply) => {
    const stats = getCatalogueSummary(db);
    reply.header('Cache-Control', 'public, max-age=30'); // 30 seconds cache
    return { stats };
  });

  // 7. GET /api/playlists/export.m3u (Valid UTF-8 M3U playlist export)
  app.get('/playlists/export.m3u', async (req, reply) => {
    const query = req.query as {
      category?: string;
      country?: string;
      healthStatus?: string;
      search?: string;
      channelIds?: string;
      includeAllStreams?: string;
      limit?: string;
    };

    let parsedIds: number[] | undefined;
    if (query.channelIds && query.channelIds.trim().length > 0) {
      parsedIds = query.channelIds
        .split(',')
        .map((s) => parseInt(s.trim(), 10))
        .filter((n) => !isNaN(n));
    }

    const limit = query.limit ? parseInt(query.limit, 10) : undefined;
    const includeAllStreams = query.includeAllStreams === 'true' || query.includeAllStreams === '1';

    const channels = queryChannelsForExport(db, {
      category: query.category,
      country: query.country,
      healthStatus: query.healthStatus,
      search: query.search,
      channelIds: parsedIds,
      limit,
    });

    const m3uContent = generateM3U(channels, { includeAllStreams });

    let filename = 'teleplay-catalogue.m3u';
    if (query.category) {
      const slug = query.category.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      filename = `teleplay-${slug}.m3u`;
    } else if (query.country) {
      const slug = query.country.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      filename = `teleplay-${slug}.m3u`;
    } else if (parsedIds && parsedIds.length > 0) {
      filename = 'teleplay-selection.m3u';
    }

    reply.header('Content-Type', 'audio/x-mpegurl; charset=utf-8');
    reply.header('Content-Disposition', `attachment; filename="${filename}"`);
    reply.header('Cache-Control', 'public, max-age=60');

    return reply.send(m3uContent);
  });

  // 8. POST /api/reports (Submit broken link or metadata reports)
  app.post('/reports', { preHandler: [reportRateLimiter] }, async (req, reply) => {
    const body = req.body as {
      channelId?: number;
      channelName?: string;
      streamUrl?: string;
      reason?: string;
      details?: string;
    };

    if (!body || !body.channelName || typeof body.channelName !== 'string' || body.channelName.trim().length === 0) {
      reply.status(400);
      return { error: 'Channel name is required', statusCode: 400 };
    }

    const validReasons = ['broken', 'unsupported', 'inappropriate', 'metadata', 'other'];
    const reason = body.reason && validReasons.includes(body.reason) ? body.reason : 'broken';

    const result = createChannelReport(db, {
      channelId: typeof body.channelId === 'number' ? body.channelId : undefined,
      channelName: body.channelName.slice(0, 200),
      streamUrl: typeof body.streamUrl === 'string' ? body.streamUrl.slice(0, 1000) : undefined,
      reason,
      details: typeof body.details === 'string' ? body.details.slice(0, 2000) : undefined,
    });

    reply.status(201);
    return {
      success: true,
      reportId: result.id,
      reportedAt: result.reportedAt,
      message: 'Report submitted successfully. Thank you for contributing to TelePlay!',
    };
  });

  // 9. GET /api/reports (Safe inspection endpoint)
  app.get('/reports', async (req, reply) => {
    const query = req.query as { limit?: string };
    const limit = Math.min(100, Math.max(1, parseInt(query.limit || '50', 10)));
    const reports = listChannelReports(db, limit);
    return { reports };
  });
};
