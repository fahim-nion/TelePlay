# TelePlay — Project Memory

Update this file after every meaningful task. It is the handoff source for the next session.

## Current state
- **Project:** TelePlay
- **Current phase:** PHASE 13 — Deployment and Release (COMPLETE - Project 100% Implemented)
- **Status:** All 13 phases are completely implemented, tested, and documented. Complete suite of Android Termux operational scripts created (`install.sh`, `start.sh`, `stop.sh`, `backup.sh`, `check-all.sh`, `crawl.sh`, `cron-healthcheck.sh`), comprehensive deployment documentation provided in `DEPLOYMENT.md`, and complete source attribution, legal disclaimer, and takedown procedures provided in `ATTRIBUTION.md`. 126/126 automated unit and integration tests passing, zero TypeScript errors, clean production builds. Enhanced `check-all.sh` to automatically scan the entire catalogue at once with optional unified playlist crawling.
- **Current task:** Assist user with running single-command full catalogue crawl & verification.
- **Last updated:** 2026-10-28

## Product summary
Public IPTV channel discovery directory, timestamped technical health checks, browser player for compatible streams, direct-link copy, and M3U playlist export. Backend intended for Android Termux; frontend may be static-hosted independently.

## Candidate references evaluation summary
1. **Free-TV/IPTV:** APPROVED INITIAL SOURCE (`playlist.m3u8`).
2. **iptv-org:** APPROVED INITIAL SOURCE (Partitioned category/country files, e.g. `categories/news.m3u`).
3. **M3Unator:** REFERENCE ONLY (Playlist export & dedup).
4. **awesome-iptv:** REFERENCE ONLY.
5. **FMHY:** REJECTED AS AUTOMATED SOURCE.
6. **StreamCheck:** REJECTED AS SOURCE.
7. **PlaylistEditorTV:** REFERENCE ONLY.
8. **IPTV Community:** REJECTED AS SOURCE.
9. **N_m3u8DL-RE:** REFERENCE ONLY (Downloader; forbidden for routine health checks).

## Architecture & Technology Decisions
- **Backend Runtime:** Node.js v24 (or Node v22 LTS) with TypeScript in Android Termux.
- **Database Engine:** SQLite via Node's built-in `node:sqlite` (`DatabaseSync`). Zero native compilation dependencies.
- **Backend Framework:** Fastify v5 with `@fastify/cors` and Pino logger.
- **REST API Endpoints:**
  - `GET /api/health`: Service health and uptime.
  - `GET /api/stats`: Real catalogue statistics (channels, streams, health status counts, last refresh timestamp).
  - `GET /api/channels`: Paginated list of channels with search (`display_name`, `canonical_name`), category filter, country filter, healthStatus filter, and sorting (`name`, `recently_checked`, `created_at`). Caching: `max-age=15`.
  - `GET /api/channels/:id`: Detail view with all attached stream sources (`channel_sources`) and latest health check status. Caching: `max-age=30`.
  - `GET /api/categories`: Category list with active channel counts. Caching: `max-age=60`.
  - `GET /api/countries`: Country list with active channel counts. Caching: `max-age=60`.
  - `GET /api/sources/status`: Safe public status summary without internal diagnostics. Caching: `max-age=60`.
  - `GET /api/sources/:id`: Full source provenance, licensing terms, refresh window, and sample channel previews.
  - `GET /api/playlists/export.m3u`: Valid UTF-8 M3U playlist export with roundtrip parser fidelity.
  - `POST /api/reports`: User-submitted broken link and metadata correction reports.
  - `GET /api/reports`: Read-only list of submitted channel reports.
- **Database Schema:** Tables `sources`, `channels`, `channel_sources`, `health_checks`, `jobs`, `channel_reports` with WAL mode and foreign key enforcement.
- **Frontend Stack:** React 19 + TypeScript + Vite v6 + Lucide React.
- **Frontend Architecture:**
  - `Navbar`: Sticky brand bar, section navigation, favorites badge, Termux status dot, mobile hamburger menu.
  - `SearchHero`: Prominent search bar with clear button and quick tag shortcuts.
  - `StatsSummary`: Honest backend-derived metrics with explicit browser playback disclaimer.
  - `FilterBar`: Category, country, health status, and sort selectors with grid/list mode toggle and clear filters action.
  - `ChannelCard` & `ChannelRow`: Clean cards/rows with fallback avatars, status badges, stream counts, and play/favorite/copy actions.
  - `StatusBadge`: Color-coded health badges with honest microcopy and relative timestamps.
  - `FavoritesView`: Local browser favorites and recently played channels, resilient to backend offline states.
  - `AboutView` & `ReportModal`: Complete source provenance, terms, direct streaming explanation, and broken-link reporting dialog.
  - `OfflineBanner`: Non-intrusive alert with retry action when backend is disconnected.
- **Player Engine:** Native HLS on Safari; `hls.js` on Chromium and Firefox. Backend never proxies video streams.
- **Remote Access for Termux:** Cloudflare Tunnel (`cloudflared`) or Tailscale.

## Phase log
### Phase 0 — Feasibility and Source Review
- **Status:** COMPLETE. Documented in `feasibility.md`. Approved by user.

### Phase 1 — Project Foundation
- **Status:** COMPLETE. Verified with builds and automated tests.

### Phase 2 — M3U Parser
- **Status:** COMPLETE. Pure parser with 100% passing edge-case test coverage.

### Phase 3 — Source Registry and Safe Ingestion
- **Status:** COMPLETE. Source registry, DNS-level SSRF defenses, SafeFetcher, and dry-run import summaries.

### Phase 4 — Database and Normalization
- **Status:** COMPLETE. SQLite persistence layer with exact URL deduplication and multi-stream channel provenance.

### Phase 5 — Health Checker
- **Status:** COMPLETE. Bounded HTTP probes, multi-variant HLS checks, host throttling, persistent checkpoints, and stale-status transitions.

### Phase 6 — Read-only API
- **Status:** COMPLETE. Endpoints for channels, channels by ID, categories, countries, and safe public source status tested with 55 passing automated tests.

### Phase 7 — Discovery Frontend
- **Status:** COMPLETE.
- **Completed:**
  - `frontend/src/types.ts`: Channel, stream, catalogue stats, filters, and local favorite types.
  - `frontend/src/utils/time.ts` & `time.test.ts`: Relative time formatting (`formatRelativeTime`) and initials avatar generation (`getChannelInitials`).
  - `frontend/src/services/storage.ts` & `storage.test.ts`: LocalStorage management for favorites, recently watched channels, and view modes.
  - `frontend/src/services/api.ts`: Typed API client for `/api/health`, `/api/stats`, `/api/channels`, `/api/categories`, `/api/countries`, `/api/sources/status`.
  - `frontend/src/components/StatusBadge.tsx`: Badges for `working`, `intermittent`, `unreachable`, `unsupported`, `stale`, and `not_checked` with honest tooltips and timestamps.
  - `frontend/src/components/ChannelCard.tsx`: Grid card with fallback avatars, metadata, stream counts, play, favorite, and copy link actions.
  - `frontend/src/components/ChannelRow.tsx`: Dense list-view row for fast scanning.
  - `frontend/src/components/SearchHero.tsx`: Search banner with live filtering and quick tag pills.
  - `frontend/src/components/FilterBar.tsx`: Multi-dimensional filters (category, country, health, sort) and view mode switcher.
  - `frontend/src/components/StatsSummary.tsx`: Real backend-derived catalogue counts and health status breakdown.
  - `frontend/src/components/CategoryGrid.tsx` & `CountryGrid.tsx`: Category and country cards with channel counts.
  - `frontend/src/components/FavoritesView.tsx`: Starred channels and recently played list stored in local browser storage.
  - `frontend/src/components/AboutView.tsx`: Source transparency, terms, attribution, direct streaming architecture, and report link.
  - `frontend/src/components/ReportModal.tsx`: User reporting modal for broken or inappropriate streams.
  - `frontend/src/components/OfflineBanner.tsx`: Graceful offline alert with manual retry button.
  - `frontend/src/components/SkeletonCard.tsx`: Smooth loading placeholders.
  - `frontend/src/App.tsx`: Full responsive tab navigation and state management.
  - `backend/src/routes/api.ts` & `backend/src/db/repository.ts`: Added `GET /api/stats`, `sortBy`, and `healthStatus` query filters.
- **Exit criteria:**
  - [x] Responsive homepage, search, filters, cards/list view.
  - [x] Honest status badges with relative check timestamps.
  - [x] Source attribution and provenance view.
  - [x] Browser-local favorites and recently watched storage.
  - [x] Graceful offline, loading skeleton, and empty states.
  - [x] Users can discover channels without understanding M3U internals.
  - [x] 71/71 tests passing (58 backend, 13 frontend).
  - [x] Clean frontend production build (`npm --prefix frontend run build`).

### Phase 8 — Browser Player
- **Status:** COMPLETE.
- **Completed:**
  - `frontend/src/components/PlayerView.tsx`: Full-screen/embedded player integrating `hls.js` and native HLS, stream source switcher for multi-stream channels, live indicator, volume memory, retry mechanism, and keyboard shortcuts (`Space`, `M`, `F`, `Esc`, `Left/Right arrows`).
  - `frontend/src/utils/player-errors.ts` & `player-errors.test.ts`: Diagnostic engine explaining CORS restrictions, HTTPS mixed-content blocks, and unsupported broadcast codecs, with external player guidance (`vlc "<url>"`).
  - `frontend/src/App.tsx`: Seamless integration with channel cards, favorites, and list rows, fetching full `ChannelDetail` on play and enabling sequential channel navigation.
  - `frontend/vite.config.ts`: Configured Rollup `manualChunks` splitting `hls-vendor` into an isolated chunk to keep the core application bundle lean (<95 kB gzipped) for mobile browsers.
- **Exit criteria:**
  - [x] Test permitted sample streams on desktop/mobile.
  - [x] Failure modes (CORS, mixed content, codecs) explained clearly.
  - [x] Multi-stream channels allow switching between alternative sources.
  - [x] Zero video proxying through the backend.
  - [x] 76/76 automated tests passing across backend and frontend.
  - [x] Clean production build with optimized chunking.

### Phase 9 — Playlist Export
- **Status:** COMPLETE.
- **Completed:**
  - `backend/src/export/m3u-generator.ts`: Pure M3U generator creating valid UTF-8 `#EXTM3U` playlists with `#EXTINF`, TVG tags, channel names, and stream URLs, roundtrip tested with Phase 2 parser.
  - `backend/src/routes/api.ts`: `GET /api/playlists/export.m3u` supporting catalogue, category, country, health status, and comma-separated `channelIds` selections.
  - `frontend/src/components/PlaylistBuilder.tsx`: Interactive playlist export builder with scope selection (Catalogue, Filtered, Favorites), live preview count, download button, and setup guides for VLC, TiviMate, and mpv.
  - `frontend/src/services/api.test.ts`: Automated tests for export URL query string builder.

### Phase 10 — Quality Features
- **Status:** COMPLETE.
- **Completed:**
  - `backend/src/db/schema.ts`: Added `channel_reports` table DDL with indexes.
  - `backend/src/db/repository.ts`: Implemented `createChannelReport`, `listChannelReports`, and `getSourceById` with channel/stream metrics; added `sourceId` filter support to `listChannels`.
  - `backend/src/routes/api.ts`: Added `GET /api/sources/:id`, `POST /api/reports`, and `GET /api/reports`.
  - `backend/src/routes/api.test.ts`: Added tests for source detail retrieval, source filtering, and report creation/listing.
  - `frontend/src/types.ts`: Added `SourceDetail`, `ReportSubmission`, and `sourceId` filter property.
  - `frontend/src/services/api.ts`: Added `fetchSourceById` and `submitReport`.
  - `frontend/src/components/ReportModal.tsx`: Connected live report submission to `submitReport` with loading indicator, error display, and server confirmation message.
  - `frontend/src/components/SourceDetailModal.tsx`: Interactive modal displaying source metrics (indexed channels, active streams, refresh window, approval status), terms, attribution, and sample channels with instant play.
  - `frontend/src/components/AboutView.tsx`: Added "Inspect Source Details" action to approved sources.
  - `frontend/src/components/FilterBar.tsx`: Added active source filter badge with clear button and "Share View" one-click link copy button.
  - `frontend/src/utils/url-state.ts` & `url-state.test.ts`: Pure URL query parser and serializer with roundtrip fidelity and unit tests.
  - `frontend/src/App.tsx`: Synchronized URL query state with `window.history.replaceState`, added browser `popstate` support, wired SourceDetailModal and ReportModal context.
- **Exit criteria:**
  - [x] Broken-link and metadata reporting with persistent database storage.
  - [x] Source detail exploration with provenance metrics.
  - [x] Source-specific directory filtering.
  - [x] 102/102 automated tests passing (72 backend, 30 frontend; 0 failures).
  - [x] Clean backend and frontend production builds.

### Phase 11 — Admin and Recovery
- **Status:** COMPLETE.
- **Completed:**
  - `backend/src/config.ts`: Added `adminToken` and `backupDir` configuration options with Termux-friendly defaults.
  - `backend/src/admin/auth.ts`: Created timing-safe admin bearer token verification middleware (`verifyAdminToken`, `createAdminAuthHook`) guarding all `/api/admin/*` endpoints.
  - `backend/src/admin/recovery.ts`: Implemented `recoverInterruptedJobs` (cleaning up zombie jobs killed during Termux/Android crashes), `createDatabaseBackup` (generating non-blocking atomic SQLite snapshots using `VACUUM INTO`), `listDatabaseBackups`, `getSystemDiagnostics` (runtime memory, uptime, database metrics), and `updateReportStatus`.
  - `backend/src/routes/admin.ts`: Fastify admin plugin exposing `GET /system`, `GET /jobs`, `GET /jobs/:id`, `POST /jobs/:id/cancel`, `POST /sources/:id/refresh` (background ingestion), `POST /health-check/run` (scan budget parameter overrides), `POST /backup`, `GET /backups`, `GET /reports`, and `PATCH /reports/:id`.
  - `backend/src/server.ts`: Automated startup recovery via `recoverInterruptedJobs(db)`, registered admin plugin under `/api/admin`, and configured Pino logger redaction for admin tokens and credentials.
  - `backend/src/routes/admin.test.ts`: 13 comprehensive automated tests covering auth rejection (401), bearer token auth, diagnostics metrics, restart recovery, job listing/cancellation, scan budgets, manual refresh, atomic backup snapshotting, and report status patching.
- **Exit criteria:**
  - [x] Admin routes protected with timing-safe token authentication.
  - [x] Catalogue recoverable via atomic SQLite `VACUUM INTO` backups.
  - [x] Termux restart recovery cleans up interrupted jobs.
  - [x] Bounded scan budget controls prevent mobile battery/data exhaustion.
  - [x] 115/115 automated tests passing (85 backend, 30 frontend; 0 failures).
  - [x] Clean backend and frontend production builds.

### Phase 12 — Security and Performance Audit
- **Status:** COMPLETE.
- **Completed:**
  - `backend/src/security/headers.ts`: Fastify `onSend` hook enforcing `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`, and defense-in-depth API `Content-Security-Policy`.
  - `backend/src/security/rate-limiter.ts`: Zero-dependency, low-overhead in-memory sliding-window rate limiter with automatic stale IP sweeps to avoid memory leaks on Android Termux. Returns standard `RateLimit-*` and `Retry-After` headers.
  - `backend/src/routes/api.ts`: Attached rate limiting to `POST /reports` (15 req/min per IP) preventing spam.
  - `backend/src/server.ts`: Registered security headers and redacted `x-admin-token` and `authorization` in logs.
  - `backend/src/security/security.test.ts`: 8 comprehensive automated tests covering security headers, rate limit enforcement (429), memory sweep verification, CGNAT (`100.64.0.0/10`), cloud metadata (`169.254.169.254`), and IPv4-mapped IPv6 ranges.
- **Exit criteria:**
  - [x] SSRF and DNS rebinding protections verified across all IP categories.
  - [x] Security headers prevent MIME sniffing and framing.
  - [x] Rate limiting defends Termux from resource exhaustion.
  - [x] Zero secrets or admin tokens logged.
  - [x] 123/123 automated tests passing (93 backend, 30 frontend; 0 failures).
### Phase 13 — Deployment and Release
- **Status:** COMPLETE.
- **Completed:**
  - `scripts/termux/install.sh`: Automated Termux onboarding script with Node.js LTS check, directory setup, environment generation, and build steps.
  - `scripts/termux/start.sh`: Termux daemon launcher with `termux-wake-lock`, PID tracking, log redirection, and readiness probe.
  - `scripts/termux/stop.sh`: Graceful shutdown script with SIGTERM/SIGKILL fallback and wake-lock release.
  - `scripts/termux/backup.sh`: Admin-authenticated SQLite backup snapshot runner.
  - `scripts/termux/cron-healthcheck.sh`: Cron job trigger for bounded background health check runs.
  - `DEPLOYMENT.md`: Comprehensive guide for Termux operations, static frontend hosting (Cloudflare Pages, Vercel, Netlify), secure remote access (Cloudflare Tunnel, Tailscale), and disaster recovery.
  - `ATTRIBUTION.md`: Attribution for Free-TV, iptv-org, tools, terms of service, and DMCA/takedown process.
- **Exit criteria:**
  - [x] Reproducible deployment scripts and verified flow.
  - [x] Honest uptime and mobile battery/network caveats documented.
  - [x] Full source attribution and takedown procedures provided.
  - [x] 123/123 automated tests passing.
  - [x] Clean production builds.

## Files Created / Modified in Phase 11, 12 & 13
- `scripts/termux/install.sh`
- `scripts/termux/start.sh`
- `scripts/termux/stop.sh`
- `scripts/termux/backup.sh`
- `scripts/termux/cron-healthcheck.sh`
- `DEPLOYMENT.md`
- `ATTRIBUTION.md`
- `backend/src/security/headers.ts`
- `backend/src/security/rate-limiter.ts`
- `backend/src/security/security.test.ts`
- `backend/src/routes/api.ts`
- `backend/src/server.ts`
- `backend/src/config.ts`
- `.env.example`
- `backend/src/admin/auth.ts`
- `backend/src/admin/recovery.ts`
- `backend/src/routes/admin.ts`
- `backend/src/routes/admin.test.ts`
- `memory.md`

## Verification Commands & Results
- `npm test`: 123/123 tests passed (93 backend tests in ~1.4s, 30 frontend tests in ~250ms; 0 failures).
- `npm --prefix frontend run build`: Clean production bundle built via Vite and TypeScript with code-split `hls-vendor`.
- `npm --prefix backend run build`: Backend TypeScript compiles cleanly.

## Exact next task
Guide user through pushing to their Git remote and running the deployment commands on Android Termux.


