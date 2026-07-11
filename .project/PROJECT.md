# Cute Baby Meditation

## Overview

A private, browser-based app for the Cute Baby Meditation — a Mettā practice
(from Forrest Knutson's teaching, after Buddhaghosa's Visuddhimagga): gaze at
the cutest photos/videos you've collected, hold the "aww" feeling, repeat. The
app hosts the user's own media collection on-device, runs timed gazing sessions
that record each held feeling as a granular event, and keeps a practice log.
No accounts, no backend, no tracking. Sibling project to HRV Breathing
(github.com/lucindo/hrv), whose stack and architecture it reuses; a reference
clone lives at `.reference/hrv` (gitignored, consultation only).

Full requirements: `.project/SPEC.md` · design rationale: `.project/DECISIONS.md`
· work order: `.project/PLAN.md`.

## Stack

- **Language / runtime:** TypeScript (`~6.0.2`) strict, React 19, browser only.
- **Build:** Vite 8 (`vite.config.ts`, base `/cute/`), Tailwind CSS 4 via `@tailwindcss/vite`. PWA plugin not yet added (planned).
- **Test:** Vitest 4 + Testing Library + jsdom; `fake-indexeddb` (injected per-test factories) for IndexedDB; polyfills in `vitest.setup.ts` (localStorage, `<dialog>`, matchMedia, wakeLock — no AudioContext, app is audio-free). Tests colocated, scoped to `src/`.
- **Lint:** ESLint 10 (`eslint.config.js`) — strictTypeChecked + React Hooks/Refresh; `.reference` ignored.
- **Runtime deps:** `react`, `react-dom`, `@fontsource-variable/inter` (cap includes planned `fflate` for backup zips; nothing else allowed).
- **Commands:** `npm run dev` · `npm test` (watch) · `npm run test:run` · `npm run lint` · `npm run build` · `npm run preview`.
- **Entry:** `index.html` (pre-paint `data-theme` script) → `src/main.tsx` (fires the storage-persistence request) → `src/app/App.tsx`.

## Repo map

Layout mirrors HRV: pure logic in `src/domain/`, storage wrappers in
`src/storage/`, hooks orchestrate, components render.

| Path | Holds |
|------|-------|
| `src/app/` | `App.tsx` — strings provider + Practice/Collection mode state; placeholder `PracticeScreen`/`CollectionScreen`. |
| `src/components/` | `ModeToggle` (mode switcher); `primitives/PageShell` (width-capped page frame). |
| `src/content/strings.ts` | Typed EN/PT-BR UI-string catalog — all copy lives here, never inline in components. |
| `src/domain/` | Pure logic: `settings.ts` (locale ids + validation), `result.ts` (`Result`/`ok`/`err`). |
| `src/hooks/` | `useLocale` (locale orchestration, cross-/same-tab pref sync), `useUiStringsContext` (strings context). |
| `src/media/` | Import pipelines: `importImage.ts` (decode → ≤2000px re-encode + thumb, animated passthrough), `importFiles.ts` (batch orchestration, per-file rejection). |
| `src/storage/` | `storage.ts` (localStorage envelope `cute:state:v1`), `prefs.ts` (coerce-and-fallback prefs), `db.ts` (IndexedDB `cute-db` v1: `sources`/`blobs`/`thumbs`/`sessions`/`holdEvents` behind `Result` wrappers, atomic `writeMany`), `persistence.ts` (`navigator.storage.persist()`). Barrel `index.ts`. |
| `src/styles/theme.css` | Mono Zen palette, light + dark, as `--color-zen-*` Tailwind tokens; dialog fade, shadows, page gradient. |
| `src/index.css` | Tailwind entry, font, base layer. |
| `public/` | `favicon.svg` (placeholder heart). |
| `.project/` | Project docs: `PROJECT.md`, `SPEC.md`, `DECISIONS.md`, `PLAN.md`, `config.md`. |
| `.reference/hrv` | Gitignored clone of HRV Breathing — port source and pattern reference, never committed. |

## Constraints

- **No backend, telemetry, analytics, or third-party scripts.** No runtime network requests beyond static assets/PWA updates.
- **No app-generated audio, ever** — no ambient, no chime; videos carry the only sound. HRV's `src/audio/` layer is deliberately not ported.
- **Storage split:** media/thumbnails/sessions/hold-events in IndexedDB; settings/prefs in localStorage under a `cute:` prefix (origin is shared with HRV on lucindo.github.io — collisions corrupt both apps).
- **Granular data is sacred:** each hold is one event; never pre-aggregate, merge, or discard at write time.
- **No Fullscreen API** — sessions use CSS full-viewport takeover (iPhone Safari support + Esc-key conflict).
- **TypeScript strict, no `any`;** `Result` types at boundaries; runtime deps capped per Stack section.
- **Honor `prefers-reduced-motion`;** wake lock is progressive enhancement.
- Full constraint list with rationale: `.project/SPEC.md` §Constraints, `.project/DECISIONS.md`.
