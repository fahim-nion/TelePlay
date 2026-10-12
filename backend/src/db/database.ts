import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';
import { SCHEMA_DDL } from './schema.js';
import { APPROVED_SOURCES } from '../ingestion/sources.js';

export function createDatabase(dbPath: string = ':memory:'): DatabaseSync {
  // If using file-backed database, ensure parent directory exists
  if (dbPath !== ':memory:') {
    const resolvedPath = path.resolve(process.cwd(), dbPath);
    const parentDir = path.dirname(resolvedPath);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }
    dbPath = resolvedPath;
  }

  const db = new DatabaseSync(dbPath);

  // Execute DDL schema migrations
  db.exec(SCHEMA_DDL);

  // Seed default approved sources if not present
  const checkSource = db.prepare('SELECT id FROM sources WHERE id = ?');
  const insertSource = db.prepare(`
    INSERT INTO sources (id, name, source_url, category_default, terms, attribution, enabled, refresh_interval_hours)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const source of Object.values(APPROVED_SOURCES)) {
    const existing = checkSource.get(source.id);
    if (!existing) {
      insertSource.run(
        source.id,
        source.name,
        source.url,
        source.categoryDefault || null,
        source.terms,
        source.attribution,
        source.enabled ? 1 : 0,
        source.refreshIntervalHours
      );
    }
  }

  return db;
}

/**
 * Executes a function within an SQLite transaction.
 * Automatically commits on success and rolls back on error.
 */
export function withTransaction<T>(db: DatabaseSync, fn: () => T): T {
  db.exec('BEGIN TRANSACTION;');
  try {
    const result = fn();
    db.exec('COMMIT;');
    return result;
  } catch (err) {
    try {
      db.exec('ROLLBACK;');
    } catch {
      // Ignore secondary rollback errors
    }
    throw err;
  }
}

