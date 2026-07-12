# Plan — Cute Baby Meditation

Source: `SPEC.md` (requirements) · `DECISIONS.md` (rationale) · `.reference/hrv` (reference implementation).

## Now

**State:** Task 7 (Tags & captions) fully done, all committed on `dev`. This session: caption editing in the item sheet; the sheet became a **staged editor** (draft caption+tags, persist on Save via atomic `updateSource`, discard-confirm on close); tag manager moved into a bottom sheet (`TagManagerSheet`); **bulk select-mode tagging removed entirely** (Select button, `applyToSources`/`createAndAssign`, `applyTagToSources`, strings, tests). New: `useSaveSource`, `useTags.create`. Toolbar is now Import + Edit tags. User-verified live earlier this session. Lint/tests(101)/build green.

**Next:** UI re-anchor to HRV primitives — drift caught in review (hand-rolled UI diverged from HRV: weak centering, flat cards, crude rows; only `PageShell` was ported). Port `SegmentedControl` / `TopAppBar` / `SettingsRow` / `SettingsStepper` / `SectionCard` and rebuild the shell, collection toolbar, and tag surfaces on them, then Session setup.

**Open questions:** none blocking.

**Watch:**
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
- [ ] UI re-anchor to HRV primitives: port the HRV primitive vocabulary (`TopAppBar`, `SegmentedControl`, `SettingsRow`/`SettingsStepper`, `SectionCard`) and rebuild the drifted shell / collection toolbar / tag surfaces on it, retiring hand-rolled equivalents (`ModeToggle`) — centered, carded, HRV-faithful
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
