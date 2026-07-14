# Cute Baby Meditation

A private, browser-based app for the Cute Baby Meditation — a loving-kindness (Mettā) gazing practice. No accounts, no backend, no tracking. Collect your own cutest photos and videos, run a timed session, and hold the "aww".

This app is **inspired by Forrest Knutson's teachings**. It is an **independent project, not affiliated with Forrest Knutson** — see the in-app Learn/About page for his original material.

---

## About the Cute Baby Meditation

The Cute Baby Meditation is a form of **Mettā** — loving-kindness — practice with roots in the *Visuddhimagga*, a classical Buddhist text. Rather than repeating phrases, you let something irresistibly cute — a baby, a kitten, a puppy — spark an immediate warmth, and you rest your attention on that feeling. It is a quiet, self-directed practice: a few minutes of gazing and feeling, not a lesson or a measurement.

A session shows one photo or video from your collection at a time, full-screen and free of distractions. When a picture gives you that "aww", you press and hold — the app quietly times how long the feeling lasts. Let go when it fades, clear your mind, and hold again, or move on to the next image. When your time is up, you see a short summary: how long you practiced, how many times you held the feeling, and your longest hold.

> This is a self-directed contemplative practice, not therapy or medical advice.

---

## About Forrest Knutson

Forrest Knutson is a Kriya Yoga guru, meditation teacher, author, and online educator best known for simplifying ancient yogic and contemplative practices for modern audiences. The practice this app supports is shaped by his teaching.

### Links

- **YouTube channel** — [youtube.com/@ForrestKnutson](https://www.youtube.com/@ForrestKnutson)
- **Website / Trainings** — [meditativemellows.com](https://www.meditativemellows.com/)
- **Book — _Mastering Meditation_** — [amazon.com](https://www.amazon.com/Mastering-Meditation-Eight-Steps-Beginner-ebook/dp/B0CCFWP4W8)
- **Patreon** — [patreon.com/forrestknutson](https://www.patreon.com/forrestknutson)

### Reference videos

- [Cute Baby Meditation = Instant Metta Practice](https://www.youtube.com/watch?v=RzrjwaN2uz0) — a good entry point.
- [Cute Baby Meditation Into Bhakti Yoga](https://www.youtube.com/watch?v=upxuMuLgu00)
- [My Cute Baby & Angel Exercise Story](https://www.youtube.com/watch?v=AHwroQ186sE)

This app is **not affiliated with Forrest**, and earns no affiliate revenue from any of these links.

---

## Features

- **Your own collection, on-device.** Import photos (picker, drag-and-drop, or paste) — re-encoded to ≤2000px with a thumbnail; animated GIF/WebP kept as-is. Import videos — validated for decodability, with a poster-frame thumbnail. Nothing is uploaded.
- **Tags & captions.** A seeded tag list you can rename, delete, or extend; assign tags and edit captions per item.
- **Timed gazing sessions.** Pick a duration, optionally filter by tag, and press Start. A full-viewport takeover shows one source at a time in shuffled order, free of chrome.
- **Gesture grammar.** Press-and-hold (≥300ms) records the held feeling; a tap toggles the overlay; swipe (or ←/→) moves between images; Space holds, Esc stops. Each hold is recorded as its own event and is never merged or averaged.
- **Video with sound.** A single persistent player unlocks sound at Start (sound-on by default, mutable mid-session).
- **Completion summary & stats.** Per session: duration incl. overtime, hold count, total held time, longest hold. A Stats page aggregates lifetime totals and recent sessions.
- **Aww factor.** Each item tracks its lifetime hold count and total held time; the collection can sort by "most held".
- **Backup & restore.** Export your entire library (media, tags, sessions, hold events) to a single zip and restore it on any device — validated and applied atomically.
- **Installable PWA.** After the first load the app works fully offline and can be installed to the home screen. It makes zero network requests beyond its own assets.
- **Light / Dark / System theme** and **English / Português (Brasil)** throughout, including the Learn page.
- **No app-generated audio, ever** — videos carry the only sound. Wake Lock keeps the screen on during a session (where supported); `prefers-reduced-motion` is honored.

---

## Tech

- React 19 + TypeScript (strict), built with Vite.
- Tailwind CSS v4 via `@tailwindcss/vite`.
- Vitest + Testing Library for unit + behavior tests; `fake-indexeddb` for storage.
- ESLint (TypeScript + React Hooks + React Refresh rule packs).
- Storage: **IndexedDB** for media, thumbnails, sessions, and hold events; `localStorage` (a `cute:` prefix) for settings. Media is stored as `ArrayBuffer` + MIME, not `Blob`.
- Installable PWA via `vite-plugin-pwa` (Workbox `generateSW`, auto-update).
- No backend, no telemetry, no analytics, no third-party scripts.
- Sibling project to [HRV Breathing](https://github.com/lucindo/hrv), whose stack and architecture it reuses.

---

## Getting Started

```bash
# install
npm install

# run dev server (Vite)
npm run dev

# run the full test suite
npm test            # watch mode
npm run test:run    # single pass

# lint
npm run lint

# production build
npm run build

# preview the production build locally (needed to exercise the service worker)
npm run preview
```

Open the URL Vite prints (typically `http://localhost:5173`) — no accounts, no setup beyond `npm install`.

---

## Project Structure

```
src/
  app/            React entry — App.tsx wires the strings provider, theme,
                  the Practice / Collection modes, and the view router;
                  hosts PracticeScreen, CollectionScreen, the full-viewport
                  SessionView takeover, CompletionScreen, SettingsScreen,
                  and StatsScreen
  components/     Session overlay, tag filter, settings rows, pickers, the
                  per-item source sheet and tag manager; primitives/ holds
                  the HRV-ported building blocks (Sheet, PageShell,
                  SectionCard, SegmentedControl, TopAppBar, IconButton…)
  content/        strings (EN / PT-BR catalog), learnContent, and the
                  frozen claim-safe lockedCopy
  domain/         Pure logic — sessionMachine, shuffleBag, holdStats, stats,
                  backup, settings, image sizing, formatting, Result
  hooks/          Orchestration — useSession, useCollection, useTags,
                  useBackup, useStats, useTheme, useLocale, useWakeLock…
  media/          Import pipelines — importImage, importVideo, importFiles
  storage/        IndexedDB wrappers behind Result types (db, sources,
                  sessions, tags, backup) + the localStorage envelope
  styles/         Mono Zen palette (light + dark) as CSS tokens
  dev/            Dev-only tools (seed.ts — synthetic library seeder;
                  excluded from production builds)
public/           Icons and the PWA asset set
.project/         PROJECT.md (repo map), SPEC.md, DECISIONS.md, PLAN.md
```

---

## Privacy

- No accounts. No sign-up. No tracking pixels or analytics.
- Your media, tags, sessions, and hold events live in your browser's IndexedDB; settings live in `localStorage`. Nothing leaves the device.
- The Learn/About page opens external links (YouTube, Patreon, Amazon, Forrest's site) in new tabs — clicking one is the same as any other outbound link in your browser.

---

## License

This project is licensed under the **MIT License** — see [`LICENSE`](LICENSE) for the full text.

As a courtesy — not a license term — if you adapt or build on this app, please continue to credit Forrest Knutson as the source of the practice. References to Forrest Knutson here are attribution and inspiration only; his name and content remain his.
