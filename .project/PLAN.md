# Plan — Cute Baby Meditation

Source: `SPEC.md` (requirements) · `DECISIONS.md` (rationale) · `.reference/hrv` (reference implementation).

## Now

**State:** Task 8 (Session setup) **done** on `dev`: duration stepper + session-local `TagFilter` (OR, empty = all incl. untagged) + empty-pool Start guard, grouped in a now-ported `SectionCard`. The full **session runtime** is live and runnable end-to-end — pure `sessionMachine`/`shuffleBag` domain (wall-clock, tick-driven completion), `useSession` orchestration (tick loop, media load from IndexedDB, persistence, wake lock), `SessionView` full-viewport takeover with pointer + keyboard gesture grammar, `SessionOverlay` (countdown/overtime/clock/stop-confirm/pulsing hold glow), `CompletionScreen` summary; session + hold events persist on completion. User-tested on desktop: Stop-button bug fixed, hold indicator upgraded to a slow pulse. Lint / tests (154) / build green.

**Next:** Session video playback (FR-35) — sound-on default + iOS first-unmute via a single persistent `<video>` unlocked at the Start gesture (currently muted autoplay+loop only). Then lifecycle-edge device verification, then Aww factor / Stats.

**Open questions:** none blocking.

**Watch:**
- `PROJECT.md` map broadly stale — many new session files (`domain/shuffleBag.ts`, `domain/sessionMachine.ts`, `hooks/useSession.ts`, `hooks/useWakeLock.ts`, `hooks/useSessionDuration.ts`, `storage/sessions.ts`, `app/SessionView.tsx`, `app/CompletionScreen.tsx`, `components/SessionOverlay.tsx`, `components/TagFilter.tsx`, `components/SettingsRow.tsx`, `components/SettingsStepper.tsx`, `components/primitives/SectionCard.tsx`/`SegmentedControl.tsx`/`TopAppBar.tsx`); `ModeToggle` removed. Run `/ds-project-map`.
- Pointer gestures (hold/tap/swipe, 10px slop) only manually verifiable — jsdom can't do pointer capture; the integration test covers the keyboard path. Verify hold/tap/swipe on a real touch device; tune slop (SPEC OQ-2).
- Session persistence is best-effort (no error surface); a fresh DB connection opens per source navigation — consolidate in the perf pass. Possible media micro-flicker on rapid nav (old object URL revoked before new loads).
- Carry-over: iOS video-import probe waits for `loadeddata` with no timeout (untested on iPhone); nested delete-confirm device check; DB v3 clears pre-release media once (tags/renames survive); `.gitignore` ignores `CLAUDE.md`/`AGENTS.md` — confirm before first push; PT-BR final pass deferred to project end.

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
- [~] Session video playback: muted autoplay + loop done; single-persistent-element + sound toggle (default on) + iOS unmuted first play (FR-35) remain
- [~] Session lifecycle edges: timer-expiry-mid-hold + overtime, backgrounding truncates hold, stop saves `stopped`, wake lock held — all done; on-device verification remains
- [x] Completion screen: duration incl. overtime, hold count, total held time, longest hold
- [ ] Aww factor: Collection sorts by lifetime total hold time; cards show hold count + total time
- [ ] Stats page: lifetime totals (sessions, practice time, held time, longest hold) + recent-sessions list
- [ ] Backup: zip export of full state; restore validates manifest, confirms, replaces; corrupt zip aborts untouched
- [ ] Learn/About: practice explanation, three video links, book credit, background-music note; PT-BR complete incl. seeded tags
- [ ] PWA: offline after first load, installable, zero non-asset network requests
- [ ] Performance pass: 500-source library meets ≤100ms interaction / ≤300ms transition targets
- [ ] README (privacy-first framing) + LICENSE
- [ ] Ship: Pages multi-version deploy live at `lucindo.github.io/cute`; Pake desktop builds via `desktop.yml`
