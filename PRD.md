# TeliPlay — Product Requirements

**Status:** Planning baseline; validate assumptions in Phase 0.

## Vision
TeliPlay is a public IPTV discovery directory and browser player. It aggregates approved public M3U/M3U8 sources, checks links conservatively, organizes channels, and lets visitors play supported streams, copy individual stream URLs, or export playlists.

## Goals
- Import and parse public M3U/M3U8 playlists from approved sources.
- Show channel name, category, country/language when known, source attribution, health status, and last-check time.
- Search/filter channels; browse categories and regions.
- Play browser-compatible streams; explain when codecs, CORS, or source behavior prevent playback.
- Copy a single stream URL or download/copy a generated M3U playlist.
- Run the backend on Android Termux with bounded CPU, memory, bandwidth, and battery use.
- Keep source provenance and make storage/data components replaceable.

## Candidate references
- https://github.com/free-tv/iptv
- https://iptv-org.github.io/
- https://github.com/hasanbeder/M3Unator
- https://github.com/iptv-org/awesome-iptv
- https://rentry.co/FMHYB64#iptv-playlists
- https://search.streamcheck.pro/
- https://codeberg.org/Isayso/PlaylistEditorTV
- https://iptv.community/
- https://github.com/nilaoda/N_m3u8DL-RE/blob/main/README.en.md

These are research leads, not blanket permission to scrape or redistribute their content. Confirm each project's role, active endpoints, terms, licenses, attribution, and automated-use rules before enabling it.

## Main user journeys
1. Search or browse channels by category, country, language, or recent health status.
2. Open a channel page, view provenance and last-check time, then play or copy the link.
3. Select channels/filters and export an M3U playlist or use a hosted playlist URL.
4. Report a broken or inappropriate link.
5. Admin reviews source health, imports, scan jobs, duplicates, and reports.

## Functional requirements
- Source registry with URL, type, license/terms notes, attribution, enabled state, refresh policy, last result.
- M3U parser supports `#EXTM3U`, `#EXTINF`, `tvg-id`, `tvg-name`, `tvg-logo`, `group-title`, Unicode, quoted commas, and malformed-line reporting.
- Store source entries separately from normalized channels to preserve provenance.
- Deduplicate exact URLs; flag uncertain metadata duplicates rather than silently merging regional feeds.
- Health statuses: `working`, `intermittent`, `unreachable`, `unsupported`, `not_checked`, `stale`; always show last checked.
- A successful HTTP response is not proof that playback works. Probe only bounded bytes/manifests; never download a full stream for routine checking.
- HLS player uses native browser support where available and evaluates hls.js for other supported browsers.
- Default playback connects the browser directly to the source; backend must not proxy all video traffic.
- Playlist exports include valid UTF-8 M3U, filtered/selected playlists, and direct URL copy. Hosted playlist tokens, if enabled, must be revocable and rate-limited.
- Responsive UI, favorites/recently watched saved locally in v1, accessible controls, clear empty/error/offline states.
- Protected admin controls for source enablement, scan budget, imports, and manual rechecks.
- Backend jobs resume after restart; logs are bounded and secrets are redacted.

## Non-goals
No hosting/restreaming/recording by default; no DRM/paywall/authentication/geo-control circumvention; no scraping private communities; no guarantee that a public stream is licensed, safe, or permanently available. EPG, accounts, recommendations, and social features are deferred until core flows work.

## Non-functional requirements
- Safe URL validation and SSRF protection including redirects/private IPs.
- Timeouts, response-size limits, per-host/global concurrency, backoff, and rate limits.
- Keep memory bounded; use conditional HTTP requests when available.
- Frontend configurable independently from backend URL.
- Test parser, URL safety, deduplication, health status, export, API limits, and restart recovery.

## Success criteria
A permitted source imports reliably; users can browse/search, play supported streams, copy links, and export valid playlists; status is timestamped and honest; scans are bounded; the Termux process can recover after restart; no secrets are committed; all source/permission assumptions are documented.

## Trust baseline
Publicly reachable does not mean licensed for redistribution. Respect source terms and attribution, do not knowingly publish unauthorized streams, provide reporting/takedown handling, and disable disputed links pending review. This is an engineering baseline, not legal advice.
