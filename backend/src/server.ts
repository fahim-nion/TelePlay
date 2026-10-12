import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import { DatabaseSync } from 'node:sqlite';
import { config, AppConfig } from './config.js';
import { createDatabase } from './db/database.js';
import { apiRoutes } from './routes/api.js';

export async function buildApp(
  appConfig: AppConfig = config,
  database?: DatabaseSync
): Promise<FastifyInstance> {
  const db = database || createDatabase(appConfig.databasePath);

  const app = Fastify({
    logger: {
      level: appConfig.logLevel,
      redact: ['req.headers.authorization', 'req.headers.cookie'],
    },
  });

  // Enable CORS for frontend requests
  await app.register(cors, {
    origin: appConfig.corsOrigin === '*' ? true : appConfig.corsOrigin,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  });

  // Health check endpoint required by Phase 1
  app.get('/api/health', async () => {
    return {
      status: 'ok',
      service: 'teleplay-backend',
      version: '0.1.0',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      environment: appConfig.nodeEnv,
    };
  });

  // Register public read-only API endpoints under /api
  await app.register(apiRoutes, { prefix: '/api', db });

  // Decorate app with db for cleanup / testing
  app.decorate('db', db);

  return app;
}

// Start the server if running directly
async function start() {
  try {
    const app = await buildApp();
    await app.listen({ port: config.port, host: config.host });
    app.log.info(`TelePlay backend listening at http://${config.host}:${config.port}`);
  } catch (err) {
    console.error('Failed to start TelePlay server:', err);
    process.exit(1);
  }
}

// Check if this module is being executed directly
if (process.argv[1] && (process.argv[1].endsWith('server.ts') || process.argv[1].endsWith('server.js'))) {
  start();
}
