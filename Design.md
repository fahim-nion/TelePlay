# TeliPlay — UI/UX Design

## Personality
A fast, clean TV guide—not a cluttered forum. Help visitors find channels, understand recent check status, play where supported, and export links with minimal friction.

## Visual direction
- Dark-first charcoal surfaces, restrained indigo/cyan accent, optional light theme.
- Simple cards, subtle borders, compact metadata, clear text labels with status colors.
- Missing logos use initials/placeholders; avoid heavy animation for low-end phones.
- No autoplay with sound.

## Navigation
- Discover
- Channels
- Categories
- Countries
- Playlist Builder
- Favorites
- About / Sources

Admin controls are hidden from ordinary visitors.

## Homepage
1. Compact header: TeliPlay logo, search, theme toggle, Build Playlist.
2. Search hero: “Find a channel”.
3. Real backend-derived status summary: catalogue size, recently checked, stale/unverified, last refresh.
4. Category tiles with actual counts.
5. Recently verified channels.
6. Source transparency footer and report link.
Never fabricate popularity or counts.

## Channel card
Logo/fallback, channel name, country/language if known, category, status, “Checked X ago”, source count when useful, Play action, copy URL/details actions.

## Browse controls
Search by name/alias; filter category, country, language, health freshness, and protocol; sort by name or recently checked. Support grid/list modes and preserve filters when returning from a channel.

## Player page
Responsive player; channel title/logo/category; source attribution and last-check time; previous/next within current filters; volume/mute/fullscreen/retry; alternative source selector if available. Explain CORS, codec, mixed-content, or source-side failures. Offer copy link and external-player guidance. Never imply a health check proves legality or guaranteed playback.

## Playlist builder
1. Select categories/countries/languages.
2. Select all matching or individual channels.
3. Optional “Recently verified only” with visible freshness threshold.
4. Preview count and note that source URLs may stop working.
5. Copy playlist URL, download `.m3u`, or copy individual links.
6. For unlisted URLs, explain anyone with the link may access it; allow revoke/delete.

## Status labels
- **Working recently:** passed a recent configured check; playback is not guaranteed.
- **Intermittent:** checks have mixed results.
- **Unreachable:** recent checks failed.
- **Not checked:** no current result.
- **Stale:** last result is outside freshness window.
- **Browser limitation:** may be reachable but cannot play in this browser.

Always display last-check time when presenting a health claim.

## Responsive/accessibility
- Mobile: single-column cards, sticky compact search/filter, fullscreen player option.
- Tablet: two-column layout where space allows.
- Desktop: grid/list and optional filter sidebar.
- Keyboard-operable controls, visible focus, accessible contrast, labelled icon buttons, reduced-motion support, comfortable touch targets.
- Use pagination; do not fetch the entire catalogue at once.

## States and microcopy
- Skeleton cards, helpful no-results/clear-filter action, backend-offline banner, stale-catalogue notice.
- Public-facing errors never expose stack traces.
- Search: “Search channels, countries, or categories…”
- Health note: “Checked recently; playback depends on the source and your browser.”
- Playlist note: “TeliPlay exports source URLs; links may change or stop working.”
- Report action: “Report a broken or inappropriate link”.

## Keep v1 focused
Defer accounts, comments, ratings, social feeds, complex recommendations, and heavy animation until browse → play → copy/export is reliable.
