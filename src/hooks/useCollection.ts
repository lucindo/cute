// Collection read model: live (non-tombstoned) sources, newest first, each
// with an object URL for its thumbnail. Owns the URL lifecycle — revokes on
// replace and on unmount. Importers dispatch COLLECTION_CHANGED_EVENT after
// writing; the native 'storage' event has no IndexedDB equivalent.

import { useEffect, useState } from 'react'

import { aggregateHoldStats } from '../domain/holdStats'
import { getAllRecords, openDb, type SourceRecord, type StorageError } from '../storage'

export const COLLECTION_CHANGED_EVENT = 'cute:collection-changed'

// Lifetime hold stats (FR-17) join in here; both default 0 for never-held sources.
export type CollectionSource = SourceRecord & {
  thumbUrl: string | null
  holdCount: number
  totalHeldMs: number
}

export type CollectionState =
  | { status: 'loading' }
  | { status: 'error'; error: StorageError }
  // totalBytes sums live sources + their thumbs from our own records —
  // navigator.storage.estimate() lags far behind IndexedDB blob writes.
  | { status: 'ready'; sources: CollectionSource[]; totalBytes: number }

export function useCollection(): CollectionState {
  const [state, setState] = useState<CollectionState>({ status: 'loading' })

  useEffect(() => {
    let cancelled = false
    let db: IDBDatabase | null = null
    let liveUrls: string[] = []
    // Bumped per load() call; a load that started before a newer one bails
    // before committing, so overlapping reloads can't commit out of order or
    // leak a second IndexedDB connection.
    let generation = 0

    async function load(): Promise<void> {
      const gen = ++generation
      if (db === null) {
        const opened = await openDb()
        if (cancelled || gen !== generation) {
          if (opened.ok) opened.value.close()
          return
        }
        if (!opened.ok) {
          setState({ status: 'error', error: opened.error })
          return
        }
        db = opened.value
      }
      const [sources, thumbs, holds] = await Promise.all([
        getAllRecords(db, 'sources'),
        getAllRecords(db, 'thumbs'),
        getAllRecords(db, 'holdEvents'),
      ])
      if (cancelled || gen !== generation) return
      if (!sources.ok) {
        setState({ status: 'error', error: sources.error })
        return
      }
      if (!thumbs.ok) {
        setState({ status: 'error', error: thumbs.error })
        return
      }
      if (!holds.ok) {
        setState({ status: 'error', error: holds.error })
        return
      }
      const thumbById = new Map(thumbs.value.map((t) => [t.id, t]))
      const holdStats = aggregateHoldStats(holds.value)
      const live = sources.value
        .filter((s) => !s.deleted)
        .sort((a, b) => b.createdAt - a.createdAt)
      const next = live.map((s): CollectionSource => {
        const thumb = thumbById.get(s.id)
        const stats = holdStats.get(s.id)
        return {
          ...s,
          thumbUrl:
            thumb === undefined
              ? null
              : URL.createObjectURL(new Blob([thumb.bytes], { type: thumb.type })),
          holdCount: stats?.count ?? 0,
          totalHeldMs: stats?.totalMs ?? 0,
        }
      })
      const totalBytes = live.reduce(
        (sum, s) => sum + s.bytes + (thumbById.get(s.id)?.bytes.byteLength ?? 0),
        0,
      )
      const stale = liveUrls
      liveUrls = next.map((s) => s.thumbUrl).filter((u): u is string => u !== null)
      setState({ status: 'ready', sources: next, totalBytes })
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
