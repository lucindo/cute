// Save the per-item sheet's staged edits: writes one source's caption and tags
// in a single update on its own connection, then announces so useCollection
// reloads. Mirrors useDeleteSource — one write at a time, ref guard for stale
// closures.

import { useCallback, useRef, useState } from 'react'

import { COLLECTION_CHANGED_EVENT } from './useCollection'
import { openDb, updateSource, type StorageError } from '../storage'

export interface SourceEdits {
  caption: string
  tags: string[]
}

export type SaveSourceState =
  | { status: 'idle' }
  | { status: 'saving' }
  | { status: 'error'; error: StorageError }

export interface UseSaveSource {
  saveState: SaveSourceState
  saveSource: (id: string, edits: SourceEdits) => void
}

export function useSaveSource(): UseSaveSource {
  const [saveState, setSaveState] = useState<SaveSourceState>({ status: 'idle' })
  const busy = useRef(false)

  const saveSource = useCallback((id: string, edits: SourceEdits): void => {
    if (busy.current) return
    busy.current = true
    setSaveState({ status: 'saving' })
    void (async () => {
      const opened = await openDb()
      if (!opened.ok) {
        setSaveState({ status: 'error', error: opened.error })
        busy.current = false
        return
      }
      const saved = await updateSource(opened.value, id, edits)
      opened.value.close()
      if (!saved.ok) {
        setSaveState({ status: 'error', error: saved.error })
        busy.current = false
        return
      }
      setSaveState({ status: 'idle' })
      busy.current = false
      window.dispatchEvent(new Event(COLLECTION_CHANGED_EVENT))
    })()
  }, [])

  return { saveState, saveSource }
}
