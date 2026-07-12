import { describe, expect, it } from 'vitest'

import type { Rng } from './shuffleBag'
import {
  advance,
  back,
  cancelPress,
  currentSource,
  hide,
  HOLD_THRESHOLD_MS,
  pressEnd,
  pressStart,
  sessionFrame,
  startSession,
  stop,
  summarize,
  tick,
  type RunningSession,
} from './sessionMachine'

function lcg(seed: number): Rng {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 0x100000000
  }
}

function start(overrides: Partial<{ pool: string[]; plannedMinutes: number }> = {}): RunningSession {
  return startSession(
    {
      id: 'sess-1',
      sourceIds: overrides.pool ?? ['a', 'b', 'c'],
      plannedMinutes: overrides.plannedMinutes ?? 1,
      tagFilter: [],
      startedAt: 0,
    },
    lcg(1),
  )
}

describe('startSession', () => {
  it('deals a first source and rejects an empty pool', () => {
    const s = start()
    expect(s.history).toHaveLength(1)
    expect(s.cursor).toBe(0)
    expect(['a', 'b', 'c']).toContain(currentSource(s))
    expect(() =>
      startSession(
        { id: 'x', sourceIds: [], plannedMinutes: 5, tagFilter: [], startedAt: 0 },
        lcg(1),
      ),
    ).toThrow()
  })
})

describe('holds (FR-28/29, AC-12/13)', () => {
  it('records a press ≥300ms as one hold on the current source', () => {
    let s = pressStart(start(), 1000)
    const source = currentSource(s)
    const ended = pressEnd(s, 3000)
    s = ended.session
    expect(ended.wasHold).toBe(true)
    expect(s.holds).toEqual([
      { sessionId: 'sess-1', sourceId: source, startedAt: 1000, durationMs: 2000 },
    ])
  })

  it('treats a press <300ms as a tap and records nothing', () => {
    const s = pressStart(start(), 1000)
    const ended = pressEnd(s, 1000 + HOLD_THRESHOLD_MS - 1)
    expect(ended.wasHold).toBe(false)
    expect(ended.session.holds).toHaveLength(0)
  })

  it('keeps successive holds as separate events', () => {
    let s = pressEnd(pressStart(start(), 0), 2000).session
    s = pressEnd(pressStart(s, 5000), 8000).session
    expect(s.holds.map((h) => h.durationMs)).toEqual([2000, 3000])
  })

  it('ignores a second press-start while already holding', () => {
    const s = pressStart(start(), 1000)
    expect(pressStart(s, 1500).hold?.startedAt).toBe(1000)
  })

  it('cancels an active press without recording it (swipe)', () => {
    const s = cancelPress(pressStart(start(), 1000))
    expect(s.hold).toBeNull()
    expect(s.holds).toHaveLength(0)
  })
})

describe('history navigation (FR-30, AC-14)', () => {
  it('advances to a new source and replays it on back/forward', () => {
    let s = start({ pool: ['a', 'b', 'c'] })
    const a = currentSource(s)
    s = advance(s, lcg(1))
    const b = currentSource(s)
    expect(b).not.toBe(a)

    s = back(s)
    expect(currentSource(s)).toBe(a)

    s = advance(s, lcg(9))
    expect(currentSource(s)).toBe(b) // replayed from history, not re-dealt
    expect(s.history).toHaveLength(2)
  })

  it('clamps back at the start of history', () => {
    const s = start()
    expect(back(s)).toBe(s)
  })
})

describe('timer, overtime, completion (FR-36/40, AC-16)', () => {
  it('completes at planned time with no overtime when idle', () => {
    const s = start({ plannedMinutes: 1 })
    expect(tick(s, 59_999).status).toBe('running')
    const done = tick(s, 60_000)
    expect(done.status).toBe('complete')
    if (done.status === 'complete') {
      expect(done.record.endReason).toBe('completed')
      expect(done.record.overtimeMs).toBe(0)
    }
  })

  it('stays in overtime while a hold outlasts the timer, then completes on release', () => {
    let s = start({ plannedMinutes: 1 })
    s = pressStart(s, 50_000)
    expect(tick(s, 60_000).status).toBe('running') // held past expiry → overtime

    s = pressEnd(s, 80_000).session // release at 80s
    const done = tick(s, 80_000)
    expect(done.status).toBe('complete')
    if (done.status === 'complete') {
      expect(done.record.overtimeMs).toBe(20_000)
      expect(done.holds).toEqual([
        expect.objectContaining({ startedAt: 50_000, durationMs: 30_000 }),
      ])
    }
  })
})

describe('stop (FR-37, AC-17)', () => {
  it('saves endReason stopped and retains events, recording an active hold', () => {
    let s = pressEnd(pressStart(start(), 0), 2000).session
    s = pressStart(s, 5000) // still holding when stopped
    const done = stop(s, 6000)
    expect(done.record.endReason).toBe('stopped')
    expect(done.holds.map((h) => h.durationMs)).toEqual([2000, 1000])
  })
})

describe('visibility (FR-38, AC-18)', () => {
  it('truncates an active hold on hide and completes on the tick after return', () => {
    let s = start({ plannedMinutes: 1 })
    s = pressStart(s, 40_000)
    s = hide(s, 45_000) // backgrounded → hold ends at hide time
    expect(s.hold).toBeNull()
    expect(s.holds).toEqual([expect.objectContaining({ durationMs: 5000 })])

    const done = tick(s, 70_000) // returned after expiry
    expect(done.status).toBe('complete')
  })
})

describe('sessionFrame (FR-33)', () => {
  it('counts remaining down then overtime up', () => {
    const s = start({ plannedMinutes: 1 })
    expect(sessionFrame(s, 15_000).remainingMs).toBe(45_000)
    expect(sessionFrame(s, 15_000).overtimeMs).toBe(0)
    const over = sessionFrame(s, 75_000)
    expect(over.remainingMs).toBe(0)
    expect(over.overtimeMs).toBe(15_000)
  })
})

describe('summarize (FR-40)', () => {
  it('derives duration, count, total and longest held', () => {
    let s = pressEnd(pressStart(start(), 1000), 3000).session // 2s
    s = pressEnd(pressStart(s, 5000), 10_000).session // 5s
    const done = stop(s, 12_000)
    const summary = summarize(done.record, done.holds)
    expect(summary).toEqual({
      durationMs: 12_000,
      holdCount: 2,
      totalHeldMs: 7000,
      longestHoldMs: 5000,
    })
  })

  it('reports zero longest hold for a session with no holds', () => {
    const done = stop(start(), 1000)
    expect(summarize(done.record, done.holds).longestHoldMs).toBe(0)
  })
})
