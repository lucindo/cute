// Import actions for the Collection screen: picker/drop files, or a clipboard
// paste, each run through importFiles on its own connection, then announced so
// useCollection reloads. One batch at a time — the ref guard stays correct
// inside stale closures (paste/drop listeners registered in effects).

import { useCallback, useRef, useState } from 'react'

import { COLLECTION_CHANGED_EVENT } from './useCollection'
import { readClipboardMedia } from '../media/clipboard'
import { importFiles, type FileRejection } from '../media/importFiles'
import { openDb } from '../storage'

type Rejected = { name: string; rejection: FileRejection }

export type ImportState =
  | { status: 'idle' }
  | { status: 'importing' }
  | { status: 'clipboard-empty' }
  | { status: 'done'; imported: number; rejected: Rejected[] }

export interface UseImportFiles {
  importState: ImportState
  importFrom: (files: File[]) => void
  pasteFromClipboard: () => void
}

// `carried` holds rejections from before storage was involved — a paste that
// resolved some items and refused others still reports both together.
async function importBatch(files: File[], carried: Rejected[]): Promise<ImportState> {
  const opened = await openDb()
  if (!opened.ok) {
    return {
      status: 'done',
      imported: 0,
      rejected: [
        ...carried,
        ...files.map((file) => ({
          name: file.name,
          rejection: { reason: 'storage-failed' as const, error: opened.error },
        })),
      ],
    }
  }
  const outcome = await importFiles(opened.value, files)
  opened.value.close()
  if (outcome.imported.length > 0) {
    window.dispatchEvent(new Event(COLLECTION_CHANGED_EVENT))
  }
  return {
    status: 'done',
    imported: outcome.imported.length,
    rejected: [...carried, ...outcome.rejected],
  }
}

export function useImportFiles(): UseImportFiles {
  const [importState, setImportState] = useState<ImportState>({ status: 'idle' })
  const busy = useRef(false)

  const start = useCallback((task: () => Promise<ImportState>, files: readonly File[]): void => {
    if (busy.current) return
    busy.current = true
    setImportState({ status: 'importing' })
    void task()
      .then(setImportState)
      .catch((cause: unknown) => {
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
      })
      .finally(() => {
        busy.current = false
      })
  }, [])

  const importFrom = useCallback(
    (files: File[]): void => {
      if (files.length === 0) return
      start(() => importBatch(files, []), files)
    },
    [start],
  )

  const pasteFromClipboard = useCallback((): void => {
    start(async () => {
      const read = await readClipboardMedia()
      // Refusing the system paste prompt is a choice, not an error — say nothing.
      if (!read.ok) return { status: 'idle' }
      const { files, rejected } = read.value
      if (files.length === 0 && rejected.length === 0) return { status: 'clipboard-empty' }
      return importBatch(files, rejected)
    }, [])
  }, [start])

  return { importState, importFrom, pasteFromClipboard }
}
