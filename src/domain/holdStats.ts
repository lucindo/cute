// Per-source lifetime hold aggregation for the Collection's aww factor
// (SPEC FR-17): count and summed duration, computed at read time from the
// raw hold events. Holds are never summed at write time (FR-28), so this is
// the single place totals are derived.

import type { HoldEventRecord } from '../storage'

export interface HoldStats {
  readonly count: number
  readonly totalMs: number
}

export function aggregateHoldStats(holds: readonly HoldEventRecord[]): Map<string, HoldStats> {
  const stats = new Map<string, HoldStats>()
  for (const h of holds) {
    const cur = stats.get(h.sourceId)
    stats.set(h.sourceId, {
      count: (cur?.count ?? 0) + 1,
      totalMs: (cur?.totalMs ?? 0) + h.durationMs,
    })
  }
  return stats
}
