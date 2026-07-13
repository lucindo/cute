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
| `src/app/` | `App.tsx` — strings provider, applies theme via `useTheme`, Practice/Collection mode, a `view` router (`shell\|settings\|stats`), session-request state, and the app-level persistent `<video>` (branches between the `PageShell` shell, the settings/stats sub-pages, and the full-viewport `SessionView` takeover); `PracticeScreen` (session setup — duration stepper + `TagFilter` + pool-guarded Start, grouped in a `SectionCard`); `CollectionScreen` (import UI, thumbnails-only grid, storage gauge, per-item `SourceSheet`, `TagManagerSheet`); `SessionView` (running-session takeover — media display + pointer/keyboard gesture grammar, drives `useSession`, branches running/complete); `CompletionScreen` (post-session summary); `SettingsScreen` (gear-reached page — Statistics nav row, Theme/Language pickers, About/version + `Source →`); `StatsScreen` (lifetime totals + recent-session list, read-aggregated by `useStats`). |
| `src/components/` | `SessionOverlay` (session clock/countdown/overtime/stop + pulsing hold indicator); `TagFilter` (session-local tag chips); `SettingsRow` + `SettingsStepper` (ported HRV settings-row chrome); `SettingsSectionHeader` (quiet uppercase section label); `ThemePicker` / `LanguagePicker` (settings pickers over `usePreferenceChoice`); `SourceSheet` (per-item **staged editor** — draft caption+tags, saved on Save via `updateSource`, discard-confirm on close); `TagAssignPanel` (mixed-state tag chips); `TagManager` + `TagManagerSheet` (rename/confirmed-delete tag list in a `Sheet`); `ConfirmDialog` (confirm on `Sheet`); `icons/` — `GearIcon`, `ChevronBackIcon`, `ChevronRightIcon`, `SpeakerIcon`, `SpeakerMutedIcon`; `primitives/` — `Sheet` (native `<dialog>` shell), `PageShell` (width-capped frame), `SectionCard` (surface+border card), `SegmentedControl` (mode/segment switcher), `TopAppBar` (header), `IconButton` (square icon button), `PickerCardGrid` (swatch-card option grid). All ported from HRV, `--color-breathing-*` → `--color-zen-*`. |
| `src/content/strings.ts` | Typed EN/PT-BR UI-string catalog (shell/practice/session/collection/tags) incl. seeded tag names — all copy lives here, never inline in components. |
| `src/domain/` | Pure logic: `session.ts` (duration constants 1–30/default 5 + `sourceMatchesFilter`), `sessionMachine.ts` (running-session state machine — time-injected transitions: press/hold classify, advance/back history, tick/overtime, stop/hide, `sessionFrame`, `summarize`), `shuffleBag.ts` (shuffle-bag ordering, boundary-guarded, injected RNG), `settings.ts` (locale + theme ids, validation, `resolveTheme`/`coerceTheme`), `holdStats.ts` (`aggregateHoldStats` — per-source lifetime hold count/time for aww factor), `stats.ts` (`aggregateStats` — lifetime totals + recent-session list, routed through `summarize`), `result.ts` (`Result`/`ok`/`err`), `image.ts` (fit-within sizing, animated GIF/WebP byte detection), `format.ts` (`formatBytes`, `formatDuration`, `formatTotalDuration`), `id.ts` (`newId` — UUID v4 with insecure-origin fallback), `tags.ts` (seeded tag ids + `tagDisplayName`). |
| `src/hooks/` | `useSession` (session orchestration — machine state + wall-clock tick loop, media load from IndexedDB, persistence on completion, wake lock), `useSessionDuration` (persisted last-used duration pref), `useVideoSound` (persisted video-sound pref), `useWakeLock` (Screen Wake Lock, progressive), `useLocale` (locale orchestration + cross-/same-tab sync), `useTheme` (applies `data-theme` from the tri-state pref, `system`-gated matchMedia listener), `usePreferenceChoice` (generic pref writer → `cute:prefs-changed`, backs Theme/Language pickers), `useUiStringsContext`, `useCollection` (live sources + thumb URLs + own-bytes total, `cute:collection-changed`), `useImportFiles`, `useDeleteSource`, `useSaveSource`, `useStorageQuota` (`navigator.storage.estimate()`), `useStats` (load-once + `aggregateStats`), `useTags` (tag catalog read model + mutations, `cute:tags-changed`). |
| `src/media/` | Import pipelines: `importImage.ts` (decode → ≤2000px re-encode + thumb, animated passthrough), `importVideo.ts` (decodability probe + poster-frame thumbnail, bytes as-is), `importFiles.ts` (batch orchestration, per-file rejection). |
| `src/storage/` | `db.ts` (IndexedDB `cute-db` **v3**: `sources`/`blobs`/`thumbs`/`sessions`/`holdEvents`/`tags` behind `Result` wrappers, atomic `writeMany`; media stored as ArrayBuffer+MIME, not Blob; v2 rung seeds tags, v3 rung clears media stores), `sessions.ts` (`saveCompletedSession` — session record + hold events, hold ids assigned here, one tx), `tags.ts` (`createTag`/`renameTag`/`deleteTag` — sources reference tags by id; delete strips the id from every source in one tx), `sources.ts` (`deleteSource` tombstone: blob+thumb removed, record kept; `updateSource`: atomic caption+tags write), `prefs.ts` (coerce-and-fallback prefs), `storage.ts` (localStorage envelope `cute:state:v1`), `persistence.ts` (`navigator.storage.persist()`). Barrel `index.ts`. |
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
