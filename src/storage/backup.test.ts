import { strToU8, zipSync } from 'fflate'
import { IDBFactory } from 'fake-indexeddb'
import { describe, expect, it } from 'vitest'

import { exportBackup, importBackup } from './backup'
import {
  getAllRecords,
  openDb,
  writeMany,
  type HoldEventRecord,
  type MediaBytesRecord,
  type SessionRecord,
  type SourceRecord,
  type TagRecord,
  type WriteOp,
} from './index'

async function freshDb(): Promise<IDBDatabase> {
  const opened = await openDb({ factory: new IDBFactory() })
  if (!opened.ok) throw new Error(`openDb failed: ${opened.error.message}`)
  return opened.value
}

function buf(...nums: number[]): ArrayBuffer {
  return new Uint8Array(nums).buffer
}

const sources: SourceRecord[] = [
  { id: 's1', type: 'image', mimeType: 'image/webp', bytes: 3, createdAt: 1, tags: ['seed:babies'], deleted: false },
  { id: 's2', type: 'video', mimeType: 'video/mp4', bytes: 4, createdAt: 2, tags: [], deleted: false },
  { id: 's3', type: 'image', mimeType: 'image/jpeg', bytes: 0, createdAt: 3, tags: [], deleted: true }, // tombstone, no media
]
const tags: TagRecord[] = [{ id: 'seed:babies', name: null }, { id: 'user:x', name: 'Friends' }]
const sessions: SessionRecord[] = [
  { id: 'sess1', startedAt: 10, plannedMinutes: 5, endedAt: 310, endReason: 'completed', overtimeMs: 0, tagFilter: [] },
]
const holdEvents: HoldEventRecord[] = [
  { id: 'h1', sessionId: 'sess1', sourceId: 's1', startedAt: 20, durationMs: 900 },
]
const blobs: MediaBytesRecord[] = [
  { id: 's1', type: 'image/webp', bytes: buf(1, 2, 3) },
  { id: 's2', type: 'video/mp4', bytes: buf(4, 5, 6, 7) },
]
const thumbs: MediaBytesRecord[] = [
  { id: 's1', type: 'image/webp', bytes: buf(9, 9) },
  { id: 's2', type: 'image/jpeg', bytes: buf(8, 8, 8) }, // jpeg thumb — MIME must survive
]

function seedOps(): WriteOp[] {
  return [
    ...sources.map((record): WriteOp => ({ op: 'put', store: 'sources', record })),
    ...tags.map((record): WriteOp => ({ op: 'put', store: 'tags', record })),
    ...sessions.map((record): WriteOp => ({ op: 'put', store: 'sessions', record })),
    ...holdEvents.map((record): WriteOp => ({ op: 'put', store: 'holdEvents', record })),
    ...blobs.map((record): WriteOp => ({ op: 'put', store: 'blobs', record })),
    ...thumbs.map((record): WriteOp => ({ op: 'put', store: 'thumbs', record })),
  ]
}

async function seed(db: IDBDatabase, ops: WriteOp[] = seedOps()): Promise<void> {
  const written = await writeMany(db, ops)
  if (!written.ok) throw new Error(`seed failed: ${written.error.message}`)
}

// Normalize ArrayBuffers to number[] so media records compare structurally.
async function snapshot(db: IDBDatabase): Promise<unknown> {
  const read = async <S extends Parameters<typeof getAllRecords>[1]>(store: S) => {
    const r = await getAllRecords(db, store)
    if (!r.ok) throw new Error(`read ${store} failed`)
    return r.value
  }
  const media = (records: MediaBytesRecord[]) =>
    records.map((m) => ({ id: m.id, type: m.type, bytes: [...new Uint8Array(m.bytes)] }))
  return {
    sources: await read('sources'),
    tags: await read('tags'),
    sessions: await read('sessions'),
    holdEvents: await read('holdEvents'),
    blobs: media(await read('blobs')),
    thumbs: media(await read('thumbs')),
  }
}

describe('exportBackup / importBackup', () => {
  it('round-trips a populated library identically onto a different profile (AC-9)', async () => {
    const source = await freshDb()
    await seed(source)
    const exported = await exportBackup(source)
    expect(exported.ok).toBe(true)
    if (!exported.ok) return

    // A target with unrelated data — restore must replace it wholesale (FR-21).
    const target = await freshDb()
    await seed(target, [
      { op: 'put', store: 'sources', record: { id: 'old', type: 'image', mimeType: 'image/png', bytes: 1, createdAt: 9, tags: [], deleted: false } },
      { op: 'put', store: 'blobs', record: { id: 'old', type: 'image/png', bytes: buf(0) } },
    ])

    const restored = await importBackup(target, exported.value)
    expect(restored).toEqual({ ok: true, value: undefined })
    expect(await snapshot(target)).toEqual(await snapshot(source))
  })

  it('recovers a jpeg thumbnail MIME from its entry extension', async () => {
    const db = await freshDb()
    await seed(db)
    const exported = await exportBackup(db)
    if (!exported.ok) throw new Error('export failed')

    const target = await freshDb()
    await importBackup(target, exported.value)
    const restoredThumbs = await getAllRecords(target, 'thumbs')
    if (!restoredThumbs.ok) throw new Error('read failed')
    expect(restoredThumbs.value.find((t) => t.id === 's2')?.type).toBe('image/jpeg')
  })

  it('leaves existing data untouched on a corrupt zip (AC-10)', async () => {
    const db = await freshDb()
    await seed(db)
    const before = await snapshot(db)

    const result = await importBackup(db, new Uint8Array([1, 2, 3, 4, 5]))
    expect(result.ok).toBe(false)
    expect(await snapshot(db)).toEqual(before)
  })

  it('aborts untouched on a valid zip whose manifest is the wrong version (AC-10)', async () => {
    const db = await freshDb()
    await seed(db)
    const before = await snapshot(db)

    const badZip = zipSync({
      'manifest.json': strToU8(JSON.stringify({ version: 99, sources: [], tags: [], sessions: [], holdEvents: [] })),
    })
    const result = await importBackup(db, badZip)
    expect(result.ok).toBe(false)
    expect(await snapshot(db)).toEqual(before)
  })

  it('rejects a zip missing manifest.json', async () => {
    const db = await freshDb()
    const badZip = zipSync({ 'media/x.webp': buf8(1, 2) })
    const result = await importBackup(db, badZip)
    expect(result).toEqual({ ok: false, error: { name: 'InvalidBackup', message: 'missing manifest.json' } })
  })
})

function buf8(...nums: number[]): Uint8Array {
  return new Uint8Array(nums)
}
