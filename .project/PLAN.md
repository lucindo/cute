# Plan — Cute Baby Meditation

Source: `SPEC.md` (requirements) · `DECISIONS.md` (rationale) · `.reference/hrv` (reference implementation).

## Now

**State:** UI re-anchor to HRV primitives **done**, committed on `dev` — retired `ModeToggle` for a full-width `SegmentedControl`; ported `TopAppBar` (header), `SettingsRow` (tag-manager rows), `SettingsStepper`; centered the collection toolbar. Fixed the drift the user flagged (weak centering, flat cards, crude rows). Task 8 (Session setup) started: duration stepper (FR-23) live on the Practice screen, seeded from and persisted to a new `sessionDurationMin` pref via `domain/session.ts` + `useSessionDuration`. Lint/tests(117)/build green. User's own visual pass on the new UI still pending.

**Next:** Task 8 tag filter (FR-24) — a `TagFilter` chip control (multi-select; empty selection = all sources incl. untagged), session-local (not persisted). Then Start + empty-pool guard (FR-25/AC-1).

**Open questions:** none blocking.

**Watch:**
- `PROJECT.md` map stale again — new primitives `SegmentedControl`/`TopAppBar` (in `components/primitives/`), `SettingsRow`/`SettingsStepper` (in `components/`), hook `useSessionDuration`, `domain/session.ts`; `ModeToggle` removed. Run `/ds-project-map`.
- Standing UI rule now recorded (DECISIONS §UI fidelity): port HRV primitives from `.reference/hrv`, don't hand-roll. `SectionCard` not yet ported — deferred until a surface needs it.
- PT-BR copy pending native review (SPEC OQ-1) — now also caption/save/discard strings (Legenda, Salvar, Descartar, Continuar editando, seeded names Bebês/Gatinhos/Filhotes/Família/Bhakti); swipe slop threshold to tune (SPEC OQ-2).
- Nested delete-confirm inside `TagManagerSheet` only lightly verified — jsdom `<dialog>` polyfill can't model the top layer; sanity-check deleting a tag from the manager sheet on device.
- iOS video probe waits for `loadeddata` with no timeout — untested on iPhone; add play-nudge + timeout if a video import hangs.
- DB v3 upgrade clears pre-release media stores — existing dev collections come up empty once; tags/renames survive.
- `.gitignore` ignores `CLAUDE.md`/`AGENTS.md` per HRV convention — unconfirmed; flag before first push. Verify skill untracked at `.claude/skills/verify/SKILL.md` (`.claude/` gitignored).

## Roadmap

- [x] Scaffold: repo builds, tests, lints with HRV toolchain (strict tsconfig, Vite, Tailwind, Vitest, ESLint); empty app renders with Mono Zen light/dark theme
- [x] App shell: Practice/Collection switcher routes between placeholder screens; EN/PT-BR strings infra wired
- [x] Storage foundation: IndexedDB stores (sources, blobs, thumbs, sessions, hold events) behind typed Result wrappers; `cute:`-prefixed localStorage prefs with HRV key-collision audit; `storage.persist()` requested on first run
- [x] Image import: picker, drag-drop, and paste produce re-encoded (≤2000px) sources with thumbnails, untagged, visible in grid; animated GIF/WebP stored as-is; per-file rejection with hint, batch survives
- [x] Video import: probe validates decodability, poster frame becomes thumbnail, bytes stored as-is; undecodable rejected with format hint
- [x] Collection grid: thumbnail-only rendering, per-source file size, storage gauge, delete with confirmation leaves tombstone and preserves hold events
- [x] Tags & captions: seeded tag list, create/rename/delete, per-item tag assign + caption editing in a staged item sheet; tag manager in a sheet. (Bulk multi-select assign dropped — SPEC FR-15, see DECISIONS.)
- [x] UI re-anchor to HRV primitives: ported `SegmentedControl`, `TopAppBar`, `SettingsRow`, `SettingsStepper`; rebuilt shell / collection toolbar / tag rows on them; retired `ModeToggle`. (`SectionCard` deferred until a surface needs it.)
- [~] Session setup: duration stepper done (1–30, default 5, persisted — FR-23); tag filter (FR-24) and empty-pool Start guard (FR-25) remain
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
