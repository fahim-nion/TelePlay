import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import { DatabaseSync } from 'node:sqlite';
import { config, AppConfig } from './config.js';
import { createDatabase } from './db/database.js';
import { apiRoutes } from './routes/api.js';
import { adminRoutes } from './routes/admin.js';
import { recoverInterruptedJobs } from './admin/recovery.js';
import { registerSecurityHeaders } from './security/headers.js';

export async function buildApp(
  appConfig: AppConfig = config,
  database?: DatabaseSync
): Promise<FastifyInstance> {
  const db = database || createDatabase(appConfig.databasePath);

  // Termux Restart Recovery: Clean up any jobs left interrupted by server restart
  recoverInterruptedJobs(db);

  const app = Fastify({
    logger: {
      level: appConfig.logLevel,
      redact: ['req.headers.authorization', 'req.headers["x-admin-token"]', 'req.headers.cookie'],
    },
  });

  // Enforce HTTP Security Headers (nosniff, DENY framing, CSP)
  await registerSecurityHeaders(app);

  // Enable CORS for frontend requests
  await app.register(cors, {
    origin: appConfig.corsOrigin === '*' ? true : appConfig.corsOrigin,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  });

  // Root information route
  app.get('/', async () => {
    return {
      service: 'TelePlay Backend API',
      status: 'online',
      version: '0.1.0',
      message: 'TelePlay backend is running successfully on Termux. Connect this URL to your frontend.',
      healthCheck: '/api/health',
      stats: '/api/stats',
    };
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

  // Register protected admin and recovery endpoints under /api/admin
  await app.register(adminRoutes, { prefix: '/api/admin', db, config: appConfig });

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
