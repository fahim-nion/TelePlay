# TeliPlay — Architecture

## Direction
- Frontend: React + TypeScript + Vite, hosted separately if desired.
- Backend: Node.js + TypeScript in Android Termux; choose Fastify or Express after compatibility testing.
- Database: SQLite initially, avoiding a separate database service on the phone.
- Player: native HLS where supported; evaluate hls.js for other browsers.
- Deployment: no Docker requirement on Termux; keep migration to a VPS possible.
- Backend serves metadata/playlists, not video bytes by default.

## Data flow
Public approved source → SafeFetcher → M3U parser → normalization/deduplication → SQLite catalogue → bounded health checker → read-only API / playlist exporter → frontend. Browser then requests stream directly from source.

## Modules
- `SourceRegistry`: approved sources, attribution, terms, refresh policy.
- `SourceAdapter`: fetches raw playlist or documented endpoint.
- `SafeFetcher`: HTTP(S) only; timeouts, max bytes, redirect restrictions, content checks, SSRF protections, DNS/redirect revalidation.
- `M3UParser`: pure parser for playlist text and attributes.
- `ChannelNormalizer`: metadata cleanup and protocol classification.
- `DeduplicationService`: exact URL dedup plus conservative probable matches.
- `HealthChecker`: bounded probes, host/global concurrency, backoff, timestamps.
- `JobStore`: persistent, resumable import/check jobs.
- `PlaylistService`: valid M3U generation and optional tokenized endpoints.
- `ChannelService`: filtering, pagination, provenance, health freshness.
- `AdminService`: protected import/recheck/source controls.
- `AuditLog`: source and admin changes.

## Suggested schema
- `sources`: id, name, source_url, source_type, terms/license note, attribution, enabled, refresh interval, last fetch/status/error.
- `channels`: id, canonical/display name, country, language, category, logo URL, tvg id, timestamps.
- `channel_sources`: channel/source IDs, stream URL/type, source metadata, first/last seen, enabled.
- `health_checks`: channel-source ID, status, checked time, duration, HTTP status/error code, checker version.
- `jobs`: type, status, checkpoint, start/update/finish times, error summary.
- `playlist_tokens` (optional): token hash, filter config, creation/use/revocation times.

Keep schema minimal until Phase 0 is complete. Store no full stream bodies.

## API outline
- `GET /api/health`
- `GET /api/channels` with pagination/search/filters
- `GET /api/channels/:id`
- `GET /api/categories`
- `GET /api/countries`
- `GET /api/sources/status` (safe public summary)
- `GET /api/playlists/catalogue.m3u`
- `GET /api/playlists/:token.m3u` (optional)
- `POST /api/reports/broken-link` (rate-limited)
- Protected admin endpoints for imports/rechecks.

Never expose stack traces, internal IPs, secrets, or unrestricted URL fetching.

## Health checks
Distinguish reachable from playable. Use bounded GET/probes rather than HEAD alone; some sources reject HEAD. For HLS, optionally fetch a manifest and a very small bounded sample of segments. Never download the whole video. Respect `Retry-After`; apply per-host/global concurrency, timeouts, backoff, and stale expiry. Never offer an unauthenticated arbitrary-URL scanner.

## Termux realities
Android may suspend/kill background jobs. Document restart, backup/restore, log rotation, battery optimization, wakelock tradeoffs, thermal limits, and mobile-data costs. Use persistent checkpoints. Keep public API access behind a secure tunnel/edge or equivalent; protect admin routes and secrets. Show a graceful offline state. Phone-hosted uptime is not guaranteed.

## Security
Allow only HTTP(S); block localhost/private/link-local/metadata IPs after DNS resolution; revalidate redirects to mitigate SSRF/DNS rebinding. Escape metadata, validate logos and playlist inputs, rate-limit public endpoints, protect admin APIs, redact secrets from logs, and never place admin/tunnel tokens in frontend code.

## Decisions still pending
Approved initial sources and terms; backend framework and SQLite driver; health freshness and scan budgets; hosted playlist tokens; frontend-to-Termux access method; EPG eligibility; realistic uptime target.
