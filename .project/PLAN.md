# Plan — Cute Baby Meditation

Source: `SPEC.md` (requirements) · `DECISIONS.md` (rationale) · `.reference/hrv` (reference implementation).

## Now

**State:** Stats page built and shipped on `dev` (Steps 6–8, 3 commits `9e55aa8`→`d0835f8`). `domain/stats.aggregateStats(sessions, holds, limit)` routes every per-session number through `sessionMachine.summarize` (the completion-screen function) so totals match the event log by construction (AC-23); `useStats` loads the full session + hold log once (static snapshot, no change subscription) and aggregates at limit 10. `StatsScreen` renders lifetime totals (sessions, practice time, total held via new `formatTotalDuration`; longest hold via `formatDuration`) + newest-first recent list (date, duration, `♥ holds`, end reason), with loading/error/empty states. Reached via a Statistics nav row in `SettingsScreen`; `App` routes `view='stats'` and passes the active `locale`. Lint / 186 tests / build green. This closes the whole Stats roadmap item AND the Settings surface (the Statistics row was its last remaining piece).

**Next:** **Backup (Steps 1–6 below)** — zip export/restore via `fflate` (first runtime dep beyond the react/inter cap; already approved in DECISIONS). Format is fixed by SPEC §Interfaces line 126: a single `.zip` = `manifest.json` (schema-versioned: sources incl. tombstones, tags, sessions, holdEvents) + `media/<id>.<ext>` + `thumbs/<id>.<ext>`. Prefs/localStorage are **not** in the backup (device-local; AC-9 checks only collection/tags/sessions/events/stats). Restore validates the manifest *before* touching any store and aborts untouched on invalid (FR-22/AC-10); replace-all is atomic. Steps:
1. Add `fflate` dep → verify: `npm i fflate`, builds, bundle delta sane (~8KB).
2. `domain/backup.ts` — pure manifest schema (`BACKUP_VERSION=1`), `buildManifest(...)` + `validateManifest(raw): Result<Manifest>` (manual coerce like `prefs.ts` — no zod in the dep cap; this is the trust boundary) → verify: unit-test round-trip + rejects wrong-version/malformed.
3. `storage/backup.ts` — `exportBackup(db): Result<Uint8Array>` (read all stores, zip) + `importBackup(db, bytes): Result<void>` (unzip → validate → clear+rewrite all stores atomically; media rebuilt as ArrayBuffer+MIME per the WebKit-Blob decision) → verify: fake-indexeddb round-trip identical (AC-9), corrupt zip leaves data untouched (AC-10).
4. `useBackup` hook — export (build zip, trigger download) + restore (read `File`, import, surface errors) + dispatch `cute:collection-changed`/`cute:tags-changed` so grid/stats refresh → verify: screen-level.
5. Settings BACKUP section — Export button + Restore file input + destructive-replace `ConfirmDialog`; strings EN/PT-BR; wire in `SettingsScreen` → verify: render + confirm-gates-restore.
6. Full suite + lint + build green; user does own browser/device visual check.

**Open questions:** none blocking. `fflate` will be the first non-cap runtime dep (pre-approved). Source URL `https://github.com/lucindo/cute` confirmed; repo still has no git remote — confirm before first push.

**Watch:**
- Focus-return polish: returning from Stats lands focus on Settings' back button, not the originating Statistics row (HRV refocuses the row). Minor a11y; deferred.
- Icon slot: `IconButton` md=40px vs `TopAppBar`'s 36px placeholder → title ~2px off-center when one slot is filled. Visual-only.
- Device verification pending: iOS unmuted-first-video (FR-35) and session lifecycle-edges (FR-38/39); pointer gestures touch-only. Aww per-card stats `aria-hidden` (optional SR follow-up).
- Carry-over: session persistence best-effort (no error surface); DB v3 clears pre-release media once (tags/renames survive); `.gitignore` ignores `CLAUDE.md`/`AGENTS.md` — confirm before first push; PT-BR final pass deferred to project end.

## Roadmap

- [x] Scaffold: repo builds, tests, lints with HRV toolchain (strict tsconfig, Vite, Tailwind, Vitest, ESLint); empty app renders with Mono Zen light/dark theme
- [x] App shell: Practice/Collection switcher routes between placeholder screens; EN/PT-BR strings infra wired
- [x] Storage foundation: IndexedDB stores (sources, blobs, thumbs, sessions, hold events) behind typed Result wrappers; `cute:`-prefixed localStorage prefs with HRV key-collision audit; `storage.persist()` requested on first run
- [x] Image import: picker, drag-drop, and paste produce re-encoded (≤2000px) sources with thumbnails, untagged, visible in grid; animated GIF/WebP stored as-is; per-file rejection with hint, batch survives
- [x] Video import: probe validates decodability, poster frame becomes thumbnail, bytes stored as-is; undecodable rejected with format hint
- [x] Collection grid: thumbnail-only rendering, per-source file size, storage gauge, delete with confirmation leaves tombstone and preserves hold events
- [x] Tags & captions: seeded tag list, create/rename/delete, per-item tag assign + caption editing in a staged item sheet; tag manager in a sheet. (Bulk multi-select assign dropped — SPEC FR-15, see DECISIONS.)
- [x] UI re-anchor to HRV primitives: ported `SegmentedControl`, `TopAppBar`, `SettingsRow`, `SettingsStepper`; rebuilt shell / collection toolbar / tag rows on them; retired `ModeToggle`. (`SectionCard` deferred until a surface needs it.)
- [x] Session setup: duration stepper (FR-23), session-local `TagFilter` (FR-24, OR/empty=all), empty-pool Start guard (FR-25/AC-1); grouped in a ported `SectionCard`
- [x] Session domain logic (pure, unit-tested): `shuffleBag` (boundary-guarded), `sessionMachine` — wall-clock timer, overtime, hold-event recording, back/forward history
- [x] Session surface: CSS full-viewport takeover, image/video display, gesture grammar — hold ≥300ms records, tap toggles overlay, swipe navigates; keyboard map (Space/←/→/Esc/O)
- [x] Session overlay: countdown + overtime, clock, stop-with-confirm, pulsing hold indicator, legible over arbitrary media
- [x] Session video playback (FR-35): single persistent, gesture-unlocked `<video>`; sound-on default (persisted pref) + in-session overlay toggle. iOS unmuted-first-play needs real-device verification
- [~] Session lifecycle edges: timer-expiry-mid-hold + overtime, backgrounding truncates hold, stop saves `stopped`, wake lock held — all done; on-device verification remains
- [x] Completion screen: duration incl. overtime, hold count, total held time, longest hold
- [x] Aww factor (FR-17/AC-7): Collection aww-factor sort (session-local, descending total held) alongside newest-first; each card shows hold count + total held time
- [x] Settings surface: HRV-style page (gear in TopAppBar leading slot; `shell|settings|stats` nav) — Theme (net-new light/dark/system + pre-paint), Language, About/version+Source, and the Statistics→Stats nav row; no audio Feedback section
- [x] Stats page (reached from Settings): read-time aggregate of lifetime totals (sessions, practice time, held time, longest hold) + recent-sessions list
- [ ] Backup: zip export of full state; restore validates manifest, confirms, replaces; corrupt zip aborts untouched
- [ ] Learn/About: practice explanation, three video links, book credit, background-music note; PT-BR complete incl. seeded tags
- [ ] PWA: offline after first load, installable, zero non-asset network requests
- [ ] Performance pass: 500-source library meets ≤100ms interaction / ≤300ms transition targets
- [ ] README (privacy-first framing) + LICENSE
- [ ] Ship: Pages multi-version deploy live at `lucindo.github.io/cute`; Pake desktop builds via `desktop.yml`
