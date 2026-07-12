import { describe, expect, it } from 'vitest'

import {
  coerceSessionDuration,
  DEFAULT_SESSION_DURATION,
  isValidSessionDuration,
  SESSION_DURATIONS,
} from './session'

describe('SESSION_DURATIONS', () => {
  it('covers every whole minute from 1 to 30', () => {
    expect(SESSION_DURATIONS[0]).toBe(1)
    expect(SESSION_DURATIONS.at(-1)).toBe(30)
    expect(SESSION_DURATIONS).toHaveLength(30)
  })
})

describe('isValidSessionDuration', () => {
  it('accepts whole minutes within range', () => {
    expect(isValidSessionDuration(1)).toBe(true)
    expect(isValidSessionDuration(5)).toBe(true)
    expect(isValidSessionDuration(30)).toBe(true)
  })

  it('rejects out-of-range, non-integer, and non-number values', () => {
    expect(isValidSessionDuration(0)).toBe(false)
    expect(isValidSessionDuration(31)).toBe(false)
    expect(isValidSessionDuration(5.5)).toBe(false)
    expect(isValidSessionDuration('5')).toBe(false)
    expect(isValidSessionDuration(undefined)).toBe(false)
  })
})

describe('coerceSessionDuration', () => {
  it('keeps a valid duration', () => {
    expect(coerceSessionDuration(12)).toBe(12)
  })

  it('falls back to the default for anything invalid', () => {
    expect(coerceSessionDuration(0)).toBe(DEFAULT_SESSION_DURATION)
    expect(coerceSessionDuration(99)).toBe(DEFAULT_SESSION_DURATION)
    expect(coerceSessionDuration('junk')).toBe(DEFAULT_SESSION_DURATION)
  })
})
