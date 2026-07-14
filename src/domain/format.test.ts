import { describe, expect, it } from 'vitest'

import { formatBytes, formatDuration, formatTotalDuration } from './format'

describe('formatBytes', () => {
  it('formats across unit boundaries', () => {
    expect(formatBytes(0)).toBe('0 B')
    expect(formatBytes(999)).toBe('999 B')
    expect(formatBytes(1000)).toBe('1.0 KB')
    expect(formatBytes(1_536_000)).toBe('1.5 MB')
    expect(formatBytes(2_400_000_000)).toBe('2.4 GB')
  })

  it('promotes to the next unit when rounding would hit 1000', () => {
    expect(formatBytes(999_960)).toBe('1.0 MB')
    expect(formatBytes(999_960_000)).toBe('1.0 GB')
  })

  it('clamps to GB for absurd sizes', () => {
    expect(formatBytes(5_000_000_000_000)).toBe('5000.0 GB')
  })
})

describe('formatDuration', () => {
  it('formats m:ss with zero-padded seconds', () => {
    expect(formatDuration(0)).toBe('0:00')
    expect(formatDuration(5000)).toBe('0:05')
    expect(formatDuration(65_000)).toBe('1:05')
  })

  it('leaves minutes uncapped for long overtime and floors negatives to zero', () => {
    expect(formatDuration(3_720_000)).toBe('62:00')
    expect(formatDuration(-1000)).toBe('0:00')
  })
})

describe('formatTotalDuration', () => {
  it('steps through seconds, minutes, and hours', () => {
    expect(formatTotalDuration(0)).toBe('0s')
    expect(formatTotalDuration(45_000)).toBe('45s')
    expect(formatTotalDuration(90_000)).toBe('1m')
    expect(formatTotalDuration(3_600_000)).toBe('1h')
    expect(formatTotalDuration(3_900_000)).toBe('1h 5m')
  })

  it('drops the minutes part on a whole hour and floors negatives', () => {
    expect(formatTotalDuration(7_200_000)).toBe('2h')
    expect(formatTotalDuration(-5000)).toBe('0s')
  })
})
