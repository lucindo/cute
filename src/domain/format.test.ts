import { describe, expect, it } from 'vitest'

import { formatBytes } from './format'

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
