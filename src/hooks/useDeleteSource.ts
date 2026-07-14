// Delete action for the Collection screen: tombstones one source on its own
// connection, then announces the change so useCollection reloads. Mirrors
// useImportFiles — one delete at a time, ref guard for stale closures.

import { useCallback, useRef, useState } from 'react'

import { COLLECTION_CHANGED_EVENT } from './useCollection'
import { deleteSource, openDb, type StorageError } from '../storage'

export type DeleteState =
  | { status: 'idle' }
  | { status: 'deleting' }
  | { status: 'error'; error: StorageError }

export interface UseDeleteSource {
  deleteState: DeleteState
  deleteById: (id: string) => void
}

export function useDeleteSource(): UseDeleteSource {
  const [deleteState, setDeleteState] = useState<DeleteState>({ status: 'idle' })
  const busy = useRef(false)

  const deleteById = useCallback((id: string): void => {
    if (busy.current) return
    busy.current = true
    setDeleteState({ status: 'deleting' })
    void (async () => {
      const opened = await openDb()
      if (!opened.ok) {
        setDeleteState({ status: 'error', error: opened.error })
        busy.current = false
        return
      }
      const deleted = await deleteSource(opened.value, id)
      opened.value.close()
      if (!deleted.ok) {
        setDeleteState({ status: 'error', error: deleted.error })
        busy.current = false
        return
      }
      setDeleteState({ status: 'idle' })
      busy.current = false
      window.dispatchEvent(new Event(COLLECTION_CHANGED_EVENT))
    })()
  }, [])

  return { deleteState, deleteById }
}
