# Plan — Cute Baby Meditation

Source: `SPEC.md` (requirements) · `DECISIONS.md` (rationale) · `.reference/hrv` (reference implementation).

## Now

**State:** Settings surface (Steps 1–5) built and shipped on `dev` (7 commits, `7f14a47`→`3f244f6`). Gear in the `TopAppBar` leading slot routes `shell → settings` via an `App` `view` state (`shell|settings|stats`); `SettingsScreen` (back chevron focused on mount) holds Theme, Language, About. Theme is net-new: `data-theme` resolved from a tri-state `prefs.theme` via `resolveTheme`, `useTheme` (3-effect sync + `system`-gated matchMedia), `index.html` pre-paint reads the persisted theme → no reload flash. Language switches locale live; About shows `version · sha · date` (build `define`) + external `Source →`. New units: `useTheme`, generic `usePreferenceChoice` writer, `ThemePicker` / `LanguagePicker` / `PickerCardGrid` / `IconButton` / `SettingsSectionHeader`, gear/back/right icons, `vite-env.d.ts`. Lint / 174 tests / build green.

**Next:** **Step 6 — `domain/stats.ts`**: pure `aggregateStats(sessions, holds, limit)` → lifetime totals (session count, total practice time incl. overtime, total held time, longest hold) + a recent-sessions list. Must equal the event log exactly (AC-23); unit-test the read-model math. Then Step 7 `useStats` (load + aggregate), Step 8 `StatsScreen` + wire the Statistics row (the one thing that reaches `view='stats'`) + strings.

**Open questions:** none. Source URL confirmed `https://github.com/lucindo/cute` (repo still has no git remote — confirm before first push).

**Watch:**
- `PROJECT.md` map stale beyond one-line fixes — this session added `components/primitives/IconButton` + `PickerCardGrid`, `components/SettingsSectionHeader` / `ThemePicker` / `LanguagePicker`, `components/icons/GearIcon` / `ChevronBackIcon` / `ChevronRightIcon`, `app/SettingsScreen`, `hooks/useTheme` / `usePreferenceChoice`, `src/vite-env.d.ts`; changed responsibilities (`App` owns `view` + calls `useTheme`; `domain/settings` has `ThemeId` / `resolveTheme`; prefs has `theme`; `index.html` pre-paint reads persisted theme). Prior aww/session-runtime files still unmapped. Run `/ds-project-map`.
- Icon slot: `IconButton` md=40px vs `TopAppBar`'s 36px placeholder → title ~2px off-center when one slot is filled. Visual-only.
- `'stats'` view is in the `App` union but unreachable until Step 8 wires the Statistics row.
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
- [~] Settings surface: HRV-style page (gear in TopAppBar leading slot; `shell|settings|stats` nav) — Theme (net-new light/dark/system + pre-paint), Language, About/version+Source all done; no audio Feedback section. Remaining: the Statistics→Stats row (lands with Step 8)
- [ ] Stats page (reached from Settings): read-time aggregate of lifetime totals (sessions, practice time, held time, longest hold) + recent-sessions list
- [ ] Backup: zip export of full state; restore validates manifest, confirms, replaces; corrupt zip aborts untouched
- [ ] Learn/About: practice explanation, three video links, book credit, background-music note; PT-BR complete incl. seeded tags
- [ ] PWA: offline after first load, installable, zero non-asset network requests
- [ ] Performance pass: 500-source library meets ≤100ms interaction / ≤300ms transition targets
- [ ] README (privacy-first framing) + LICENSE
- [ ] Ship: Pages multi-version deploy live at `lucindo.github.io/cute`; Pake desktop builds via `desktop.yml`
