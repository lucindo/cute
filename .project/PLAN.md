# Plan — Cute Baby Meditation

Source: `SPEC.md` (requirements) · `DECISIONS.md` (rationale) · `.reference/hrv` (reference implementation).

## Now

**State:** Task 7 done except captions, all committed on `dev`: db v3 (`tags` store seeded in the upgrade; media stored as ArrayBuffer+type after the WebKit blob bug), tag ops + `useTags`, per-item bottom sheet (`SourceSheet` on the shared `Sheet` primitive) for tag/delete actions, Select mode for bulk assign, `TagManager` rename/delete. Import fixed twice for phones (uuid fallback on insecure origins; bytes-not-blobs) — user-verified working on a real iPhone (2026-07-12). Lint/tests(94)/build green.

**Next:** Task 7 final slice — caption editing in the item sheet (field under the preview → source record → feeds thumbnail alt).

**Open questions:** none blocking.

**Watch:**
- PT-BR copy pending native-speaker review before release (SPEC OQ-1) — now also tag/selection strings ("tag" anglicism, "N selecionados" plural, seeded names Bebês/Gatinhos/Filhotes/Família/Bhakti); swipe slop threshold to tune on device (SPEC OQ-2).
- iOS video probe: `probeVideo` waits for `loadeddata` with no timeout — untested on a real iPhone; if a video import hangs there, add a play-nudge + timeout.
- DB v3 upgrade clears pre-release media stores — existing dev collections come up empty once; tags/renames survive.
- `PROJECT.md` map stale again (Sheet/SourceSheet/TagAssignPanel/TagManager components, useTags hook, domain `tags.ts`/`id.ts`, storage `tags.ts`) — run `/ds-project-map`.
- SPEC stale on two points: FR-19 (`estimate()` for usage) and media payloads now bytes, not Blobs (see DECISIONS).
- `.gitignore` ignores `CLAUDE.md`/`AGENTS.md` per HRV convention — user hasn't confirmed; flag before first push. Project verify skill lives untracked at `.claude/skills/verify/SKILL.md` (`.claude/` is gitignored).

## Roadmap

- [x] Scaffold: repo builds, tests, lints with HRV toolchain (strict tsconfig, Vite, Tailwind, Vitest, ESLint); empty app renders with Mono Zen light/dark theme
- [x] App shell: Practice/Collection switcher routes between placeholder screens; EN/PT-BR strings infra wired
- [x] Storage foundation: IndexedDB stores (sources, blobs, thumbs, sessions, hold events) behind typed Result wrappers; `cute:`-prefixed localStorage prefs with HRV key-collision audit; `storage.persist()` requested on first run
- [x] Image import: picker, drag-drop, and paste produce re-encoded (≤2000px) sources with thumbnails, untagged, visible in grid; animated GIF/WebP stored as-is; per-file rejection with hint, batch survives
- [x] Video import: probe validates decodability, poster frame becomes thumbnail, bytes stored as-is; undecodable rejected with format hint
- [x] Collection grid: thumbnail-only rendering, per-source file size, storage gauge, delete with confirmation leaves tombstone and preserves hold events
- [~] Tags & captions: seeded tag list, create/rename/delete, multi-select assign/remove on sources, optional caption editing — done except caption editing
- [ ] Session setup: duration stepper (1–30, default 5, persisted), tag filter, start blocked on empty pool with Collection guidance
- [ ] Session domain logic (pure, unit-tested): shuffle-bag order with no boundary repeat, wall-clock timer, overtime, hold-event recording, back/forward history
- [ ] Session surface: CSS full-viewport takeover, media display, gesture grammar — hold ≥300ms records, tap toggles overlay, swipe navigates; keyboard map (Space/←/→/Esc/O)
- [ ] Session overlay: countdown + overtime, clock, stop-with-confirm, subtle hold indicator, legible over arbitrary media
- [ ] Session video playback: single persistent element, autoplay + loop, sound toggle (default on), unmuted first play works on iOS
- [ ] Session lifecycle edges: timer expiry mid-hold waits for release with overtime; backgrounding truncates hold and resumes on wall clock; stop saves endReason `stopped`; wake lock held (progressive)
- [ ] Completion screen: duration incl. overtime, hold count, total held time, longest hold
- [ ] Aww factor: Collection sorts by lifetime total hold time; cards show hold count + total time
- [ ] Stats page: lifetime totals (sessions, practice time, held time, longest hold) + recent-sessions list
- [ ] Backup: zip export of full state; restore validates manifest, confirms, replaces; corrupt zip aborts untouched
- [ ] Learn/About: practice explanation, three video links, book credit, background-music note; PT-BR complete incl. seeded tags
- [ ] PWA: offline after first load, installable, zero non-asset network requests
- [ ] Performance pass: 500-source library meets ≤100ms interaction / ≤300ms transition targets
- [ ] README (privacy-first framing) + LICENSE
- [ ] Ship: Pages multi-version deploy live at `lucindo.github.io/cute`; Pake desktop builds via `desktop.yml`
