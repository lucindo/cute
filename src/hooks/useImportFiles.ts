// Import action for the Collection screen: runs a file batch through
// importFiles on its own connection, then announces the change so
// useCollection reloads. One batch at a time — the ref guard stays correct
// inside stale closures (paste/drop listeners registered in effects).

import { useCallback, useRef, useState } from 'react'

import { COLLECTION_CHANGED_EVENT } from './useCollection'
import { importFiles, type FileRejection } from '../media/importFiles'
import { openDb } from '../storage'

export type ImportState =
  | { status: 'idle' }
  | { status: 'importing' }
  | { status: 'done'; imported: number; rejected: { name: string; rejection: FileRejection }[] }

export interface UseImportFiles {
  importState: ImportState
  importFrom: (files: File[]) => void
}

export function useImportFiles(): UseImportFiles {
  const [importState, setImportState] = useState<ImportState>({ status: 'idle' })
  const busy = useRef(false)

  const importFrom = useCallback((files: File[]): void => {
    if (busy.current || files.length === 0) return
    busy.current = true
    setImportState({ status: 'importing' })
    void (async () => {
      const opened = await openDb()
      if (!opened.ok) {
        setImportState({
          status: 'done',
          imported: 0,
          rejected: files.map((file) => ({
            name: file.name,
            rejection: { reason: 'storage-failed', error: opened.error },
          })),
        })
        busy.current = false
        return
      }
      const outcome = await importFiles(opened.value, files)
      opened.value.close()
      setImportState({
        status: 'done',
        imported: outcome.imported.length,
        rejected: outcome.rejected,
      })
      busy.current = false
      if (outcome.imported.length > 0) {
        window.dispatchEvent(new Event(COLLECTION_CHANGED_EVENT))
      }
    })().catch((cause: unknown) => {
      // An unexpected throw must never strand the UI in 'importing' — surface
      // it as a whole-batch rejection instead.
      setImportState({
        status: 'done',
        imported: 0,
        rejected: files.map((file) => ({
          name: file.name,
          rejection: {
            reason: 'storage-failed',
            error: { name: 'UnknownError', message: String(cause) },
          },
        })),
      })
      busy.current = false
    })
  }, [])

  return { importState, importFrom }
}
