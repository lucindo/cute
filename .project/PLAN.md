# Plan — Cute Baby Meditation

Source: `SPEC.md` (requirements) · `DECISIONS.md` (rationale) · `.reference/hrv` (reference implementation).

## Now

**State:** Tasks 1–3 done and committed on branch `dev`. Storage foundation live: `cute-db` v1 with five stores (`sources`/`blobs`/`thumbs`/`sessions`/`holdEvents`, keyPath `id`) behind `Result`-typed `openDb`/`getRecord`/`getAllRecords`/`writeMany` (atomic multi-store batches); `requestPersistence()` fired at startup; `Result` in `src/domain/result.ts`; storage tests use injected `fake-indexeddb` factories. No `holdEvents` indexes (stats read all events; adding one later is a version bump). Lint/tests(30)/build green.

**Next:** Task 4 — image import: picker, drag-drop, paste → re-encoded (≤2000px) sources with thumbnails, untagged, visible in grid; animated GIF/WebP stored as-is; per-file rejection with hint, batch survives.

**Open questions:** none blocking.

**Watch:**
- PT-BR copy pending native-speaker review before release (SPEC OQ-1); swipe slop threshold to tune on device (SPEC OQ-2).
- `.gitignore` ignores `CLAUDE.md`/`AGENTS.md` per HRV convention — user hasn't confirmed; flag before first push.
- `PROJECT.md` repo map is slightly behind (src/domain|storage|hooks|content|components now exist with real code) — re-run `/ds-project-map` after the storage layer lands.

## Roadmap

- [x] Scaffold: repo builds, tests, lints with HRV toolchain (strict tsconfig, Vite, Tailwind, Vitest, ESLint); empty app renders with Mono Zen light/dark theme
- [x] App shell: Practice/Collection switcher routes between placeholder screens; EN/PT-BR strings infra wired
- [x] Storage foundation: IndexedDB stores (sources, blobs, thumbs, sessions, hold events) behind typed Result wrappers; `cute:`-prefixed localStorage prefs with HRV key-collision audit; `storage.persist()` requested on first run
- [ ] Image import: picker, drag-drop, and paste produce re-encoded (≤2000px) sources with thumbnails, untagged, visible in grid; animated GIF/WebP stored as-is; per-file rejection with hint, batch survives
- [ ] Video import: probe validates decodability, poster frame becomes thumbnail, bytes stored as-is; undecodable rejected with format hint
- [ ] Collection grid: thumbnail-only rendering, per-source file size, storage gauge, delete with confirmation leaves tombstone and preserves hold events
- [ ] Tags & captions: seeded tag list, create/rename/delete, multi-select assign/remove on sources, optional caption editing
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
