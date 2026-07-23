// Clear-history action for the Stats screen: wipes every session and hold event
// on its own connection, then announces the change so both the Stats view and
// the Collection's aww cards reload. Mirrors useDeleteSource — one clear at a
// time, ref guard for stale closures.

import { useCallback, useRef, useState } from 'react'

import { COLLECTION_CHANGED_EVENT } from './useCollection'
import { clearHistory, openDb, type StorageError } from '../storage'

export type ClearHistoryState =
  | { status: 'idle' }
  | { status: 'clearing' }
  | { status: 'error'; error: StorageError }

export interface UseClearHistory {
  clearState: ClearHistoryState
  clear: () => void
}

export function useClearHistory(): UseClearHistory {
  const [clearState, setClearState] = useState<ClearHistoryState>({ status: 'idle' })
  const busy = useRef(false)

  const clear = useCallback((): void => {
    if (busy.current) return
    busy.current = true
    setClearState({ status: 'clearing' })
    void (async () => {
      const opened = await openDb()
      if (!opened.ok) {
        setClearState({ status: 'error', error: opened.error })
        busy.current = false
        return
      }
      const cleared = await clearHistory(opened.value)
      opened.value.close()
      if (!cleared.ok) {
        setClearState({ status: 'error', error: cleared.error })
        busy.current = false
        return
      }
      setClearState({ status: 'idle' })
      busy.current = false
      window.dispatchEvent(new Event(COLLECTION_CHANGED_EVENT))
    })()
  }, [])

  return { clearState, clear }
}
