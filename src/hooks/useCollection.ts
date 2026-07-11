// Collection read model: live (non-tombstoned) sources, newest first, each
// with an object URL for its thumbnail. Owns the URL lifecycle — revokes on
// replace and on unmount. Importers dispatch COLLECTION_CHANGED_EVENT after
// writing; the native 'storage' event has no IndexedDB equivalent.

import { useEffect, useState } from 'react'

import { getAllRecords, openDb, type SourceRecord, type StorageError } from '../storage'

export const COLLECTION_CHANGED_EVENT = 'cute:collection-changed'

export type CollectionSource = SourceRecord & { thumbUrl: string | null }

export type CollectionState =
  | { status: 'loading' }
  | { status: 'error'; error: StorageError }
  | { status: 'ready'; sources: CollectionSource[] }

export function useCollection(): CollectionState {
  const [state, setState] = useState<CollectionState>({ status: 'loading' })

  useEffect(() => {
    let cancelled = false
    let db: IDBDatabase | null = null
    let liveUrls: string[] = []

    async function load(): Promise<void> {
      if (db === null) {
        const opened = await openDb()
        if (cancelled) {
          if (opened.ok) opened.value.close()
          return
        }
        if (!opened.ok) {
          setState({ status: 'error', error: opened.error })
          return
        }
        db = opened.value
      }
      const [sources, thumbs] = await Promise.all([
        getAllRecords(db, 'sources'),
        getAllRecords(db, 'thumbs'),
      ])
      if (cancelled) return
      if (!sources.ok) {
        setState({ status: 'error', error: sources.error })
        return
      }
      if (!thumbs.ok) {
        setState({ status: 'error', error: thumbs.error })
        return
      }
      const thumbById = new Map(thumbs.value.map((t) => [t.id, t.blob]))
      const next = sources.value
        .filter((s) => !s.deleted)
        .sort((a, b) => b.createdAt - a.createdAt)
        .map((s): CollectionSource => {
          const blob = thumbById.get(s.id)
          return { ...s, thumbUrl: blob === undefined ? null : URL.createObjectURL(blob) }
        })
      const stale = liveUrls
      liveUrls = next.map((s) => s.thumbUrl).filter((u): u is string => u !== null)
      setState({ status: 'ready', sources: next })
      for (const url of stale) URL.revokeObjectURL(url)
    }

    void load()
    const onChanged = (): void => {
      void load()
    }
    window.addEventListener(COLLECTION_CHANGED_EVENT, onChanged)
    return () => {
      cancelled = true
      window.removeEventListener(COLLECTION_CHANGED_EVENT, onChanged)
      for (const url of liveUrls) URL.revokeObjectURL(url)
      db?.close()
    }
  }, [])

  return state
}
