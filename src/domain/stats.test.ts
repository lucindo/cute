import { describe, expect, it } from 'vitest'

import { aggregateStats } from './stats'
import type { HoldEventRecord, SessionEndReason, SessionRecord } from '../storage'

function session(
  id: string,
  startedAt: number,
  endedAt: number,
  endReason: SessionEndReason = 'completed',
): SessionRecord {
  return { id, startedAt, plannedMinutes: 5, endedAt, endReason, overtimeMs: 0, tagFilter: [] }
}

function hold(sessionId: string, durationMs: number): HoldEventRecord {
  return { id: `${sessionId}-${String(durationMs)}`, sessionId, sourceId: 'src', startedAt: 0, durationMs }
}

describe('aggregateStats', () => {
  it('returns zeroed totals and an empty recent list for no data', () => {
    expect(aggregateStats([], [], 10)).toEqual({
      totalSessions: 0,
      totalPracticeMs: 0,
      totalHeldMs: 0,
      longestHoldMs: 0,
      recent: [],
    })
  })

  it('sums lifetime totals across sessions and holds', () => {
    const sessions = [session('a', 0, 5000), session('b', 10_000, 18_000)]
    const holds = [hold('a', 1000), hold('a', 3000), hold('b', 2000)]

    const stats = aggregateStats(sessions, holds, 10)

    expect(stats.totalSessions).toBe(2)
    expect(stats.totalPracticeMs).toBe(5000 + 8000) // sum of endedAt - startedAt
    expect(stats.totalHeldMs).toBe(1000 + 3000 + 2000)
    expect(stats.longestHoldMs).toBe(3000) // max across all sessions, not per-session
  })

  it('counts practice time as full wall-clock elapsed, including overtime', () => {
    // planned 1 min, ran 80s: duration must be the wall-clock 80s, not the 60s plan.
    const overran: SessionRecord = {
      id: 'o', startedAt: 0, plannedMinutes: 1, endedAt: 80_000, endReason: 'completed', overtimeMs: 20_000, tagFilter: [],
    }
    expect(aggregateStats([overran], [], 10).totalPracticeMs).toBe(80_000)
  })

  it('buckets hold counts per session; sessions with no holds report zero', () => {
    const sessions = [session('a', 0, 1000), session('b', 2000, 3000)]
    const holds = [hold('a', 500), hold('a', 500)]

    const byId = new Map(aggregateStats(sessions, holds, 10).recent.map((r) => [r.id, r.holdCount]))
    expect(byId.get('a')).toBe(2)
    expect(byId.get('b')).toBe(0)
  })

  it('orders the recent list newest-first and caps it at the limit', () => {
    const sessions = [session('old', 100, 200), session('new', 900, 1000), session('mid', 500, 600)]

    const recent = aggregateStats(sessions, [], 2).recent
    expect(recent.map((r) => r.id)).toEqual(['new', 'mid'])
  })

  it('projects each recent entry with duration, hold count, and end reason', () => {
    const sessions = [session('s', 1000, 4000, 'stopped')]
    const holds = [hold('s', 700)]

    expect(aggregateStats(sessions, holds, 10).recent[0]).toEqual({
      id: 's',
      startedAt: 1000,
      durationMs: 3000,
      holdCount: 1,
      endReason: 'stopped',
    })
  })
})
