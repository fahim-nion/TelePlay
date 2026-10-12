# TelePlay — Project Memory

Update this file after every meaningful task. It is the handoff source for the next session.

## Current state
- **Project:** TelePlay
- **Current phase:** PHASE 8 — Browser Player (COMPLETE; Ready for Phase 9)
- **Status:** Complete browser player implemented and verified. Integrates HLS.js for Chromium/Firefox and native HLS for Safari/iOS WebKit, alternative multi-stream switcher, volume/mute persistence, fullscreen, responsive 16:9 viewport, keyboard shortcuts, honest failure diagnostics (CORS, mixed-content, codec), and external player guidance (VLC, mpv CLI commands). 76/76 automated tests passing across backend and frontend, and production bundle builds cleanly with optimized vendor code-splitting.
- **Current task:** Report Phase 8 completion and await user review/approval to begin Phase 9 (Playlist Export).
- **Last updated:** 2026-10-13

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
- **Database Schema:** Tables `sources`, `channels`, `channel_sources`, `health_checks`, `jobs` with WAL mode and foreign key enforcement.
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
- **Status:** Pending user confirmation.
- **Planned:** Implement valid UTF-8 M3U generation on backend (`GET /api/playlists/export.m3u` supporting catalogue, filtered subsets, and selected channels) with frontend download and copy buttons, plus clear external player validation.

## Files Created / Modified in Phase 8
- `frontend/src/components/PlayerView.tsx`
- `frontend/src/utils/player-errors.ts`
- `frontend/src/utils/player-errors.test.ts`
- `frontend/src/App.tsx`
- `frontend/vite.config.ts`
- `memory.md`

## Verification Commands & Results
- `npm test`: 76/76 tests passed (58 backend tests in 3.9s, 18 frontend tests in 640ms; 0 failures).
- `npm --prefix frontend run build`: Clean production bundle built via Vite and TypeScript with code-split `hls-vendor`.
- `npm --prefix backend run build`: Backend TypeScript compiles cleanly.

## Exact next task
Await user confirmation, then start **PHASE 9 — Playlist Export**: Implement valid UTF-8 M3U export generation on the backend (`GET /api/playlists/export.m3u` supporting filtered and selected channels) and frontend export/download controls adhering to `Design.md`.

