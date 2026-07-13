import { describe, expect, it } from 'vitest'

import { BACKUP_VERSION, buildManifest, validateManifest, type Manifest } from './backup'
import type {
  HoldEventRecord,
  SessionRecord,
  SourceRecord,
  TagRecord,
} from '../storage'

const imgNoCaption: SourceRecord = { id: 's1', type: 'image', mimeType: 'image/webp', bytes: 1024, createdAt: 1, tags: ['seed:babies'], deleted: false }
const vidWithCaption: SourceRecord = { id: 's2', type: 'video', mimeType: 'video/mp4', bytes: 2048, createdAt: 2, tags: [], caption: 'hi', deleted: false }
const tombstone: SourceRecord = { id: 's3', type: 'image', mimeType: 'image/jpeg', bytes: 0, createdAt: 3, tags: [], deleted: true }
const sources: SourceRecord[] = [imgNoCaption, vidWithCaption, tombstone]
const tags: TagRecord[] = [
  { id: 'seed:babies', name: null },
  { id: 'user:1', name: 'Nephews' },
]
const sessions: SessionRecord[] = [
  { id: 'sess1', startedAt: 100, plannedMinutes: 5, endedAt: 400_000, endReason: 'completed', overtimeMs: 0, tagFilter: [] },
  { id: 'sess2', startedAt: 500, plannedMinutes: 10, endedAt: 900, endReason: 'stopped', overtimeMs: 200, tagFilter: ['seed:babies'] },
]
const holdEvents: HoldEventRecord[] = [
  { id: 'h1', sessionId: 'sess1', sourceId: 's1', startedAt: 150, durationMs: 3000 },
]

// The manifest travels as JSON text in the zip; validate what survives that trip.
function roundTrip(m: Manifest): unknown {
  return JSON.parse(JSON.stringify(m))
}

describe('buildManifest / validateManifest', () => {
  it('round-trips a full manifest unchanged', () => {
    const built = buildManifest({ sources, tags, sessions, holdEvents })
    const result = validateManifest(roundTrip(built))
    expect(result).toEqual({ ok: true, value: built })
  })

  it('round-trips an empty collection', () => {
    const built = buildManifest({ sources: [], tags: [], sessions: [], holdEvents: [] })
    const result = validateManifest(roundTrip(built))
    expect(result.ok && result.value).toEqual({
      version: BACKUP_VERSION,
      sources: [],
      tags: [],
      sessions: [],
      holdEvents: [],
    })
  })

  it('preserves an absent caption as absent, not as an undefined key', () => {
    const built = buildManifest({ sources: [imgNoCaption], tags: [], sessions: [], holdEvents: [] })
    const result = validateManifest(roundTrip(built))
    expect(result.ok && result.value.sources).toEqual([imgNoCaption])
    expect(result.ok && result.value.sources.map((s) => 'caption' in s)).toEqual([false])
  })

  it('rejects a non-object manifest', () => {
    expect(validateManifest(null).ok).toBe(false)
    expect(validateManifest('nope').ok).toBe(false)
    expect(validateManifest([]).ok).toBe(false)
  })

  it('rejects a mismatched version', () => {
    const result = validateManifest({ version: 999, sources: [], tags: [], sessions: [], holdEvents: [] })
    expect(result.ok).toBe(false)
    expect(!result.ok && result.error).toContain('version')
  })

  it('rejects a missing store array', () => {
    const result = validateManifest({ version: BACKUP_VERSION, sources: [], tags: [], sessions: [] })
    expect(result).toEqual({ ok: false, error: 'invalid or missing holdEvents' })
  })

  it('rejects a store field that is not an array', () => {
    const result = validateManifest({ version: BACKUP_VERSION, sources: {}, tags: [], sessions: [], holdEvents: [] })
    expect(result).toEqual({ ok: false, error: 'invalid or missing sources' })
  })

  it('rejects the whole array when one record is malformed', () => {
    const bad = [imgNoCaption, { id: 's9', type: 'gif', mimeType: 'x', bytes: 1, createdAt: 1, tags: [], deleted: false }]
    const result = validateManifest({ version: BACKUP_VERSION, sources: bad, tags: [], sessions: [], holdEvents: [] })
    expect(result).toEqual({ ok: false, error: 'invalid or missing sources' })
  })

  it('rejects non-finite numeric fields', () => {
    const bad = [{ id: 'h1', sessionId: 's', sourceId: 's', startedAt: 0, durationMs: Number.NaN }]
    const result = validateManifest({ version: BACKUP_VERSION, sources: [], tags: [], sessions: [], holdEvents: bad })
    expect(result).toEqual({ ok: false, error: 'invalid or missing holdEvents' })
  })

  it('accepts a tag with a literal name and one with null', () => {
    const result = validateManifest({ version: BACKUP_VERSION, sources: [], tags, sessions: [], holdEvents: [] })
    expect(result.ok && result.value.tags).toEqual(tags)
  })

  it('drops unknown extra keys rather than carrying them into records', () => {
    const dirty = { ...imgNoCaption, junk: 'x' }
    const result = validateManifest({ version: BACKUP_VERSION, sources: [dirty], tags: [], sessions: [], holdEvents: [] })
    expect(result.ok && result.value.sources).toEqual([imgNoCaption])
  })
})
