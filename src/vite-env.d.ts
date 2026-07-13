/// <reference types="vite/client" />

// Injected by vite.config.ts `define` at build time so the About row reflects
// the shipped code without bumping package.json per commit. Global (not an
// import) so any component can read them directly.
declare const __APP_VERSION__: string
declare const __APP_BUILD_SHA__: string
declare const __APP_BUILD_DATE__: string
