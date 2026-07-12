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
| `src/app/` | `App.tsx` — strings provider + Practice/Collection mode state; `CollectionScreen` (import UI, thumbnails-only grid, storage gauge, Import + Edit-tags toolbar, per-item `SourceSheet`, `TagManagerSheet`); placeholder `PracticeScreen`. |
| `src/components/` | `ModeToggle` (mode switcher); `SourceSheet` (per-item bottom sheet as a **staged editor** — draft caption + tag set, persisted only on Save via `updateSource`, discard-confirm on close); `TagAssignPanel` (tag chips driving the sheet's draft, mixed-state aware — still shaped for multi-source selection); `TagManager` (rename + confirmed-delete tag list); `TagManagerSheet` (`TagManager` hosted in the `Sheet` shell); `ConfirmDialog` (confirm dialog on `Sheet`); `primitives/Sheet` (native `<dialog>` shell — bottom sheet on mobile, centered card on desktop, ported from HRV), `primitives/PageShell` (width-capped page frame). |
| `src/content/strings.ts` | Typed EN/PT-BR UI-string catalog incl. seeded tag names — all copy lives here, never inline in components. |
| `src/domain/` | Pure logic: `settings.ts` (locale ids + validation), `result.ts` (`Result`/`ok`/`err`), `image.ts` (fit-within sizing, animated GIF/WebP byte detection), `format.ts` (`formatBytes`), `id.ts` (`newId` — UUID v4 with insecure-origin fallback), `tags.ts` (seeded tag ids + `tagDisplayName` locale resolution). |
| `src/hooks/` | `useLocale` (locale orchestration, cross-/same-tab pref sync), `useUiStringsContext` (strings context), `useCollection` (live source list + thumb URLs + own-bytes total, refreshes on `cute:collection-changed`), `useImportFiles` (batch import state), `useDeleteSource` (confirm + tombstone delete state), `useSaveSource` (staged caption+tags save via atomic `updateSource`), `useStorageQuota` (quota via `navigator.storage.estimate()`), `useTags` (tag catalog read model + rename/delete/create mutations — `create` resolves the new tag id so the sheet can stage its assignment; announces `cute:tags-changed`). |
| `src/media/` | Import pipelines: `importImage.ts` (decode → ≤2000px re-encode + thumb, animated passthrough), `importVideo.ts` (decodability probe + poster-frame thumbnail, bytes as-is), `importFiles.ts` (batch orchestration, per-file rejection). |
| `src/storage/` | `db.ts` (IndexedDB `cute-db` **v3**: `sources`/`blobs`/`thumbs`/`sessions`/`holdEvents`/`tags` behind `Result` wrappers, atomic `writeMany`; media stored as ArrayBuffer+MIME, not Blob; v2 rung seeds tags, v3 rung clears media stores), `tags.ts` (`createTag`/`renameTag`/`deleteTag` — sources reference tags by id; delete strips the id from every source in one tx), `sources.ts` (`deleteSource` tombstone: blob+thumb removed, record kept; `updateSource`: atomic caption+tags write, empty caption clears the field), `prefs.ts` (coerce-and-fallback prefs), `storage.ts` (localStorage envelope `cute:state:v1`), `persistence.ts` (`navigator.storage.persist()`). Barrel `index.ts`. |
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
