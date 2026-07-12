import { useCallback, useState } from 'react'

import { loadPrefs, savePrefs } from '../storage'

// Session duration in minutes, seeded from the last-used pref and persisted on
// every change (SPEC FR-23, AC-22). Reads the full prefs before writing so the
// duration write never clobbers other fields (e.g. locale).
export function useSessionDuration(): { duration: number; setDuration: (min: number) => void } {
  const [duration, setDurationState] = useState<number>(() => loadPrefs().sessionDurationMin)

  const setDuration = useCallback((min: number): void => {
    setDurationState(min)
    savePrefs({ ...loadPrefs(), sessionDurationMin: min })
  }, [])

  return { duration, setDuration }
}
