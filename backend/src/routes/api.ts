import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { DatabaseSync } from 'node:sqlite';
import {
  listChannels,
  getChannelById,
  listCategories,
  listCountries,
  getCatalogueSummary,
} from '../db/repository.js';

export interface ApiRoutesOptions {
  db: DatabaseSync;
}

export const apiRoutes: FastifyPluginAsync<ApiRoutesOptions> = async (app, options) => {
  const db = options.db;

  // 1. GET /api/channels
  app.get('/channels', async (req, reply) => {
    const query = req.query as {
      search?: string;
      category?: string;
      country?: string;
      healthStatus?: string;
      sortBy?: 'name' | 'recently_checked' | 'created_at';
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

  // 6. GET /api/stats (Real catalogue and health statistics)
  app.get('/stats', async (_req, reply) => {
    const stats = getCatalogueSummary(db);
    reply.header('Cache-Control', 'public, max-age=30'); // 30 seconds cache
    return { stats };
  });
};
