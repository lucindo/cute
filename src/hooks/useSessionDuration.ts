import { useCallback, useState } from 'react'

import { loadPrefs, savePrefs } from '../storage'

// Session duration in minutes, seeded from the last-used pref and persisted on
// every change (SPEC FR-23, AC-22). Reads the full prefs before writing so the
// duration write never clobbers other fields (e.g. locale).
export function useSessionDuration(): {
  durationMin: number
  setDurationMin: (min: number) => void
} {
  const [durationMin, setDurationMinState] = useState<number>(() => loadPrefs().sessionDurationMin)

  const setDurationMin = useCallback((min: number): void => {
    setDurationMinState(min)
    savePrefs({ ...loadPrefs(), sessionDurationMin: min })
  }, [])

  return { durationMin, setDurationMin }
}
