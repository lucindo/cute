import { describe, expect, it } from 'vitest'

import { getAllRecords, openDb, type HoldEventRecord, type SessionRecord } from './index'
import { saveCompletedSession } from './sessions'

async function openOrThrow(): Promise<IDBDatabase> {
  const opened = await openDb()
  if (!opened.ok) throw new Error('openDb failed')
  return opened.value
}

const record: SessionRecord = {
  id: 'sess-1',
  startedAt: 1000,
  plannedMinutes: 5,
  endedAt: 301_000,
  endReason: 'completed',
  overtimeMs: 0,
  tagFilter: [],
}

describe('saveCompletedSession', () => {
  it('writes the session and one record per hold, assigning hold ids', async () => {
    const db = await openOrThrow()
    const result = await saveCompletedSession(db, record, [
      { sessionId: 'sess-1', sourceId: 'a', startedAt: 1000, durationMs: 2000 },
      { sessionId: 'sess-1', sourceId: 'b', startedAt: 5000, durationMs: 3000 },
    ])
    expect(result.ok).toBe(true)

    const sessions = await getAllRecords(db, 'sessions')
    const holds = await getAllRecords(db, 'holdEvents')
    db.close()

    expect(sessions.ok && sessions.value).toEqual([record])
    expect(holds.ok && holds.value.map((h: HoldEventRecord) => h.durationMs).sort()).toEqual([
      2000, 3000,
    ])
    expect(holds.ok && holds.value.every((h: HoldEventRecord) => h.id.length > 0)).toBe(true)
  })

  it('writes just the session when there are no holds', async () => {
    const db = await openOrThrow()
    await saveCompletedSession(db, record, [])
    const holds = await getAllRecords(db, 'holdEvents')
    db.close()
    expect(holds.ok && holds.value).toEqual([])
  })
})
