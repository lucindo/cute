import { execSync } from 'node:child_process'

import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vitest/config'
import { VitePWA } from 'vite-plugin-pwa'

import packageJson from './package.json' with { type: 'json' }

// Short git SHA + ISO build date so the About row always reflects the actual
// code shipped, even though package.json.version doesn't bump per commit.
// try/catch: non-git builds (CI without depth, vitest in a worktree) fall back
// to safe placeholders instead of crashing the config.
function resolveBuildSha(): string {
  try {
    return execSync('git rev-parse --short=7 HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim()
  } catch {
    return 'dev'
  }
}

const BUILD_SHA = resolveBuildSha()
const BUILD_DATE = new Date().toISOString().slice(0, 10) // YYYY-MM-DD

export default defineConfig({
  base: '/cute/',
  define: {
    // Stringified at config-time; the bundle gets plain literals, not a
    // runtime require of package.json.
    __APP_VERSION__: JSON.stringify(packageJson.version),
    __APP_BUILD_SHA__: JSON.stringify(BUILD_SHA),
    __APP_BUILD_DATE__: JSON.stringify(BUILD_DATE),
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      strategies: 'generateSW',
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: [
        'favicon.svg',
        'apple-touch-icon.png',
        'pwa-192x192.png',
        'pwa-512x512.png',
        'pwa-maskable-192x192.png',
        'pwa-maskable-512x512.png',
      ],
      manifest: {
        name: 'Cute Baby Meditation',
        short_name: 'Cute Baby',
        description: 'A private Mettā gazing practice — hold the aww, on-device.',
        theme_color: '#1a1d24',
        background_color: '#1a1d24',
        display: 'standalone',
        // start_url and scope omitted — they auto-default to the Vite base (/cute/).
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'pwa-maskable-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: 'pwa-maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,woff2}'],
        // Locales are EN + pt-BR (both Latin-script). Latin + Latin-ext woff2
        // still precache; the other Inter subsets ship to dist/ but stay out of
        // the SW install to trim the precache.
        globIgnores: ['**/inter-{cyrillic,cyrillic-ext,greek,greek-ext,vietnamese}-*.woff2'],
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './vitest.setup.ts',
    // Scope to our source — keeps the gitignored .reference/ HRV clone out of the run.
    include: ['src/**/*.test.{ts,tsx}'],
  },
})
