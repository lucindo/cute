// Lifetime stats read model (SPEC FR-44 / AC-23): loads the full session and
// hold-event log and aggregates it. Subscribes to COLLECTION_CHANGED_EVENT so
// the on-screen Clear-history action refreshes it — that clear is the only
// mutation reachable while Stats is up (a running session is a separate
// full-viewport takeover) and it also changes the collection's aww factor.

import { useEffect, useState } from 'react'

import { aggregateStats, type Stats } from '../domain/stats'
import { getAllRecords, openDb, type StorageError } from '../storage'
import { COLLECTION_CHANGED_EVENT } from './useCollection'

// Five, not ten: ten pushed the page into scrolling on smaller phones, and a
// "recent" list long enough to scroll stops reading as recent.
const RECENT_LIMIT = 5

export type StatsState =
  | { status: 'loading' }
  | { status: 'error'; error: StorageError }
  | { status: 'ready'; stats: Stats }

export function useStats(): StatsState {
  const [state, setState] = useState<StatsState>({ status: 'loading' })

  useEffect(() => {
    let cancelled = false

    async function load(): Promise<void> {
      const opened = await openDb()
      if (!opened.ok) {
        if (!cancelled) setState({ status: 'error', error: opened.error })
        return
      }
      const db = opened.value
      const [sessions, holds] = await Promise.all([
        getAllRecords(db, 'sessions'),
        getAllRecords(db, 'holdEvents'),
      ])
      db.close()
      if (cancelled) return
      if (!sessions.ok) {
        setState({ status: 'error', error: sessions.error })
        return
      }
      if (!holds.ok) {
        setState({ status: 'error', error: holds.error })
        return
      }
      setState({
        status: 'ready',
        stats: aggregateStats(sessions.value, holds.value, RECENT_LIMIT),
      })
    }

    void load()
    const onChanged = (): void => {
      void load()
    }
    window.addEventListener(COLLECTION_CHANGED_EVENT, onChanged)
    return () => {
      cancelled = true
      window.removeEventListener(COLLECTION_CHANGED_EVENT, onChanged)
    }
  }, [])

  return state
}
