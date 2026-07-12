import { describe, expect, it } from 'vitest'

import { aggregateHoldStats } from './holdStats'
import type { HoldEventRecord } from '../storage'

function hold(sourceId: string, durationMs: number): HoldEventRecord {
  return { id: `h-${sourceId}-${String(durationMs)}`, sessionId: 's', sourceId, startedAt: 0, durationMs }
}

describe('aggregateHoldStats', () => {
  it('returns an empty map for no holds', () => {
    expect(aggregateHoldStats([]).size).toBe(0)
  })

  it('counts and sums duration per source', () => {
    const stats = aggregateHoldStats([hold('a', 1000), hold('b', 500), hold('a', 2000)])
    expect(stats.get('a')).toEqual({ count: 2, totalMs: 3000 })
    expect(stats.get('b')).toEqual({ count: 1, totalMs: 500 })
    expect(stats.has('c')).toBe(false)
  })
})
