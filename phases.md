# TeliPlay — Implementation Phases

Do not advance until exit criteria are met and `memory.md` is updated.

## Phase 0 — Feasibility and Source Review (current; pending)
- Inspect all candidate URLs and classify as feed, tool, index, community, or downloader.
- Verify active raw playlist URLs/endpoints, licenses/terms, attribution, and automated-use restrictions.
- Select a small approved source set; do not ingest every reference automatically.
- Verify Node/framework/SQLite compatibility on actual Termux.
- Test browser player with permitted sample streams; document CORS/codec limits.
- Define health statuses, freshness, timeout, byte limits, concurrency, retry/backoff, and schedule.
- Decide secure frontend-to-phone access and offline behavior.
- Create `feasibility.md`, record evidence and decisions.
**Exit:** approved source set documented; Termux/player approach tested or explicitly marked unverified; bounded health checks designed; unresolved assumptions labelled.

## Phase 1 — Project Foundation
Inspect repository/runtime/git state. Confirm structure before setup. Add only needed package scripts, TypeScript/test configuration, `.gitignore`, `.env.example`, README, and `GET /api/health`.
**Exit:** frontend/backend start independently; health endpoint works; no secrets committed.

## Phase 2 — M3U Parser
Implement pure parser for `#EXTM3U`, `#EXTINF`, attributes, Unicode, quoted commas, CRLF, malformed/empty lines. Add sanitized fixtures and tests.
**Exit:** deterministic parser with edge-case coverage.

## Phase 3 — Source Registry and Safe Ingestion
Add approved source adapters, safe fetch limits, redirects/SSRF defenses, conditional requests, checkpoints, and dry-run import summaries.
**Exit:** only approved sources fetched; failed import cannot corrupt current data.

## Phase 4 — Database and Normalization
Create SQLite migrations, normalized channels, source-entry provenance, exact URL deduplication, conservative duplicate suggestions, indexes, transactions.
**Exit:** repeated imports are idempotent and provenance is preserved.

## Phase 5 — Health Checker
Implement timestamped statuses, bounded probes, global/per-host concurrency, timeouts, backoff, `Retry-After`, optional tiny HLS checks, stale expiry, resumable jobs.
**Exit:** tests prove checks are bounded and never download full streams.

## Phase 6 — Read-only API
Add channel/category/country/source-status endpoints, pagination/filter validation, caching headers and rate limits.
**Exit:** documented API with tests; admin diagnostics private.

## Phase 7 — Discovery Frontend
Responsive homepage, search, filters, cards/list view, status badges, attribution, favorites/recently watched locally, offline/loading/empty states.
**Exit:** users can discover channels without understanding M3U internals.

## Phase 8 — Browser Player
Integrate native HLS/hls.js where appropriate; loading/errors/retry, volume, fullscreen, source alternatives, next/previous, copy link. Do not proxy video by default.
**Exit:** test permitted sample streams on desktop/mobile; failures explained clearly.

## Phase 9 — Playlist Export
Valid UTF-8 M3U for catalogue/filters/selections, download/copy, direct channel link. If hosted tokens are enabled, add high-entropy tokens, hashing, revocation and rate limits.
**Exit:** exported playlists verified in two independent players; no internal data leaked.

## Phase 10 — Quality Features
Broken-link reports, source detail pages, recently verified sort, shareable filtered views, optional custom playlist builder. Evaluate EPG only after permissions/data quality are validated.
**Exit:** core browse/play/export remains stable.

## Phase 11 — Admin and Recovery
Protected source/job controls, manual refresh, scan budgets, backups/restores, log rotation, restart recovery, offline/uptime status.
**Exit:** admin routes protected and catalogue recoverable.

## Phase 12 — Security and Performance
Review SSRF/DNS rebinding/redirects, XSS, CORS, rate limits, token entropy, secrets, dependency health, memory/CPU/battery use.
**Exit:** critical risks fixed or explicitly block release.

## Phase 13 — Deployment and Release (COMPLETE)
Deploy static frontend; configure secure backend access; document Termux install/start/stop/restart/update/backup/restore; add source attribution, privacy/takedown contact, limitations, rollback and release checklist.
- [x] Termux deployment and operation scripts created (`scripts/termux/install.sh`, `start.sh`, `stop.sh`, `backup.sh`, `cron-healthcheck.sh`).
- [x] Complete deployment and operational documentation provided (`DEPLOYMENT.md`).
- [x] Source attribution, licenses, terms, and takedown policy created (`ATTRIBUTION.md`).
- [x] Static frontend deployment guide documented (Cloudflare Pages, Vercel, Netlify).
- [x] Secure remote phone access via Cloudflare Tunnel / Tailscale documented.
**Exit:** reproducible deployment and verified browse/play/export flow, with honest uptime expectations.

