import { describe, expect, it } from 'vitest'

import { formatBytes, formatDuration } from './format'

describe('formatBytes', () => {
  it('formats across unit boundaries', () => {
    expect(formatBytes(0)).toBe('0 B')
    expect(formatBytes(999)).toBe('999 B')
    expect(formatBytes(1000)).toBe('1.0 KB')
    expect(formatBytes(1_536_000)).toBe('1.5 MB')
    expect(formatBytes(2_400_000_000)).toBe('2.4 GB')
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
