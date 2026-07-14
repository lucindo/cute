// Read-time lifetime stats (SPEC FR-44 / AC-23): totals plus a recent-session
// list, aggregated from the raw session and hold-event log every time Stats
// opens. Never pre-aggregated (FR-28) — this and holdStats.ts are the only
// places totals are derived. Per-session numbers flow through
// sessionMachine.summarize, the same function the completion screen uses, so
// Stats matches it exactly (AC-23).

import { summarize } from './sessionMachine'
import type { HoldEventRecord, SessionEndReason, SessionRecord } from '../storage'

export interface RecentSession {
  readonly id: string
  readonly startedAt: number
  readonly durationMs: number
  readonly holdCount: number
  readonly endReason: SessionEndReason
}

export interface Stats {
  readonly totalSessions: number
  readonly totalPracticeMs: number
  readonly totalHeldMs: number
  readonly longestHoldMs: number
  readonly recent: readonly RecentSession[]
}

export function aggregateStats(
  sessions: readonly SessionRecord[],
  holds: readonly HoldEventRecord[],
  recentLimit: number,
): Stats {
  const holdsBySession = new Map<string, HoldEventRecord[]>()
  for (const h of holds) {
    const bucket = holdsBySession.get(h.sessionId)
    if (bucket) bucket.push(h)
    else holdsBySession.set(h.sessionId, [h])
  }

  let totalPracticeMs = 0
  let totalHeldMs = 0
  let longestHoldMs = 0
  const recent: RecentSession[] = []

  for (const s of sessions) {
    const sum = summarize(s, holdsBySession.get(s.id) ?? [])
    totalPracticeMs += sum.durationMs
    totalHeldMs += sum.totalHeldMs
    longestHoldMs = Math.max(longestHoldMs, sum.longestHoldMs)
    recent.push({
      id: s.id,
      startedAt: s.startedAt,
      durationMs: sum.durationMs,
      holdCount: sum.holdCount,
      endReason: s.endReason,
    })
  }

  recent.sort((a, b) => b.startedAt - a.startedAt)

  return {
    totalSessions: sessions.length,
    totalPracticeMs,
    totalHeldMs,
    longestHoldMs,
    recent: recent.slice(0, recentLimit),
  }
}
