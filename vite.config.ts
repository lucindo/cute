import { execSync } from 'node:child_process'

import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vitest/config'

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
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './vitest.setup.ts',
    // Scope to our source — keeps the gitignored .reference/ HRV clone out of the run.
    include: ['src/**/*.test.{ts,tsx}'],
  },
})
