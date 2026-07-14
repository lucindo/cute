// Backup actions for Settings (SPEC FR-20/21/22): export downloads a zip of the
// whole library; restore reads a zip, replaces all state, and announces the
// change so the grid and stats reload. Each runs on its own connection; one
// action at a time via the ref guard.

import { useCallback, useRef, useState } from 'react'

import { COLLECTION_CHANGED_EVENT } from './useCollection'
import { TAGS_CHANGED_EVENT } from './useTags'
import { exportBackup, importBackup, openDb, type StorageError } from '../storage'

export type BackupState =
  | { status: 'idle' }
  | { status: 'working' }
  | { status: 'error'; error: StorageError }

export interface BackupDeps {
  // Seam for the download leaf (anchor + object URL), stubbed in tests.
  download?: (blob: Blob, filename: string) => void
}

export interface UseBackup {
  backupState: BackupState
  exportNow: () => void
  restore: (file: File) => void
}

export function useBackup(deps: BackupDeps = {}): UseBackup {
  const download = deps.download ?? triggerDownload
  const [backupState, setBackupState] = useState<BackupState>({ status: 'idle' })
  const busy = useRef(false)

  const exportNow = useCallback((): void => {
    if (busy.current) return
    busy.current = true
    setBackupState({ status: 'working' })
    void (async () => {
      const opened = await openDb()
      if (!opened.ok) {
        finishError(opened.error)
        return
      }
      const result = await exportBackup(opened.value)
      opened.value.close()
      if (!result.ok) {
        finishError(result.error)
        return
      }
      // Copy off fflate's ArrayBufferLike view into a plain ArrayBuffer so the
      // bytes are a valid BlobPart; Blob copies the data regardless.
      const zip = new Uint8Array(result.value)
      download(new Blob([zip], { type: 'application/zip' }), backupFilename())
      busy.current = false
      setBackupState({ status: 'idle' })
    })().catch(finishUnexpected)

    function finishError(error: StorageError): void {
      busy.current = false
      setBackupState({ status: 'error', error })
    }
    function finishUnexpected(cause: unknown): void {
      finishError({ name: 'UnknownError', message: String(cause) })
    }
  }, [download])

  const restore = useCallback((file: File): void => {
    if (busy.current) return
    busy.current = true
    setBackupState({ status: 'working' })
    void (async () => {
      const bytes = new Uint8Array(await file.arrayBuffer())
      const opened = await openDb()
      if (!opened.ok) {
        finishError(opened.error)
        return
      }
      const result = await importBackup(opened.value, bytes)
      opened.value.close()
      if (!result.ok) {
        finishError(result.error)
        return
      }
      // Restore replaced sources and tags wholesale; wake both read models.
      window.dispatchEvent(new Event(COLLECTION_CHANGED_EVENT))
      window.dispatchEvent(new Event(TAGS_CHANGED_EVENT))
      busy.current = false
      setBackupState({ status: 'idle' })
    })().catch(finishUnexpected)

    function finishError(error: StorageError): void {
      busy.current = false
      setBackupState({ status: 'error', error })
    }
    function finishUnexpected(cause: unknown): void {
      finishError({ name: 'UnknownError', message: String(cause) })
    }
  }, [])

  return { backupState, exportNow, restore }
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  // Defer the revoke: iOS Safari can cancel an in-flight download if the object
  // URL dies in the same tick as the click.
  setTimeout(() => { URL.revokeObjectURL(url) }, 0)
}

function backupFilename(): string {
  const now = new Date()
  const stamp = `${String(now.getFullYear())}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
  return `cute-backup-${stamp}.zip`
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}
