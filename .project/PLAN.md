# Plan — Cute Baby Meditation

Source: `SPEC.md` (requirements) · `DECISIONS.md` (rationale) · `.reference/hrv` (reference implementation).

## Now

**State:** FR-35 video sound and FR-17 aww factor both landed on `dev` (6 commits, `b233d02`→`f31e030`). Video: one persistent App-level `<video>` unlocked at the Start gesture, `videoSound` pref (default on) + overlay mute toggle; `SessionView` drives the shared element imperatively over a transparent `z-20` gesture surface. Aww: read-time `aggregateHoldStats` joined into `useCollection`, session-local aww-factor sort + per-card `♥ n · m:ss` stat (aria-hidden). Lint / 159 tests / build green.

**Next:** Build the **Settings surface** (HRV parity minus the audio Feedback section) — the home for Theme/Language, with Statistics→Stats and About. Scope + confirmed choices in `DECISIONS.md` (settings surface — planned). Ordered steps, one per step-mode turn:
1. Port primitives: `SettingsSectionHeader`, `IconButton`, `IconAnchor` + gear / `ChevronBack` / `ChevronRight` icons.
2. Nav: `App` `view` state (`shell | settings | stats`) + gear in `TopAppBar` leading slot → skeleton `SettingsScreen` (back-wired).
3. Theme system: `ThemeId` + `prefs.theme` + coercer; `useTheme` (apply + gated `system` matchMedia + cross/same-tab sync); update `index.html` pre-paint to read `cute:state:v1 → prefs.theme`; `PickerCardGrid` control (default `system`).
4. Language: locale setter (write prefs + dispatch `cute:prefs-changed`), `SegmentedControl` control, display-name strings.
5. About: add `src/vite-env.d.ts` (`__APP_VERSION__` / `_SHA` / `_DATE`), Version row + `Source →` (`github.com/lucindo/cute`).
6. `domain/stats.ts` — pure `aggregateStats(sessions, holds, limit)` + tests.
7. `useStats` hook (load + aggregate) + tests.
8. `StatsScreen` UI + wire the Statistics row + strings.

**Open questions:** none blocking. Source URL assumed `github.com/lucindo/cute` (repo has no remote yet — confirm before first push).

**Watch:**
- `PROJECT.md` map now stale beyond one-line fixes — new files this session (`hooks/useVideoSound.ts`, `components/icons/SpeakerIcon.tsx` + `SpeakerMutedIcon.tsx`, `domain/holdStats.ts`) and changed responsibilities (`App` owns the persistent `<video>`; `SessionView` drives it; `SessionOverlay` has the sound toggle; `useCollection` joins hold stats; `CollectionScreen` has aww sort + card stats). Prior session-runtime files also still unmapped. Run `/ds-project-map`.
- Device verification pending: iOS unmuted-first-video (FR-35; fallback = blank-clip primer) and session lifecycle-edges (FR-38/39). Pointer gestures (hold/tap/swipe, 10px slop) still touch-device-only.
- Aww per-card stats are `aria-hidden` — SR parity is an optional follow-up.
- Session persistence is best-effort (no error surface); a fresh DB connection opens per source nav — consolidate in the perf pass. Possible media micro-flicker on rapid nav.
- Carry-over: iOS video-import probe waits for `loadeddata` with no timeout; nested delete-confirm device check; DB v3 clears pre-release media once (tags/renames survive); `.gitignore` ignores `CLAUDE.md`/`AGENTS.md` — confirm before first push; PT-BR final pass deferred to project end.

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
- [ ] Settings surface: HRV-style page (gear in TopAppBar leading slot; `shell|settings|stats` nav) — Statistics→Stats, Theme (net-new light/dark/system system + pre-paint), Language, About/version+Source; no audio Feedback section
- [ ] Stats page (reached from Settings): read-time aggregate of lifetime totals (sessions, practice time, held time, longest hold) + recent-sessions list
- [ ] Backup: zip export of full state; restore validates manifest, confirms, replaces; corrupt zip aborts untouched
- [ ] Learn/About: practice explanation, three video links, book credit, background-music note; PT-BR complete incl. seeded tags
- [ ] PWA: offline after first load, installable, zero non-asset network requests
- [ ] Performance pass: 500-source library meets ≤100ms interaction / ≤300ms transition targets
- [ ] README (privacy-first framing) + LICENSE
- [ ] Ship: Pages multi-version deploy live at `lucindo.github.io/cute`; Pake desktop builds via `desktop.yml`
