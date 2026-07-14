import { useCallback, useState } from 'react'

import { loadPrefs, savePrefs } from '../storage'

// In-session video sound, seeded from the pref (default on) and persisted on
// every change (SPEC FR-35). Reads the full prefs before writing so the sound
// write never clobbers other fields (e.g. locale).
export function useVideoSound(): { soundOn: boolean; setSoundOn: (on: boolean) => void } {
  const [soundOn, setSoundOnState] = useState<boolean>(() => loadPrefs().videoSound)

  const setSoundOn = useCallback((on: boolean): void => {
    setSoundOnState(on)
    savePrefs({ ...loadPrefs(), videoSound: on })
  }, [])

  return { soundOn, setSoundOn }
}
