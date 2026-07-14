// Generic picker-side hook for a single UserPrefs field (theme, locale). Owns
// the picker's optimistic local state plus a setter that writes the merged
// envelope and dispatches PREFS_CHANGED_EVENT so App-side hooks (useTheme,
// useLocale) re-apply. The browser 'storage' event does not fire in the writing
// tab, so this custom event is the only same-tab path back to those hooks.

import { useCallback, useState } from 'react'

import { loadPrefs, PREFS_CHANGED_EVENT, savePrefs, type UserPrefs } from '../storage'

export function usePreferenceChoice<K extends keyof UserPrefs>(
  key: K,
): readonly [UserPrefs[K], (next: UserPrefs[K]) => void] {
  const [value, setValue] = useState<UserPrefs[K]>(() => loadPrefs()[key])

  const set = useCallback(
    (next: UserPrefs[K]): void => {
      // Fresh read so the other pref fields survive the merge (never a stale
      // mount-time closure); loadPrefs() returns a fresh object to mutate.
      const updated = loadPrefs()
      updated[key] = next
      savePrefs(updated)
      setValue(next)
      window.dispatchEvent(new CustomEvent(PREFS_CHANGED_EVENT, { detail: { key, value: next } }))
    },
    [key],
  )

  return [value, set]
}
