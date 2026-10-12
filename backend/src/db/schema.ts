/**
 * SQLite Database Schema DDL for TelePlay
 * Designed for embedded execution via node:sqlite (Node 22+).
 */

export const SCHEMA_DDL = `
PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;

-- 1. Sources Registry Table
CREATE TABLE IF NOT EXISTS sources (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  source_url TEXT NOT NULL,
  category_default TEXT,
  terms TEXT NOT NULL,
  attribution TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1,
  refresh_interval_hours INTEGER NOT NULL DEFAULT 24,
  last_fetched_at TEXT,
  last_status TEXT,
  last_error TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 2. Normalized Channels Table
CREATE TABLE IF NOT EXISTS channels (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  canonical_name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Uncategorized',
  country TEXT,
  language TEXT,
  logo_url TEXT,
  tvg_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Indexes for fast browsing & filtering
CREATE INDEX IF NOT EXISTS idx_channels_category ON channels(category);
CREATE INDEX IF NOT EXISTS idx_channels_country ON channels(country);
CREATE INDEX IF NOT EXISTS idx_channels_canonical_name ON channels(canonical_name);
CREATE INDEX IF NOT EXISTS idx_channels_tvg_id ON channels(tvg_id);

-- 3. Channel Streams / Provenance Table (Multi-stream support per channel)
CREATE TABLE IF NOT EXISTS channel_sources (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  channel_id INTEGER NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  source_id TEXT NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
  stream_url TEXT NOT NULL UNIQUE,
  stream_type TEXT NOT NULL DEFAULT 'hls', -- 'hls', 'dash', 'http_external'
  source_name TEXT,
  source_logo TEXT,
  source_group TEXT,
  extra_tags TEXT, -- JSON array of tags (#EXTGRP, #EXTVLCOPT)
  first_seen_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_seen_at TEXT NOT NULL DEFAULT (datetime('now')),
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_channel_sources_channel_id ON channel_sources(channel_id);
CREATE INDEX IF NOT EXISTS idx_channel_sources_source_id ON channel_sources(source_id);
CREATE INDEX IF NOT EXISTS idx_channel_sources_stream_url ON channel_sources(stream_url);

-- 4. Channel Health Checks Table
CREATE TABLE IF NOT EXISTS health_checks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  channel_source_id INTEGER NOT NULL REFERENCES channel_sources(id) ON DELETE CASCADE,
  status TEXT NOT NULL, -- 'working', 'intermittent', 'unreachable', 'unsupported', 'stale'
  http_status INTEGER,
  response_time_ms INTEGER,
  error_summary TEXT,
  checked_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_health_checks_channel_source ON health_checks(channel_source_id);
CREATE INDEX IF NOT EXISTS idx_health_checks_checked_at ON health_checks(checked_at);

-- 5. Background Jobs Table (Persistent Checkpoints for Termux)
CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL, -- 'import', 'health_check'
  status TEXT NOT NULL, -- 'pending', 'running', 'completed', 'failed'
  progress_current INTEGER NOT NULL DEFAULT 0,
  progress_total INTEGER NOT NULL DEFAULT 0,
  checkpoint_data TEXT, -- JSON state for resuming across phone restarts
  error_summary TEXT,
  started_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  finished_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
`;

