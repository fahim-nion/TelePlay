# TeliPlay — Development Rules

1. **Read first:** Read all six planning files, starting with `memory.md`. User-edited docs are authoritative.
2. **Follow phases:** Work only on the phase/task recorded in `memory.md`. Do not skip phases.
3. **Inspect before changing:** Read current files and git status; preserve working code and user changes.
4. **Minimal changes:** Only implement requested/current-phase work. Avoid unrelated refactors and unnecessary dependencies.
5. **One code file at a time:** For each file give exact path, CREATE/MODIFY, purpose, complete contents, and verification. No `...` or “rest of code” placeholders. Wait for confirmation before the next code file unless the user explicitly approves a batch.
6. **Source terms:** Publicly reachable does not mean licensed for redistribution. Check license, terms, attribution, automated-use rules, and takedown process before enabling a source. Do not bypass DRM, paywalls, authentication, geo-controls, or access restrictions.
7. **Provenance:** Keep source attribution for every channel. Treat M3Unator, PlaylistEditorTV, awesome-iptv, FMHY, StreamCheck, IPTV Community, and N_m3u8DL-RE as references/tools, not automatically approved feeds.
8. **Bounded health checks:** Never download full videos to test them. Use timeouts, max bytes, limited concurrency, per-host limits, backoff, and `Retry-After`. Prevent SSRF, private IP targets, redirect abuse, and arbitrary public URL probing.
9. **Honest status:** HTTP 200 does not guarantee playback. Show timestamp/freshness and distinguish reachable, likely playable, browser-playable, and stale.
10. **Security:** Never commit API/tunnel/admin tokens or private config. Escape untrusted metadata; validate URLs/redirects/logos; protect admin routes; redact secrets.
11. **Termux constraints:** Test on the actual device; avoid Docker assumptions and heavyweight services; bound CPU/RAM/battery/bandwidth; make jobs resumable and document backup/recovery.
12. **Tests:** Never claim tests passed unless run and inspected. Report each item as `Implemented and tested`, `Implemented, not fully verified`, `Blocked`, or `Pending`.
13. **Memory:** After meaningful work, update `memory.md` with phase/task, files changed, decisions, actual tests/results, known risks, and exact next task.
14. **Communication format:**

```text
Current Phase:
PHASE X — ...

Task:
...

Result:
...

Verification:
...

Known Issues:
...

Next:
...
```

Ask only for genuine product decisions, credentials, destructive-action confirmation, or essential missing information. Otherwise proceed within the current phase.
