// Caption edit for the Collection screen: writes one source's caption on its
// own connection, then announces the change so useCollection reloads. Mirrors
// useDeleteSource — one write at a time, ref guard for stale closures.

import { useCallback, useRef, useState } from 'react'

import { COLLECTION_CHANGED_EVENT } from './useCollection'
import { openDb, setCaption, type StorageError } from '../storage'

export type SetCaptionState =
  | { status: 'idle' }
  | { status: 'saving' }
  | { status: 'error'; error: StorageError }

export interface UseSetCaption {
  captionState: SetCaptionState
  setCaptionFor: (id: string, caption: string) => void
}

export function useSetCaption(): UseSetCaption {
  const [captionState, setCaptionState] = useState<SetCaptionState>({ status: 'idle' })
  const busy = useRef(false)

  const setCaptionFor = useCallback((id: string, caption: string): void => {
    if (busy.current) return
    busy.current = true
    setCaptionState({ status: 'saving' })
    void (async () => {
      const opened = await openDb()
      if (!opened.ok) {
        setCaptionState({ status: 'error', error: opened.error })
        busy.current = false
        return
      }
      const saved = await setCaption(opened.value, id, caption)
      opened.value.close()
      if (!saved.ok) {
        setCaptionState({ status: 'error', error: saved.error })
        busy.current = false
        return
      }
      setCaptionState({ status: 'idle' })
      busy.current = false
      window.dispatchEvent(new Event(COLLECTION_CHANGED_EVENT))
    })()
  }, [])

  return { captionState, setCaptionFor }
}
