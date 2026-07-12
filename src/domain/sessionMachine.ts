// Pure running-session state machine (SPEC FR-27..FR-40). Time is injected as
// wall-clock milliseconds on every transition — the domain never reads a clock,
// so it stays deterministic and testable. The React surface owns the tick loop,
// pointer/keyboard events, and persistence; hold-event ids are assigned at write
// time (the domain carries RecordedHold, id-free).

import type { HoldEventRecord, SessionEndReason, SessionRecord } from '../storage'
import { createBag, deal, type Rng, type ShuffleBag } from './shuffleBag'

// Presses held ≥300ms are recorded holds; shorter presses are taps (FR-28/29).
export const HOLD_THRESHOLD_MS = 300

const MS_PER_MINUTE = 60_000

// A recorded hold minus its storage id, assigned when persisted.
export type RecordedHold = Omit<HoldEventRecord, 'id'>

interface ActiveHold {
  readonly sourceId: string
  readonly startedAt: number
}

export interface RunningSession {
  readonly status: 'running'
  readonly id: string
  readonly startedAt: number
  readonly plannedMinutes: number
  readonly tagFilter: readonly string[]
  readonly bag: ShuffleBag
  readonly history: readonly string[] // dealt sequence, oldest first (FR-30 back/forward)
  readonly cursor: number
  readonly hold: ActiveHold | null
  readonly holds: readonly RecordedHold[]
}

export interface CompleteSession {
  readonly status: 'complete'
  readonly record: SessionRecord
  readonly holds: readonly RecordedHold[]
}

export type SessionState = RunningSession | CompleteSession

export interface StartConfig {
  readonly id: string
  readonly sourceIds: readonly string[]
  readonly plannedMinutes: number
  readonly tagFilter: readonly string[]
  readonly startedAt: number
}

export function currentSource(s: RunningSession): string {
  const id = s.history[s.cursor]
  if (id === undefined) throw new Error('session cursor out of range') // invariant
  return id
}

function plannedMs(s: RunningSession): number {
  return s.plannedMinutes * MS_PER_MINUTE
}

export function startSession(config: StartConfig, rng: Rng): RunningSession {
  if (config.sourceIds.length === 0) throw new Error('cannot start a session with an empty pool')
  const { id, bag } = deal(createBag(config.sourceIds, rng), undefined, rng)
  return {
    status: 'running',
    id: config.id,
    startedAt: config.startedAt,
    plannedMinutes: config.plannedMinutes,
    tagFilter: config.tagFilter,
    bag,
    history: [id],
    cursor: 0,
    hold: null,
    holds: [],
  }
}

export function pressStart(s: RunningSession, at: number): RunningSession {
  if (s.hold !== null) return s // key-repeat / double-down guard (FR-32)
  return { ...s, hold: { sourceId: currentSource(s), startedAt: at } }
}

// Classify a released press: ≥300ms records a hold, shorter is a tap (overlay
// toggle — the caller's concern). wasHold lets the caller skip the toggle.
export function pressEnd(
  s: RunningSession,
  at: number,
): { session: RunningSession; wasHold: boolean } {
  if (s.hold === null) return { session: s, wasHold: false }
  const durationMs = at - s.hold.startedAt
  if (durationMs < HOLD_THRESHOLD_MS) return { session: { ...s, hold: null }, wasHold: false }
  const hold: RecordedHold = {
    sessionId: s.id,
    sourceId: s.hold.sourceId,
    startedAt: s.hold.startedAt,
    durationMs,
  }
  return { session: { ...s, hold: null, holds: [...s.holds, hold] }, wasHold: true }
}

export function advance(s: RunningSession, rng: Rng): RunningSession {
  if (s.cursor < s.history.length - 1) return { ...s, cursor: s.cursor + 1 }
  const { id, bag } = deal(s.bag, currentSource(s), rng)
  return { ...s, bag, history: [...s.history, id], cursor: s.cursor + 1 }
}

export function back(s: RunningSession): RunningSession {
  if (s.cursor === 0) return s
  return { ...s, cursor: s.cursor - 1 }
}

// End any active hold up to `at`, recording it if it crossed the threshold.
function releaseHold(s: RunningSession, at: number): RunningSession {
  return s.hold === null ? s : pressEnd(s, at).session
}

function complete(s: RunningSession, endedAt: number, endReason: SessionEndReason): CompleteSession {
  const ended = releaseHold(s, endedAt)
  const record: SessionRecord = {
    id: ended.id,
    startedAt: ended.startedAt,
    plannedMinutes: ended.plannedMinutes,
    endedAt,
    endReason,
    overtimeMs: Math.max(0, endedAt - ended.startedAt - plannedMs(ended)),
    tagFilter: [...ended.tagFilter],
  }
  return { status: 'complete', record, holds: ended.holds }
}

// Wall-clock advance (FR-36/38): completes only once the planned time has
// elapsed AND no hold is active — an active hold keeps the session in overtime
// until release, then the next tick completes it.
export function tick(s: RunningSession, now: number): SessionState {
  if (s.hold === null && now - s.startedAt >= plannedMs(s)) return complete(s, now, 'completed')
  return s
}

export function stop(s: RunningSession, now: number): CompleteSession {
  return complete(s, now, 'stopped')
}

// Visibility loss (FR-38): truncate any active hold; the wall-clock timer
// resolves expiry on the next tick after return.
export function hide(s: RunningSession, now: number): RunningSession {
  return releaseHold(s, now)
}

export interface SessionFrame {
  readonly remainingMs: number
  readonly overtimeMs: number
  readonly currentSourceId: string
  readonly holdActive: boolean
}

// Derived overlay state (FR-33): remaining counts down to zero, then overtime
// counts up.
export function sessionFrame(s: RunningSession, now: number): SessionFrame {
  const elapsed = now - s.startedAt
  const planned = plannedMs(s)
  return {
    remainingMs: Math.max(0, planned - elapsed),
    overtimeMs: Math.max(0, elapsed - planned),
    currentSourceId: currentSource(s),
    holdActive: s.hold !== null,
  }
}

export interface SessionSummary {
  readonly durationMs: number
  readonly holdCount: number
  readonly totalHeldMs: number
  readonly longestHoldMs: number
}

// Completion summary (FR-40) — also the per-session shape Stats aggregates.
export function summarize(record: SessionRecord, holds: readonly RecordedHold[]): SessionSummary {
  return {
    durationMs: record.endedAt - record.startedAt,
    holdCount: holds.length,
    totalHeldMs: holds.reduce((sum, h) => sum + h.durationMs, 0),
    longestHoldMs: holds.reduce((max, h) => Math.max(max, h.durationMs), 0),
  }
}
