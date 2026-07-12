// App-side orchestrator hook for the theme dimension, mirroring useLocale's
// 3-effect structure:
//   Effect 1 (apply, dep [theme]): writes <html data-theme>. When the pref is
//     'system' it also attaches a matchMedia listener so an OS-preference flip
//     re-applies live — gated on 'system' so light/dark never leave a listener.
//   Effect 2 (cross-tab 'storage'): re-reads loadPrefs().theme.
//   Effect 3 (same-tab PREFS_CHANGED_EVENT): re-reads on theme key or undefined.
//
// useTheme does NOT call savePrefs — the picker-side setter owns the write path.

import { useEffect, useState } from 'react'

import { resolveTheme, type ThemeId } from '../domain/settings'
import { loadPrefs, PREFS_CHANGED_EVENT, STATE_KEY } from '../storage'

export function useTheme(): void {
  const [theme, setTheme] = useState<ThemeId>(() => loadPrefs().theme)

  useEffect(() => {
    const mql = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = (): void => {
      document.documentElement.setAttribute('data-theme', resolveTheme(theme, mql.matches))
    }
    apply()
    if (theme !== 'system') return
    mql.addEventListener('change', apply)
    return () => {
      mql.removeEventListener('change', apply)
    }
  }, [theme])

  useEffect(() => {
    const onStorage = (e: StorageEvent): void => {
      if (e.key === STATE_KEY) {
        setTheme(loadPrefs().theme)
      }
    }
    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener('storage', onStorage)
    }
  }, [])

  useEffect(() => {
    const onPrefsChanged = (e: Event): void => {
      if (!(e instanceof CustomEvent)) return
      const detail: unknown = e.detail
      const key =
        typeof detail === 'object' && detail !== null
          ? (detail as { key?: unknown }).key
          : undefined
      if (key === undefined || key === 'theme') {
        setTheme(loadPrefs().theme)
      }
    }
    window.addEventListener(PREFS_CHANGED_EVENT, onPrefsChanged)
    return () => {
      window.removeEventListener(PREFS_CHANGED_EVENT, onPrefsChanged)
    }
  }, [])
}
