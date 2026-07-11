# Specification: Cute Baby Meditation

Companion documents: `DECISIONS.md` (design rationale), `.reference/hrv` (reference implementation, gitignored).

## Problem

The Cute Baby Meditation (a Mettā practice from Forrest Knutson's teaching, after Buddhaghosa's Visuddhimagga) asks the practitioner to gaze at the cutest pictures they can find, hold the "aww" feeling as long as possible, clear the mind, and repeat — five minutes a day. There is no dedicated tool for it: people juggle camera rolls and social feeds, which are full of distractions and track everything. This app gives the practice a home: a private, offline, on-device collection of the user's own cute photos and videos, a distraction-free timed session surface that measures how long each feeling was held, and a practice log — with no account, no backend, and no tracking.

## Scope

**In scope (v1):**

- Single practice; two app modes — **Practice** and **Collection** — behind an HRV-style switcher.
- Collection: import (file picker, drag-drop, clipboard paste), tags, captions, delete, aww-factor sort, storage gauge, zip backup/restore.
- Practice session: duration + tag filter setup, full-viewport media display, hold/tap/swipe gesture grammar, keyboard controls, discrete overlay, granular hold-event recording.
- Stats: lifetime totals and recent-session history.
- Learn/About page adapted from the book, with the three reference videos.
- PWA (offline, installable), EN/PT-BR, light/dark Mono Zen theme, wake lock.
- Reused HRV infrastructure: multi-version GitHub Pages deploy, Pake desktop shell.

**Out of scope (v1):**

- Social-link media extraction (needs backend/scraping; violates privacy stance).
- App-generated audio of any kind (ambient, music, end-of-session chime).
- Named practice presets; merge-on-import backup; recency-weighted aww formula; stats charts; Android PWA share-target; Fullscreen API; custom background track.
- Accounts, sync, telemetry, analytics, any network call at runtime beyond PWA asset updates.
- Client-side video transcoding.

## Users

One role: **the practitioner**. Goals:

1. Curate a private collection of cute photos/videos, organized by tags.
2. Run a timed gazing session over a chosen slice of the collection, recording each held "aww".
3. See their practice history and which sources hold the most aww.
4. Keep everything on-device, with a way to back it up and restore it.

## Functional Requirements

### App shell

- **FR-1:** The app SHALL present exactly two modes, Practice and Collection, toggled by a persistent switcher.
- **FR-2:** The app SHALL function fully offline after first load, as an installable PWA.
- **FR-3:** The app SHALL provide all UI strings in EN and PT-BR.
- **FR-4:** The app SHALL provide light and dark themes (Mono Zen palette, reused from HRV).
- **FR-5:** The app SHALL provide a Learn/About page containing the practice explanation, the three reference video links, book credit, and a note that unmuted videos interrupt background music.
- **FR-6:** The app SHALL emit no network requests at runtime other than PWA asset loading/updates.

### Collection — import

- **FR-7:** The Collection SHALL import media via system file picker, drag-and-drop, and clipboard paste.
- **FR-8:** The app SHALL re-encode imported static images: decode → downscale to ≤2000px on the longest edge → encode WebP or JPEG.
  - **FR-8.a:** Animated images (GIF, animated WebP) SHALL be stored as-is, since re-encoding would flatten the animation.
- **FR-9:** The app SHALL validate imported videos by loading metadata into a `<video>` element and SHALL capture a poster frame during the probe. Video files SHALL be stored as-is.
- **FR-10:** The app SHALL reject any file it cannot decode with a visible error naming the file and a probable-cause hint (e.g., HEVC/HEIC on a non-Safari browser); rejection SHALL NOT abort the rest of the batch.
- **FR-11:** The app SHALL generate and store a thumbnail (~300px) for every imported source; the Collection grid SHALL render only thumbnails, never full media.
- **FR-12:** Imported sources SHALL appear in the Collection immediately, untagged.

### Collection — organize

- **FR-13:** The app SHALL seed the tag list with: Babies, Kittens, Puppies, Family, Bhakti (localized).
- **FR-14:** The user SHALL be able to create tags; the user SHOULD be able to rename and delete tags (delete removes the tag from all sources after confirmation).
- **FR-15:** The Collection SHALL support multi-selecting sources and assigning/removing tags on the selection.
- **FR-16:** Each source MAY have an optional user-editable caption.
- **FR-17:** The Collection SHALL sort by newest-first (default) and by aww factor; each source card SHALL show raw stats (hold count, total hold time).
- **FR-18:** Deleting a source SHALL remove its media blob and thumbnail but retain a tombstone record (caption, type, tags, deleted flag); its hold events SHALL be retained. Deletion SHALL require confirmation.
- **FR-19:** The Collection SHALL display total storage usage via `navigator.storage.estimate()` and per-source file size.

### Backup

- **FR-20:** The app SHALL export the entire state (media blobs, source metadata, tags, sessions, hold events, tombstones) as a single downloadable zip.
- **FR-21:** The app SHALL restore from a backup zip, replacing all current state, only after an explicit confirmation that names the destructive consequence.
- **FR-22:** Restore SHALL validate the zip's manifest before touching existing data and SHALL abort without changes on an invalid file.

### Session — setup

- **FR-23:** Session setup SHALL offer a duration stepper: 1–30 minutes, 1-minute steps, default 5, persisted as last-used.
- **FR-24:** Session setup SHALL offer a tag filter (multi-select; empty selection = all sources, including untagged).
- **FR-25:** The app SHALL block session start when the filter matches zero non-deleted sources, showing guidance that points to the Collection.

### Session — running

- **FR-26:** The session SHALL occupy the full viewport via CSS takeover (safe-area aware); it SHALL NOT use the Fullscreen API.
- **FR-27:** The session SHALL order sources by shuffle-bag: the filtered pool shuffled at start, dealt in order, reshuffled on exhaustion with no back-to-back repeat across the boundary.
- **FR-28:** A press held ≥300ms SHALL be recorded as one hold event (source id, session id, start timestamp, duration measured from initial press). Each hold is a separate event; holds SHALL never be merged or summed at write time.
- **FR-29:** A press released <300ms (tap) SHALL toggle overlay visibility and SHALL NOT be recorded.
- **FR-30:** A press moved beyond the slop threshold SHALL be treated as a swipe, not a hold: left = next source, right = previous source in session history.
- **FR-31:** Releasing a hold SHALL keep the current source displayed.
- **FR-32:** The session SHALL support keyboard controls: Space held = hold (key-repeat filtered), ←/→ = previous/next, Esc = stop (with confirm), O = toggle overlay.
- **FR-33:** The overlay SHALL show remaining time (counting down; after 0:00, overtime counting up), the time of day, a stop control, and a subtle hold-in-progress indicator; it SHALL render legibly over arbitrary media (semi-transparent pill, backdrop blur).
- **FR-34:** Videos SHALL autoplay from the start when displayed and loop until navigation; holds SHALL NOT affect playback.
- **FR-35:** The session SHALL offer a video-sound toggle (default: sound on); playback SHALL use a single persistent `<video>` element unlocked during the Start gesture.
- **FR-36:** When the timer expires during an active hold, the session SHALL continue until release (overtime recorded on the session), then show the completion screen.
- **FR-37:** The stop control SHALL require confirmation; a stopped session SHALL be saved with endReason `stopped` and all its hold events retained.
- **FR-38:** The session timer SHALL be wall-clock based; on visibility loss any active hold SHALL end (recorded up to that moment); on return the session SHALL resume, or show completion if time expired while hidden.
- **FR-39:** The app SHALL request a screen wake lock during sessions as progressive enhancement; sessions SHALL work where wake lock is unavailable.
- **FR-40:** The completion screen SHALL show the session summary: actual duration (including overtime), hold count, total held time, longest hold.

### Data

- **FR-41:** Media blobs, thumbnails, source metadata, sessions, and hold events SHALL be stored in IndexedDB; settings/preferences/UI state SHALL be stored in localStorage under a `cute:` key prefix.
- **FR-42:** The app SHALL request `navigator.storage.persist()` and SHOULD surface whether persistence was granted.
- **FR-43:** Session records SHALL include: id, start timestamp, planned duration, end timestamp, end reason (`completed` | `stopped`), overtime, and the tag filter used.

### Stats

- **FR-44:** The Stats page SHALL show lifetime totals — sessions, practice time, total held time, longest hold — and a recent-sessions list (date, duration, hold count, end reason).

## Non-Functional Requirements

- **NFR-1: Transition latency.** Advancing to the next source SHALL display the new media in ≤300ms (P95) for re-encoded images, on a mid-range phone, from IndexedDB.
- **NFR-2: Scale.** All features SHALL remain responsive (no interaction >100ms feedback) with a library of 500 sources / 2GB of media; the Collection grid SHALL NOT decode full-size media.
- **NFR-3: Availability.** 100% of functionality available offline after first visit; no runtime dependency on any server beyond static asset hosting.
- **NFR-4: Data retention.** All data remains on-device indefinitely until the user deletes it; nothing leaves the device except user-initiated backup downloads.
- **NFR-5: Privacy.** Zero telemetry, analytics, cookies, or third-party scripts. Verifiable by inspecting network traffic (FR-6).
- **NFR-6: Accessibility.** Session fully operable by keyboard alone; `prefers-reduced-motion` honored for all animations.
- **NFR-7: Footprint.** Runtime dependencies limited to `react`, `react-dom`, `@fontsource-variable/inter`, and `fflate`.

## Interfaces

- **UI surfaces:** Practice setup → session → completion; Collection grid + import + tag editor; Stats; Learn/About; app settings (theme, language, video sound).
- **CLI (npm scripts, mirroring HRV):** `dev`, `build`, `test`, `test:run`, `lint`, `preview`.
- **External systems:** GitHub Pages (static hosting, multi-version deploy via tags + `versions.json`); GitHub Actions (`deploy.yml`, `desktop.yml`); Pake/Tauri desktop shell wrapping the live URL. No runtime API integrations.
- **Data formats at boundaries:**
  - Import accepts: JPEG, PNG, WebP, GIF, HEIC/HEIF (where the browser decodes), MP4, WebM, MOV (where the browser decodes).
  - Backup zip: `manifest.json` (schema-versioned metadata: sources, tags, sessions, hold events, tombstones) + `media/<id>.<ext>` + `thumbs/<id>.<ext>`.
  - localStorage keys: `cute:` prefix (origin shared with other lucindo.github.io apps).

## Constraints

- TypeScript 5+ strict (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`), no `any`; React 19 functional components; Vite 8 + Tailwind CSS 4; Vitest + Testing Library; ESLint. Mirror HRV's architecture: pure logic in `src/domain/`, storage wrappers in `src/storage/`, hooks orchestrate, components render.
- Recoverable errors via `Result` types at boundaries; IndexedDB/storage misses handled, never swallowed.
- **Forbidden:** backends or proxies of any kind; app-generated audio; the Fullscreen API; client-side video transcoding; pre-aggregating hold data at write time; runtime deps beyond NFR-7's list; porting HRV's `src/audio/` layer.
- Localizable strings via HRV's typed strings pattern; no hardcoded copy in components.

## Acceptance Criteria

- **AC-1:** Given a fresh install with an empty Collection, when the user opens Practice, then Start is disabled and guidance directs them to the Collection. *(FR-25)*
- **AC-2:** Given JPEG/PNG/WebP files, when imported via picker, drag-drop, or paste, then each appears in the grid untagged, re-encoded ≤2000px, with a thumbnail. *(FR-7, FR-8, FR-11, FR-12)*
- **AC-3:** Given an animated GIF, when imported, then its stored bytes are unchanged and it animates in a session. *(FR-8.a)*
- **AC-4:** Given an undecodable file among a batch of 5, when imported, then a visible error names that file with a hint and the other 4 import successfully. *(FR-10)*
- **AC-5:** Given a playable video, when imported, then a poster-frame thumbnail exists and the stored bytes are unchanged. *(FR-9)*
- **AC-6:** Given 3 selected sources, when the user assigns tag "Babies", then all 3 carry the tag; given a new tag name typed, then it is created and assigned. *(FR-13, FR-14, FR-15)*
- **AC-7:** Given sources with recorded holds, when sorting by aww factor, then order is descending lifetime total hold time and each card shows hold count + total time. *(FR-17)*
- **AC-8:** Given a source with hold events, when deleted (confirmed), then its blob and thumbnail are gone from IndexedDB, its events remain, and lifetime totals in Stats are unchanged. *(FR-18)*
- **AC-9:** Given a populated library, when the user exports and then restores the zip on a cleared profile (confirming), then Collection, tags, sessions, events, and stats are identical. *(FR-20, FR-21)*
- **AC-10:** Given a corrupt or non-backup zip, when restore is attempted, then the app reports an invalid file and existing data is untouched. *(FR-22)*
- **AC-11:** Given tag filter "Kittens" with 4 matching sources, when a session runs past 4 advances, then all 4 appeared exactly once before any repeat, and the 5th is not the same as the 4th. *(FR-24, FR-27)*
- **AC-12:** Given a running session, when the user presses for 2s and releases, then one hold event exists with duration ≈2s and the same source remains displayed; pressing again for 3s creates a second, separate event. *(FR-28, FR-31)*
- **AC-13:** Given a running session with overlay visible, when the user taps (<300ms), then the overlay hides, no hold event is recorded, and a second tap restores it. *(FR-29, FR-33)*
- **AC-14:** Given a session on source B (after A), when the user swipes right, then A is displayed; swiping left returns to B. *(FR-30)*
- **AC-15:** Given a running session, when driven only by Space/←/→/Esc/O, then holds record, navigation works, overlay toggles, and Esc-then-confirm stops. *(FR-32, NFR-6)*
- **AC-16:** Given a 1-minute session with an active hold at 0:00, when the user keeps holding 20s more, then the session ends on release, the hold event spans the full press, and the session records ≈20s overtime; the completion screen shows duration, holds, total held, longest hold. *(FR-36, FR-40)*
- **AC-17:** Given a running session, when Stop is confirmed, then the session is saved with endReason `stopped` and its events are queryable in Stats. *(FR-37)*
- **AC-18:** Given a running session with an active hold, when the app is hidden for 30s and reopened, then the hold ended at hide time, and the timer reflects wall-clock elapsed (or completion is shown if expired). *(FR-38)*
- **AC-19:** Given a session displaying a video, then it autoplays with sound, loops, and keeps playing during a hold; given the sound toggle off, then it plays muted. On iOS Safari, the first video plays unmuted without an extra tap. *(FR-34, FR-35)*
- **AC-20:** Given the app loaded once, when the network is cut and the app reopened, then all features work; the network log shows zero non-asset requests. *(FR-2, FR-6, NFR-3, NFR-5)*
- **AC-21:** Given the language set to PT-BR, then all UI strings including seeded tags render in Portuguese. *(FR-3, FR-13)*
- **AC-22:** Given duration set to 12 minutes, when a new session is opened later, then the stepper reads 12. *(FR-23)*
- **AC-23:** Given completed and stopped sessions, when Stats is opened, then totals and the recent list match the recorded events exactly. *(FR-43, FR-44)*
- **AC-24:** Given the mode switcher, when toggled, then Practice and Collection swap; theme and Learn/About render per FR-4/FR-5. *(FR-1, FR-4, FR-5)*
- **AC-25:** Given first run, then `navigator.storage.persist()` has been requested; the Collection shows the storage gauge and per-source sizes. *(FR-19, FR-42)*
- **AC-26:** Given a 500-source library, when scrolling the grid and advancing sessions, then interactions respond ≤100ms and image transitions complete ≤300ms P95. *(NFR-1, NFR-2, FR-11)*

**Coverage:** FR-1→AC-24 · FR-2→AC-20 · FR-3→AC-21 · FR-4→AC-24 · FR-5→AC-24 · FR-6→AC-20 · FR-7→AC-2 · FR-8→AC-2, AC-3 · FR-9→AC-5 · FR-10→AC-4 · FR-11→AC-2, AC-26 · FR-12→AC-2 · FR-13→AC-6, AC-21 · FR-14→AC-6 · FR-15→AC-6 · FR-16→AC-9 (caption round-trips via backup) · FR-17→AC-7 · FR-18→AC-8 · FR-19→AC-25 · FR-20/21→AC-9 · FR-22→AC-10 · FR-23→AC-22 · FR-24→AC-11 · FR-25→AC-1 · FR-26→AC-15 (visual, plus manual check) · FR-27→AC-11 · FR-28→AC-12 · FR-29→AC-13 · FR-30→AC-14 · FR-31→AC-12 · FR-32→AC-15 · FR-33→AC-13 · FR-34/35→AC-19 · FR-36→AC-16 · FR-37→AC-17 · FR-38→AC-18 · FR-39→ manual device check (progressive enhancement; absence must not break AC-12–AC-18) · FR-40→AC-16 · FR-41→AC-8, AC-9 · FR-42→AC-25 · FR-43→AC-17, AC-23 · FR-44→AC-23.

## Technical Profile

- **Language:** TypeScript 5+ (HRV pins `~6.0.2`), strict mode per AGENTS.md profile.
- **Runtime target:** evergreen browsers + iOS Safari; installable PWA; Pake/Tauri desktop shell.
- **Build:** Vite 8, Tailwind CSS 4 (`@tailwindcss/vite`), `vite-plugin-pwa` (Workbox generateSW, auto-update).
- **Test:** Vitest 4 + @testing-library/react + jsdom; fake-indexeddb (dev-only) for storage tests.
- **Lint:** ESLint 10 with TypeScript + React Hooks + React Refresh packs.

## Open Questions

1. **PT-BR seeded tag names** — final translations (Bebês, Gatinhos, Filhotes, Família, Bhakti?) to be settled when writing `strings.ts`.
2. **Slop threshold value** for swipe-vs-hold disambiguation (likely ~10px, tune on device during implementation).
3. **HRV localStorage key audit** — confirm HRV's actual key names before choosing the `cute:` prefix scheme, to guarantee zero collision on the shared origin.

None of these block planning; all resolve during implementation of their respective slices.
