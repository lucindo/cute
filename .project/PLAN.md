# Plan — Cute Baby Meditation

Source: `SPEC.md` (requirements) · `DECISIONS.md` (rationale) · `.reference/hrv` (reference implementation).

## Now

**State:** Docs + i18n finalized — **only Ship remains.** README shipped (`bb7f3ed`, privacy-first; Forrest links/videos consistent with in-app Learn; MIT + courtesy note); LICENSE was already present (MIT, Renato Lucindo). PT-BR pass done (`6196191`): terminology fixes (Cachorrinhos; *mídias* not *fontes*; "Tempo total retido" now matches Stats) and the app name localized to **Meditação do Bebê Fofo** across shell + Learn (real YouTube video titles kept English). Prior: perf pass verified (no changes), PWA shipped (`b0da8f2`). Lint / 209 tests / build green.

**Next:** **Ship** — GitHub Pages multi-version deploy at `lucindo.github.io/cute` + Pake desktop builds via `desktop.yml`. Blocked on the first push: no git remote yet (explicit gate), and `.gitignore` ignores `CLAUDE.md`/`AGENTS.md` — confirm both before pushing. README's Desktop-apps + live-URL sections are deferred here to avoid dead links.

**Open questions:** none blocking. Repo still has **no git remote** — confirm before any first push.

**Watch:**
- Backup on huge libraries runs `zipSync`/`unzipSync` on the main thread — fine at phone scale; async fflate API is the follow-up if a large collection janks the UI.
- fflate returns `Uint8Array<ArrayBufferLike>`, not a valid `BlobPart`/`ArrayBuffer` under strict lib types — copy into a fresh `new Uint8Array(...)` before `new Blob`/`new File`.
- Focus-return polish: returning from Stats lands focus on Settings' back button, not the originating Statistics row. Minor a11y; deferred.
- Icon slot: `IconButton` md=40px vs `TopAppBar`'s 36px placeholder → title ~2px off-center when one slot is filled. Visual-only.
- Device verification pending: iOS unmuted-first-video (FR-35) and session lifecycle-edges (FR-38/39); pointer gestures touch-only. Aww per-card stats `aria-hidden` (optional SR follow-up).
- PWA device verification pending: add-to-home-screen (iOS/Android) + airplane-mode reload not device-tested. SW is off in dev by design — test offline via `npm run preview`.
- PWA install label + browser-tab title are English-only (static `manifest.name` / `<title>`); the in-app shell + Learn show "Meditação do Bebê Fofo". One manifest = one name — localizing the installed label is a product call for Ship.
- Carry-over: session persistence best-effort (no error surface); DB v3 clears pre-release media once (tags/renames survive); `.gitignore` ignores `CLAUDE.md`/`AGENTS.md` — confirm before first push.

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
- [x] Backup: zip export of full state; restore validates manifest, confirms, replaces; corrupt zip aborts untouched
- [x] Learn/About: practice explanation, three video links, book credit, background-music note; EN/PT-BR; original copy (not Forrest's wording); reached from the shell top-bar trailing ⓘ
- [x] PWA: offline after first load, installable, zero non-asset network requests (device install/offline verification pending)
- [x] Performance pass: 500-source library meets ≤100ms interaction / ≤300ms transition targets (verified via `cuteSeed(500)`; met targets, no changes needed)
- [x] README (privacy-first framing); LICENSE pre-existing (MIT). Desktop-apps + live-URL sections deferred to Ship
- [x] PT-BR final pass: terminology review + app-name localization ("Meditação do Bebê Fofo"); structural EN↔PT parity is type-enforced
- [ ] Ship: Pages multi-version deploy live at `lucindo.github.io/cute`; Pake desktop builds via `desktop.yml`
