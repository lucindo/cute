// Lifetime stats read model (SPEC FR-44 / AC-23): loads the full session and
// hold-event log once and aggregates it. No change subscription — Stats is a
// static snapshot opened from Settings; no session can complete while it is on
// screen (a running session is a separate full-viewport takeover).

import { useEffect, useState } from 'react'

import { aggregateStats, type Stats } from '../domain/stats'
import { getAllRecords, openDb, type StorageError } from '../storage'

const RECENT_LIMIT = 10

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
    return () => {
      cancelled = true
    }
  }, [])

  return state
}
