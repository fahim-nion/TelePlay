import dotenv from 'dotenv';
import path from 'node:path';

// Load environment variables from .env file if present
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

export interface AppConfig {
  port: number;
  host: string;
  nodeEnv: string;
  databasePath: string;
  logLevel: string;
  corsOrigin: string;
  healthCheckIntervalMinutes: number;
  healthCheckBatchSize: number;
  healthCheckConcurrency: number;
  healthCheckTimeoutMs: number;
  healthCheckMaxBytes: number;
  adminToken: string;
  backupDir: string;
}

export function loadConfig(): AppConfig {
  return {
    port: parseInt(process.env.PORT || '3000', 10),
    host: process.env.HOST || '0.0.0.0',
    nodeEnv: process.env.NODE_ENV || 'development',
    databasePath: process.env.DATABASE_PATH || './data/teleplay.db',
    logLevel: process.env.LOG_LEVEL || 'info',
    corsOrigin: process.env.CORS_ORIGIN || '*',
    healthCheckIntervalMinutes: parseInt(process.env.HEALTH_CHECK_INTERVAL_MINUTES || '15', 10),
    healthCheckBatchSize: parseInt(process.env.HEALTH_CHECK_BATCH_SIZE || '20', 10),
    healthCheckConcurrency: parseInt(process.env.HEALTH_CHECK_CONCURRENCY || '5', 10),
    healthCheckTimeoutMs: parseInt(process.env.HEALTH_CHECK_TIMEOUT_MS || '5000', 10),
    healthCheckMaxBytes: parseInt(process.env.HEALTH_CHECK_MAX_BYTES || '65536', 10),
    adminToken: process.env.ADMIN_TOKEN || 'teleplay-admin-secret-key-change-me',
    backupDir: process.env.BACKUP_DIR || './data/backups',
  };
}

export const config = loadConfig();

