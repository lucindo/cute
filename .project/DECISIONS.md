# Decisions — Cute Baby Meditation

Decisions resolved during design discussion and the grill interview. One entry per decision.

## Baseline (pre-grill discussion)

- **Stack: reuse HRV wholesale** — React 19, TypeScript strict, Vite 8, Tailwind 4, PWA (Workbox), Vitest, ESLint, multi-version GitHub Pages deploy, Pake desktop shell. Reference clone at `.reference/hrv` (gitignored). *Rationale: all tooling decisions already made and proven in HRV.*
- **Single practice, two app states: Practice / Collection** — reuse HRV's switcher UI for the two modes. *Rationale: app has one practice but needs a media-management surface.*
- **Library named "Collection"** — not "Cuties". *Rationale: safer tone.*
- **Media in IndexedDB, settings/prefs in namespaced localStorage** — plus `navigator.storage.persist()` and an export/import backup. *Rationale: localStorage 5MB can't hold media; blobs store natively in IndexedDB; eviction is the worst failure mode.*
- **Import via file picker, drag-drop, clipboard paste** — social-link extraction out of scope. *Rationale: link extraction needs a backend/scraping and violates the no-backend privacy stance; paste covers much of the need.*
- **Images re-encoded on import** — decode → downscale (~2000px max) → WebP/JPEG. Undecodable files rejected loudly. *Rationale: HEIC compatibility outside Safari; ~10x storage savings.*
- **Photos and videos, local files only.**
- **Tags, not categories** — seeded defaults, user-created allowed. Session setup filters by tags. Named presets deferred. *Rationale: tags are strictly more expressive; presets fall out naturally later.*
- **Hold = one granular event** — source, duration, timestamp; multiple holds on one source are separate entries, never summed/averaged at write time. *Rationale: raw events keep every future metric derivable.*
- **Release keeps the current source** — re-hold allowed; swipe left = next random, swipe right = back through session history. *Rationale: matches the book (gaze at the same picture again); preserves user agency.*
- **Metric named "aww factor"** — formula deferred; derived from raw events.
- **i18n EN/PT-BR kept** — HRV strings infra reused.
- **No app-generated audio at all** — no ambient, no end-of-session chime, no `src/audio/` port. Videos carry the only sound; single toggle: video sound on/muted (default on). Background music = user's own streaming app; About copy notes unmuted videos interrupt it (iOS audio session). *Rationale: any app audio would pause the user's background music on iOS anyway; drops the largest HRV subsystem; session end is visually unmissable.*
- **Unmuted video playback is gesture-driven** — session start tap + swipes grant user activation; one persistent `<video>` element unlocked at Start for iOS.
- **Privacy is the headline feature** — user's own photos never leave the device; README leads with it.

## Grill interview

- **Q: Where do session records and granular hold events live?** → **IndexedDB**, alongside media. Only settings/prefs/UI state in localStorage. *Rationale: events grow unboundedly (~1MB/yr for daily use); localStorage's 5MB origin-shared cap would eventually silently truncate; one export path covers media + history together.*
- **Q: Timer expires mid-hold?** → **Wait for release.** Session enters overtime, the hold keeps recording; completion screen appears on release. Overtime stored in the session record. *Rationale: never interrupt the feeling — that's the practice; the data stays honest.*
- **Q: Duration control?** → **HRV-style stepper, 1–30 min, default 5 min** (the book's prescription), persisted as last-used. *Rationale: familiar HRV idiom, direct port.*
- **Q: Stop/pause semantics?** → **Stop only, no pause.** Stop confirms (HRV-style), ends session; all recorded hold events kept; session saved with endReason `stopped` vs `completed`. *Rationale: releasing a hold already costs nothing, pause adds a state and a control for no practice benefit; granular data is never discarded.*
- **Q: Gesture grammar on the session surface?** → **Move past threshold = swipe; release <~300ms = tap (toggles overlay visibility, not recorded); ≥300ms = hold, recorded in full including the first 300ms.** *Rationale: clean disambiguation, no accidental-tap pollution in the data, and the discrete overlay can vanish entirely video-player-style.*
- **Q: Keyboard controls?** → **Full mapping: Space held = hold, ←/→ = back/next, Esc = stop (confirmed), short click/O = toggle overlay.** Key-repeat filtered on Space. *Rationale: cheap to build alongside pointer gestures, hard to retrofit; keyboard-only accessibility.*
- **Q: Random selection policy?** → **Shuffle-bag:** shuffle filtered pool at start, deal in order, reshuffle on exhaustion (no back-to-back repeat at the boundary). Swipe-back history = the dealt sequence. *Rationale: guarantees full coverage before repeats; small pools feel fair.*
- **Q: Video behavior in session?** → **Autoplay from start on display, loop until navigation; holds don't affect playback.** *Rationale: matches the reels/shorts habit the sources come from; playback decoupled from the metric gesture.*
- **Q: Fullscreen mechanism?** → **CSS full-viewport takeover only** (HRV session style, safe-area insets); no Fullscreen API in v1. *Rationale: works identically everywhere including iPhone Safari; installed PWA/Pake already chromeless; avoids the Esc double-meaning conflict.*
- **Q: Overlay contents?** → **Countdown (remaining → 0:00, then +overtime), clock, stop button, plus a barely-there hold-in-progress indicator** (thin ring/soft glow). Semi-transparent pill with backdrop blur for any-background contrast; tap hides all of it. *Rationale: user set a duration and wants what's left; first-timers need confirmation the hold registered without attention theft.*
- **Q: Import/tagging flow?** → **Import first, tag after.** Files land untagged instantly; Collection grid multi-select → assign tags; untagged sources count under "all tags". Seeded tag list: Babies, Kittens, Puppies, Family, Bhakti (user-editable). *Rationale: zero friction on drop/paste/batch; tagging is curation, done at leisure.*
- **Thumbnails (engineering):** ~300px thumbnail blob generated at import, stored alongside the source; Collection grid renders thumbs only. *Rationale: grid must not decode full-size media.*
- **Q: Video import validation?** → **Probe + store as-is.** Import loads the file into a `<video>` to verify decodability and captures a poster frame (= thumbnail); undecodable files rejected loudly with a format hint. No size cap; per-item size shown and a total storage gauge via `navigator.storage.estimate()`. *Rationale: no client-side transcode is feasible; unplayable media must fail at import, never mid-session.*
- **Q: Source deletion semantics?** → **Tombstone.** Blob + thumbnail removed (space freed); source record kept with deleted flag, caption/type/tags retained; hold events untouched. *Rationale: history and lifetime totals stay truthful; costs ~100 bytes per deleted source.*
- **Q: Backup format/semantics?** → **Single .zip (media + metadata/events JSON) via fflate — accepted as first runtime dep (~8KB). Import = full restore replacing current state after explicit confirm.** Merge-on-import deferred. *Rationale: zip survives big libraries streaming-wise where base64-JSON dies; replace semantics avoid id-conflict complexity in v1.*
- **Q: Aww factor v1 formula?** → **Sort key = lifetime total hold time per source; cards show raw stats ("14 holds · 9m"), no synthetic score.** *Rationale: transparent and obviously correct; granular events let the formula evolve later without migration.*
- **Q: Stats page scope?** → **Modest: lifetime totals (sessions, practice time, hold time, longest hold) + recent sessions list.** Reuses HRV StatsPage shell; no charts in v1. *Rationale: makes the granular log visible without polish-before-product.*
- **Q: Branding?** → **App name "Cute Baby Meditation"; keep HRV's Mono Zen light/dark palette.** Deploys at `lucindo.github.io/cute`; localStorage keys prefixed `cute:`. *Rationale: the book's own name self-explains; neutral chrome recedes behind the user's photos; accent tweakable later.*
- **Q: Backgrounding mid-session?** → **Wall-clock timer keeps counting while hidden; active hold ends at visibility loss (recorded to that moment); on return, same source or completion screen if expired.** *Rationale: honest timekeeping, no phantom holds; touch state is untrustworthy across visibility changes.*

## Resolved without grilling (obvious given prior decisions)

- **Empty state:** Start is blocked when the tag filter matches zero sources; friendly guidance points to the Collection (echoing the book: "download five to ten pictures"). Minimum pool = 1, no nagging. No bundled starter content — privacy stance plus copyright.
- **Learn/About page:** adapted HRV LearnPage — practice explanation from the book, the three YouTube links, book credit, and the note that unmuted videos interrupt background music.
- **Wake lock:** kept as in HRV (progressive enhancement) — screen must not sleep between holds.
- **Deploy/desktop:** HRV's `deploy.yml` (multi-version Pages + versions.json) and `desktop.yml` (Pake wrapping the live URL) reused with name/URL swapped, per original scope.
- **Deferred beyond v1:** named presets, merge-on-import backup, custom background track, recency-weighted aww formula, charts, Android PWA share-target, Fullscreen API enhancement, optional end chime.
