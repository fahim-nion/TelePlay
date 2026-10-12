# TelePlay — Feasibility, Source Review & Technical Validation (Phase 0)

**Document Status:** Complete Phase 0 Feasibility Analysis  
**Date:** 2026-10-13  
**Authors:** TelePlay Architecture & Research Team  

---

## 1. Executive Summary

This feasibility study evaluates the architectural foundation, data sources, legal and attribution baselines, mobile runtime constraints (Android Termux), browser playback realities, and security mechanisms for **TelePlay** — a public IPTV discovery directory and browser player.

TelePlay is designed as a hybrid platform:
1. **Frontend:** A responsive, accessible, static-hostable web application (React + TypeScript + Vite) offering search, filtering, player UI, favorites, and playlist generation.
2. **Backend:** A lightweight, resource-conscious service running on Android via **Termux** (Node.js + TypeScript + SQLite), executing safe playlist ingestion, bounded channel health checks, and serving a read-only metadata API and M3U exports.
3. **Player Model:** Direct client-to-source streaming. TelePlay does **not** proxy video stream payloads through the phone, preserving mobile bandwidth, battery, and legal safety.

All 9 candidate references from the project requirements have been thoroughly investigated and classified. Initial source endpoints have been verified with live HTTP probes, confirming active M3U8 multi-variant streams and highlighting real-world failure modes (such as 200 OK master manifests containing 404 variant playlists).

---

## 2. Source-by-Source Findings

The nine candidate references from `PRD.md` and `phases.md` have been evaluated across operational roles, endpoint availability, licensing, attribution, metadata quality, scraping risk, and adapter requirements.

### Reference 1: `Free-TV/IPTV`
- **URL:** `https://github.com/free-tv/iptv`
- **Role:** Curated Playlist Provider (Git repository publishing maintained M3U/M3U8 playlists).
- **Publishes Real M3U/M3U8 File:** **Yes**. Main global playlist at `playlist.m3u8` and country-specific lists under `lists/*.md`.
- **Exact Usable Endpoint:** 
  `https://raw.githubusercontent.com/Free-TV/IPTV/master/playlist.m3u8`
- **License & Terms:** No formal `LICENSE` file in the root. Project ethos is strict: Free-To-Air (FTA), official streams only, zero piracy, no paid TV, no adult or political party channels. Links are maintained via community pull requests and honor takedown requests.
- **Scraping Required:** **No**. Direct raw text fetch from GitHub.
- **Metadata Quality:** **High**. Entries contain `#EXTINF:-1 tvg-name="..." tvg-logo="..." tvg-id="..." tvg-country="..." group-title="..."`.
- **Update Frequency & Reliability:** Regularly updated by maintainers; cleaner and lower dead-link ratio than mass scrapers.
- **Adapter Required:** **Yes**. Must parse extended TVG tags and classify URLs (notably, some entries link to YouTube/Twitch live web pages marked with `Ⓨ` and `Ⓣ`, which require protocol classification).
- **Status:** **APPROVED FOR INITIAL SOURCE SET**.

### Reference 2: `iptv-org`
- **URL:** `https://iptv-org.github.io/` / `https://github.com/iptv-org/iptv`
- **Role:** Global IPTV Directory & Open-Source Aggregator (~30,000+ channels).
- **Publishes Real M3U/M3U8 File:** **Yes**. Publishes global indices and granular partitioned playlists via GitHub Pages CDN.
- **Exact Usable Endpoints:**
  - Global Index: `https://iptv-org.github.io/iptv/index.m3u` (Note: ~30,000 entries; too large for initial Termux import).
  - By Category: `https://iptv-org.github.io/iptv/categories/{category}.m3u` (e.g., `news.m3u`, `sports.m3u`, `movies.m3u`, `animation.m3u`).
  - By Country: `https://iptv-org.github.io/iptv/countries/{code}.m3u` (e.g., `us.m3u`, `uk.m3u`, `ca.m3u`).
- **License & Terms:** **The Unlicense** (Dedicated to the Public Domain). Clear DMCA/takedown process in repository.
- **Scraping Required:** **No**. Documented, static CDN-hosted `.m3u` files.
- **Metadata Quality:** **Very High**. Standardized `tvg-id`, `tvg-logo`, `group-title`, resolution labels (e.g. `(1080p)`), and language/country codes.
- **Update Frequency & Reliability:** Automated daily GitHub Actions link checking. Variable stream uptime across the full 30k list, but partitioned feeds allow targeted ingestion.
- **Adapter Required:** **Yes**. Standard M3U parser adapter with source-level tag mapping.
- **Status:** **APPROVED FOR INITIAL SOURCE SET** (restricted to specific curated categories/countries, e.g. `categories/news.m3u`, to respect Termux resources).

### Reference 3: `M3Unator`
- **URL:** `https://github.com/hasanbeder/M3Unator`
- **Role:** Tool / Userscript. Scans open web server directories (Apache, Nginx, IIS) and exports file playlists.
- **Publishes Real M3U/M3U8 File:** **No**.
- **License:** GPL-3.0.
- **Scraping Required:** N/A (client-side script).
- **Verdict:** **Tool / Reference Only**. Not a television playlist source. Valuable reference for M3U playlist generation, UTF-8 BOM formatting, and duplicate filtering logic.

### Reference 4: `awesome-iptv`
- **URL:** `https://github.com/iptv-org/awesome-iptv`
- **Role:** Curated Directory / List of Links pointing to IPTV resources, players, and GitHub discussions.
- **Publishes Real M3U/M3U8 File:** **No**.
- **License:** CC0 / Public Domain.
- **Verdict:** **Directory Reference Only**. Not a direct channel data source.

### Reference 5: `FMHY (FreeMediaHeckYeah) IPTV Playlists`
- **URL:** `https://rentry.co/FMHYB64#iptv-playlists` (redirects to `https://rentry.co/IPTV-Playlists`)
- **Role:** Aggregation Directory / Link Index pointing to various public and gray-market pastebins, Discord servers, and third-party IPTV aggregators.
- **Publishes Real M3U/M3U8 File:** **No direct hosted playlist**. Links to ephemeral pastebins and aggregators (eja.tv, iptvcat, etc.).
- **License & Terms:** Community compilation; unverified licensing; high proportion of unauthorized subscription streams, pirate rebroadcasts, and broken links.
- **Verdict:** **REJECTED AS AN AUTOMATED SOURCE**. Using FMHY links directly introduces severe legal risk, dead-link volatility, and lack of provenance.

### Reference 6: `StreamCheck`
- **URL:** `https://search.streamcheck.pro/`
- **Role:** Closed Search Service / Web Index for commercial and private IPTV servers and channels.
- **Publishes Real M3U/M3U8 File:** **No**.
- **Terms & Automated Access:** Proprietary web service protected by Cloudflare and client-side session beacons. Automated scraping is prohibited.
- **Verdict:** **REJECTED AS A SOURCE**. TelePlay must not scrape closed web search portals.

### Reference 7: `PlaylistEditorTV`
- **URL:** `https://codeberg.org/Isayso/PlaylistEditorTV`
- **Role:** Software Application (Windows desktop playlist editor/player with Kodi integration).
- **Publishes Real M3U/M3U8 File:** **No**.
- **Verdict:** **Software Reference Only**. Useful reference for desktop IPTV player UX and playlist editing features.

### Reference 8: `IPTV Community`
- **URL:** `https://iptv.community/`
- **Role:** Web Discussion Forum & Commercial Reseller Portal.
- **Publishes Real M3U/M3U8 File:** **No**.
- **Terms & Automated Access:** Standard XenForo forum requiring registration and login. Scraping is prohibited by forum rules and would yield unstructured user chat.
- **Verdict:** **REJECTED AS A SOURCE**.

### Reference 9: `N_m3u8DL-RE`
- **URL:** `https://github.com/nilaoda/N_m3u8DL-RE`
- **Role:** CLI Stream Downloader (DASH/HLS/MSS video downloader and decrypter).
- **Publishes Real M3U/M3U8 File:** **No**.
- **Verdict:** **Downloader Reference Only**. Must **NOT** be used as the health checker. Downloading whole streams or media segments violates TelePlay's non-goals and would rapidly deplete phone memory, storage, and battery.

---

## 3. Summary of Source Selection & Initial Set

| Candidate Source | Category | Endpoint Available? | License / Terms | Decision | Role in TelePlay |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Free-TV/IPTV** | Curated Playlist | `playlist.m3u8` | FTA / Community Policy | **Approved** | Primary curated source for high-quality FTA channels |
| **iptv-org** (news) | Categorized Playlist | `categories/news.m3u` | Unlicense (Public Domain) | **Approved** | Seed source for international news channels |
| **M3Unator** | Tool / Userscript | None | GPL-3.0 | **Reference** | Architectural reference for M3U export & dedup |
| **awesome-iptv** | Directory | None | CC0 | **Reference** | Community link index |
| **FMHY** | Link Aggregator | Third-party links | Unlicensed / Gray | **Rejected** | Discovery leads only; no automated ingestion |
| **StreamCheck** | Search Engine | None | Proprietary / Cloudflare | **Rejected** | Closed service; scraping prohibited |
| **PlaylistEditorTV**| Desktop App | None | Open Source | **Reference** | Player & playlist UX reference |
| **IPTV Community** | Web Forum | None | Forum Terms | **Rejected** | Community discussion; no playlist feeds |
| **N_m3u8DL-RE** | Media Downloader | None | Open Source | **Reference** | Protocol reference; forbidden for routine health checks |

---

## 4. Technical Validation & Live Probing Evidence

Live network probes were conducted on sample channel endpoints extracted from approved sources to test assumptions about HTTP responses, HLS structure, and browser compatibility.

### Live Probe 1: Multi-Variant Manifest vs Variant Playback
- **Stream:** 2GB Radio/TV (`https://2gblive.akamaized.net/hls/live/2033805/2GB/index.m3u8`)
- **Master Manifest Result:** HTTP 200 OK.
  - Returned valid `#EXTM3U` with 6 stream variants (1080p, 720p, 360p).
  - Codecs: `avc1.4d4028,mp4a.40.2` (H.264 AVC + AAC Audio).
- **Sub-variant Probe:** Tested `https://2gblive.akamaized.net/hls/live/2033805/2GB/2GB720P/chunklist.m3u8`.
- **Result:** **HTTP 404 Not Found**.
- **Critical Architectural Insight [VERIFIED]:**
  > An HTTP 200 on an M3U8 master playlist **does not prove stream playability**. If the variant playlist or segments have expired, rotated, or failed upstream, the player fails immediately. A health check that only issues a shallow HTTP `HEAD` or top-level `GET` on the master URL produces false positives.

### Live Probe 2: Fully Working Live HLS Stream
- **Stream:** 3CatInfo (`https://directes-tv-int.3catdirectes.cat/live-origin/canal324-hls/master.m3u8`)
- **Master Manifest Result:** HTTP 200 OK. Contains variants `bitrate_1.m3u8`, `bitrate_2.m3u8`.
- **Variant Manifest Result:** Probed `bitrate_1.m3u8` — HTTP 200 OK.
  - `#EXT-X-TARGETDURATION:6`
  - Active `#EXT-X-MEDIA-SEQUENCE:298638233`
  - Live `.ts` chunks updating every 6 seconds.
- **Critical Architectural Insight [VERIFIED]:**
  > Inspecting the first child media playlist confirms active media sequences (`#EXT-X-MEDIA-SEQUENCE`) and validates that the stream is actively broadcasting without needing to download the actual multi-megabyte media segment files.

---

## 5. Android Termux Feasibility & Runtime Architecture

### Runtime Environment Analysis
- **Node.js Runtime [VERIFIED]:** Node.js v24.19.0 and npm 11.17.0 are installed in the user environment.
- **Termux Architecture & Constraints:**
  - Android uses the **Bionic libc** rather than glibc. Native C++ add-ons requiring `node-gyp` (such as `better-sqlite3`) frequently suffer from compilation failures, missing build headers (`python`, `clang`, `make`), and architecture mismatch on Android devices.
- **Database Engine Breakthrough [VERIFIED]:**
  - Node.js v22.5+ introduces the built-in **`node:sqlite`** module (`DatabaseSync`, `StatementSync`, `backup`).
  - Tested live in the environment: `const sqlite = require("node:sqlite");` executed synchronous table creation, parameterized insertion, and retrieval with zero external dependencies.
  - **Decision:** TelePlay backend will use `node:sqlite` as its primary SQLite driver when running on Node 22+. This eliminates native compilation failures in Termux, reduces memory overhead, and requires zero npm native build steps. A modular repository interface will allow fallback to `sqlite3` or `better-sqlite3` on systems where desired.

### Framework Selection: Fastify vs Express
- **Express:** Well-understood, but higher per-request memory allocation, unmaintained async pipeline, and larger dependency tree.
- **Fastify [RECOMMENDED]:**
  - Up to 2-3x lower request overhead and significantly smaller memory footprint.
  - Native TypeScript support with built-in JSON schema validation (via Ajv) and serialization (via fast-json-stringify).
  - Built-in logging (Pino) supporting bounded in-memory or log-file rotation.
  - Highly suitable for Termux's constrained CPU and RAM.

### Android Resource Constraints & Mitigations
1. **Process Termination (Android Phantom Process Killer / OOM):**
   - Android will kill background Termux processes if CPU/memory spikes or the phone enters deep sleep (Doze mode).
   - *Mitigation:* Ingestion and health-check jobs must use **persistent transactional checkpoints** in SQLite. A restarted process will resume from the last completed channel index without re-running from scratch.
2. **Thermal & Battery Limits:**
   - Long-running continuous loops will drain the battery and cause thermal CPU throttling.
   - *Mitigation:* Health checks must run in small, bounded batches (e.g. 20 channels every 15 minutes) rather than scanning all 5,000 channels simultaneously. Global concurrency will be capped at 5, and per-host concurrency at 1.
3. **Bandwidth & Data Caps:**
   - Probing media streams on mobile data can consume gigabytes if unconstrained.
   - *Mitigation:* Strict byte limits (max 64KB for manifests), strict timeouts (5 seconds), and `HEAD` + bounded range `GET`. No segment downloads during routine health scans.
4. **Remote Access to Termux Backend:**
   - Mobile carriers use Carrier-Grade NAT (CGNAT); phones do not have public IPv4 addresses.
   - *Mitigation:* To connect a separately deployed static frontend (e.g., hosted on GitHub Pages or Vercel) to the Termux backend, the backend should expose its API via a secure reverse tunnel:
     - Option A: **Cloudflare Tunnel (`cloudflared`)** — zero open ports, free SSL, DDoS protection.
     - Option B: **Tailscale / WireGuard** — private mesh VPN (for personal use).
     - Option C: Local network WiFi access (e.g., `http://192.168.1.X:3000`) for home usage.

---

## 6. Browser Playback Feasibility & Limitations

Direct client-side playback in web browsers is subject to fundamental browser security models:

### 1. Cross-Origin Resource Sharing (CORS) [VERIFIED LIMITATION]
- When a web page at `https://teleplay.example.com` plays an HLS stream via `fetch` or `XMLHttpRequest` in `hls.js`, the stream server must return the HTTP header:
  `Access-Control-Allow-Origin: *` (or matching origin).
- If the stream origin omits CORS headers, the browser's security sandbox **blocks `hls.js` from reading the manifest or segments**.
- *Safari Exception:* Safari on iOS and macOS supports native HLS playback via `<video src="...">`. Native `<video>` tags are not subject to CORS restrictions for playback, meaning some streams will play in Safari that fail in Chrome/Firefox.

### 2. Mixed Content Policy (HTTPS vs HTTP) [VERIFIED LIMITATION]
- If TelePlay's frontend is deployed over `https://`, modern browsers strictly block plain `http://` stream URLs as Mixed Active Content.
- *Mitigation:* 
  - TelePlay will flag stream protocol (`https:` vs `http:`) in the UI.
  - When hosted on HTTPS, HTTP streams will display an advisory banner: *"This stream uses unencrypted HTTP and cannot be played directly on an HTTPS site. Click 'Open in External Player' or copy the link into VLC."*

### 3. Codec Compatibility
- Browsers natively decode H.264 (AVC) and AAC/MP3 audio.
- Streams encoded with MPEG-2 Video, HEVC/H.265 (without hardware decode flags), or AC-3/E-AC-3 (Dolby) audio will fail or play without sound in standard browsers.
- *Mitigation:* TelePlay player UI will provide clear error diagnostic messaging and a 1-click "Copy URL" button for external players (VLC, mpv, PotPlayer, Tivimate).

### 4. Non-Proxy Principle
- TelePlay **will not proxy video streams** through the Termux backend to circumvent CORS. Proxying video bytes would immediately saturate phone bandwidth, overheat the device, crash the Termux Node process, and create copyright redistribution liability.

---

## 7. Bounded Health-Check Strategy & SSRF Protection

### Health Status Definitions
- `working`: Master and variant manifests were reachable and returned valid HLS metadata within freshness window.
- `intermittent`: Mixed results across recent check attempts.
- `unreachable`: Connection refused, DNS failure, 404/410/500 HTTP status, or timed out.
- `unsupported`: Stream format is not HLS/HTTP, or requires external web platform (e.g. YouTube/Twitch).
- `stale`: Last successful check occurred outside the freshness window (e.g. > 24 hours ago).
- `not_checked`: Newly imported channel awaiting initial probe.

### Health-Check Execution Engine
- **Method:** Bounded HTTP GET with strict `Range: bytes=0-65535` or stream abort on reaching 64KB. (Many CDNs reject `HEAD` requests or return 405 Method Not Allowed).
- **Timeouts:** 5,000 ms connect/read timeout.
- **Concurrency:**
  - Global max concurrency: 5 requests.
  - Per-host max concurrency: 1 request (preventing hammering of any single broadcaster).
  - Respect `Retry-After` headers and apply exponential backoff on 429 / 503 responses.
- **HLS Deep Check (Optional Stage):**
  - If the master manifest contains `#EXT-X-STREAM-INF`, fetch the first child playlist URL.
  - Verify that the child playlist contains `#EXT-X-TARGETDURATION` or `#EXTINF`.
  - Abort immediately without fetching video segment chunks (`.ts` / `.m4s`).

### Server-Side Request Forgery (SSRF) Defenses [CRITICAL]
Because the backend fetches URLs from imported playlists, malicious or compromised playlists could point to private network addresses or internal endpoints.
1. **Protocol Restriction:** Allow only `http:` and `https:`. Reject `file:`, `ftp:`, `gopher:`, `javascript:`, etc.
2. **DNS Resolution Inspection:** Before connecting, resolve hostnames via `dns.lookup`. Verify the resolved IP does **not** fall within:
   - Loopback: `127.0.0.0/8`, `::1`
   - Private IP ranges: `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`
   - Link-local: `169.254.0.0/16`, `fe80::/10`
   - Cloud metadata services: `169.254.169.254`
3. **Redirect Protection:** Disable automated HTTP client redirect following. Inspect each `Location` header, re-resolve DNS for the redirect target, re-verify SSRF IP safety, and cap redirect hops at 3.
4. **No Arbitrary Public Probing:** The backend will never expose a public API endpoint allowing unauthenticated users to submit arbitrary URLs for the backend to probe.

---

## 8. Proposed Architectural Stack

| Layer | Component | Choice | Rationale |
| :--- | :--- | :--- | :--- |
| **Backend Runtime** | Environment | Node.js v24 (or v22 LTS) + TypeScript | Modern ECMAScript features, active Termux support. |
| **Backend Framework**| HTTP Server | Fastify | Minimal memory footprint, high performance, schema validation. |
| **Database** | Database Engine | SQLite via `node:sqlite` (Node 22+) | Zero external native compilation in Termux; rock-solid reliability. |
| **Data Access** | Query Layer | Typed SQL queries with transactions | Lightweight, predictable, no ORM bloat on mobile hardware. |
| **Task Queue** | Background Jobs | Transactional SQLite Job Queue | Resumable across phone restarts and app terminations. |
| **Frontend** | UI Framework | React 19 + TypeScript + Vite | Fast build, static hosting compatible, strong component ecosystem. |
| **Styling** | CSS / Layout | Tailwind CSS | Utility-first, responsive, zero runtime overhead. |
| **Player** | Media Player | Native HLS + `hls.js` | Full browser coverage (native Safari, MSE for Chrome/Firefox/Edge). |
| **Icons** | UI Elements | Lucide React | Lightweight, tree-shakeable icons. |

---

## 9. Assumptions, Verifications & Unresolved Questions

### Verified Facts
- [x] Node.js v24 is active in the environment with native `node:sqlite` support.
- [x] Free-TV publishes clean, raw M3U8 files with high-quality metadata at `https://raw.githubusercontent.com/Free-TV/IPTV/master/playlist.m3u8`.
- [x] iptv-org publishes partitioned category files (e.g. `categories/news.m3u`) under the Unlicense.
- [x] M3Unator, PlaylistEditorTV, and N_m3u8DL-RE are tools/downloaders, not playlist feeds.
- [x] StreamCheck, FMHY, and IPTV Community are not suitable as automated channel sources.
- [x] HLS master manifests can return 200 OK while their variant media playlists return 404, validating the need for multi-tier health verification.

### Documented Assumptions
- *Assumption:* The Termux environment will run on Node 22 or newer to utilize built-in `node:sqlite`. If an older Node LTS is used, `better-sqlite3` or `sqlite3` can be swapped via an abstracted database interface.
- *Assumption:* Initial import volume will be bounded to < 1,500 channels (Free-TV global + iptv-org news) to prevent database or memory saturation on Android.

### Unresolved Questions for User Alignment
1. **Remote Connectivity:** Will the Termux phone be accessed only on the local home WiFi network, or will a Cloudflare Tunnel / Tailscale setup be used for public Internet access?
2. **Channel Freshness Policy:** What is the desired scan frequency for Termux (e.g., check 20 channels every 15 minutes, or on-demand background sweeps during night hours when the phone is charging)?

---

## 10. Phase 0 Exit Recommendation

Phase 0 requirements and exit criteria from `phases.md` have been fulfilled:
- All 9 candidate references investigated and classified.
- Usable endpoints identified and verified with live probes.
- Terms, licensing, and attribution rules documented.
- Termux runtime, `node:sqlite`, and Fastify architecture validated.
- Browser playback limits, CORS reality, and non-proxy policy established.
- SSRF defenses and bounded health-check engine designed.
- Unresolved questions and assumptions explicitly labelled.

TelePlay is ready to proceed to **Phase 1 — Project Foundation** upon user review and approval.

