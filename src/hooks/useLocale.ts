// App-side orchestrator hook for the locale dimension.
//
// 3-effect structure (HRV pattern):
//   Effect 1 (apply lang, dep [locale]): writes the <html lang> attribute.
//   Effect 2 (cross-tab 'storage', empty deps): re-reads loadPrefs().locale.
//   Effect 3 (same-tab PREFS_CHANGED_EVENT, empty deps): re-reads on locale
//     key or undefined (undefined = "re-read all prefs").
//
// useLocale does NOT call savePrefs — the picker-side hook owns the write path.

import { useEffect, useState } from 'react'

import { loadPrefs, PREFS_CHANGED_EVENT, STATE_KEY } from '../storage'
import type { LocaleId } from '../domain/settings'
import { UI_STRINGS, type UiStrings } from '../content/strings'

export function useLocale(): { locale: LocaleId; uiStrings: UiStrings } {
  const [locale, setLocale] = useState<LocaleId>(() => loadPrefs().locale)

  useEffect(() => {
    document.documentElement.lang = locale
  }, [locale])

  useEffect(() => {
    const onStorage = (e: StorageEvent): void => {
      if (e.key === STATE_KEY) {
        setLocale(loadPrefs().locale)
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
      if (key === undefined || key === 'locale') {
        setLocale(loadPrefs().locale)
      }
    }
    window.addEventListener(PREFS_CHANGED_EVENT, onPrefsChanged)
    return () => {
      window.removeEventListener(PREFS_CHANGED_EVENT, onPrefsChanged)
    }
  }, [])

  return { locale, uiStrings: UI_STRINGS[locale] }
}
