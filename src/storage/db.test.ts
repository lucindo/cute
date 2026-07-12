import { IDBFactory } from 'fake-indexeddb'
import { describe, expect, it } from 'vitest'

import { SEEDED_TAG_IDS } from '../domain/tags'
import {
  DB_NAME,
  DB_VERSION,
  getAllRecords,
  getRecord,
  openDb,
  writeMany,
  type MediaBytesRecord,
  type SessionRecord,
  type SourceRecord,
} from './db'

async function freshDb(): Promise<IDBDatabase> {
  const opened = await openDb({ factory: new IDBFactory() })
  if (!opened.ok) throw new Error(`openDb failed: ${opened.error.message}`)
  return opened.value
}

function makeSource(id: string): SourceRecord {
  return {
    id,
    type: 'image',
    mimeType: 'image/webp',
    bytes: 1234,
    createdAt: 1_700_000_000_000,
    tags: ['Kittens'],
    deleted: false,
  }
}

function makeSession(id: string): SessionRecord {
  return {
    id,
    startedAt: 1_700_000_000_000,
    plannedMinutes: 5,
    endedAt: 1_700_000_300_000,
    endReason: 'completed',
    overtimeMs: 0,
    tagFilter: [],
  }
}

// Replicates the shipped v1 schema so upgrade rungs can be exercised.
function openV1(factory: IDBFactory): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = factory.open(DB_NAME, 1)
    request.onupgradeneeded = () => {
      for (const name of ['sources', 'blobs', 'thumbs', 'sessions', 'holdEvents']) {
        request.result.createObjectStore(name, { keyPath: 'id' })
      }
    }
    request.onsuccess = () => { resolve(request.result) }
    request.onerror = () => { reject(new Error(request.error?.message ?? 'v1 open failed')) }
  })
}

describe('openDb', () => {
  it('creates all six stores at the current version', async () => {
    const db = await freshDb()
    expect(db.version).toBe(DB_VERSION)
    expect([...db.objectStoreNames].sort()).toEqual(
      ['blobs', 'holdEvents', 'sessions', 'sources', 'tags', 'thumbs'].sort(),
    )
  })

  it('seeds the default tags with null names', async () => {
    const db = await freshDb()
    const tags = await getAllRecords(db, 'tags')
    if (!tags.ok) throw new Error('expected ok')
    expect(tags.value.map((t) => t.id).sort()).toEqual([...SEEDED_TAG_IDS].sort())
    expect(tags.value.every((t) => t.name === null)).toBe(true)
  })

  it('upgrades a v1 database, seeding tags and clearing pre-v3 media', async () => {
    const factory = new IDBFactory()
    const v1 = await openV1(factory)
    const written = await writeMany(v1, [
      { op: 'put', store: 'sources', record: makeSource('s1') },
      { op: 'put', store: 'sessions', record: makeSession('keep') },
    ])
    expect(written.ok).toBe(true)
    v1.close()

    const opened = await openDb({ factory })
    if (!opened.ok) throw new Error(`openDb failed: ${opened.error.message}`)
    const db = opened.value
    expect(db.version).toBe(DB_VERSION)
    // Pre-v3 media stored Blob values WebKit can't persist — cleared, not migrated.
    await expect(getRecord(db, 'sources', 's1')).resolves.toEqual({ ok: true, value: null })
    // Non-media data survives.
    await expect(getRecord(db, 'sessions', 'keep')).resolves.toEqual({ ok: true, value: makeSession('keep') })
    const tags = await getAllRecords(db, 'tags')
    if (!tags.ok) throw new Error('expected ok')
    expect(tags.value.map((t) => t.id).sort()).toEqual([...SEEDED_TAG_IDS].sort())
  })
})

describe('getRecord', () => {
  it('round-trips a put record', async () => {
    const db = await freshDb()
    const source = makeSource('s1')
    const written = await writeMany(db, [{ op: 'put', store: 'sources', record: source }])
    expect(written.ok).toBe(true)

    const read = await getRecord(db, 'sources', 's1')
    expect(read).toEqual({ ok: true, value: source })
  })

  it('returns null on miss', async () => {
    const db = await freshDb()
    const read = await getRecord(db, 'sources', 'nope')
    expect(read).toEqual({ ok: true, value: null })
  })

  it('round-trips a media bytes record with content intact', async () => {
    const db = await freshDb()
    const bytes = new Uint8Array([1, 2, 3]).buffer
    const record: MediaBytesRecord = { id: 's1', type: 'image/webp', bytes }
    const written = await writeMany(db, [{ op: 'put', store: 'blobs', record }])
    expect(written.ok).toBe(true)

    const read = await getRecord(db, 'blobs', 's1')
    if (!read.ok || read.value === null) throw new Error('expected stored bytes record')
    expect(read.value.type).toBe('image/webp')
    expect([...new Uint8Array(read.value.bytes)]).toEqual([1, 2, 3])
  })
})

describe('getAllRecords', () => {
  it('returns every record in the store', async () => {
    const db = await freshDb()
    const written = await writeMany(db, [
      { op: 'put', store: 'sessions', record: makeSession('a') },
      { op: 'put', store: 'sessions', record: makeSession('b') },
    ])
    expect(written.ok).toBe(true)

    const read = await getAllRecords(db, 'sessions')
    if (!read.ok) throw new Error('expected ok')
    expect(read.value.map((s) => s.id).sort()).toEqual(['a', 'b'])
  })

  it('returns an empty array for an empty store', async () => {
    const db = await freshDb()
    const read = await getAllRecords(db, 'holdEvents')
    expect(read).toEqual({ ok: true, value: [] })
  })
})

describe('writeMany', () => {
  it('applies puts and deletes across stores in one call', async () => {
    const db = await freshDb()
    await writeMany(db, [
      { op: 'put', store: 'sources', record: makeSource('s1') },
      { op: 'put', store: 'blobs', record: { id: 's1', type: 'image/webp', bytes: new ArrayBuffer(1) } },
    ])

    const written = await writeMany(db, [
      { op: 'put', store: 'sources', record: { ...makeSource('s1'), deleted: true } },
      { op: 'delete', store: 'blobs', id: 's1' },
    ])
    expect(written.ok).toBe(true)

    const source = await getRecord(db, 'sources', 's1')
    if (!source.ok || source.value === null) throw new Error('expected tombstone')
    expect(source.value.deleted).toBe(true)
    await expect(getRecord(db, 'blobs', 's1')).resolves.toEqual({ ok: true, value: null })
  })

  it('commits nothing when one op is invalid', async () => {
    const db = await freshDb()
    // Reason: a record missing its 'id' keyPath is only constructible past the
    // compiler with a cast; it triggers the runtime DataError under test.
    const missingKey = { type: 'image/webp', bytes: new ArrayBuffer(1) } as unknown as MediaBytesRecord

    const written = await writeMany(db, [
      { op: 'put', store: 'sources', record: makeSource('s1') },
      { op: 'put', store: 'blobs', record: missingKey },
    ])
    expect(written.ok).toBe(false)
    if (written.ok) throw new Error('expected error')
    expect(written.error.name).toBe('DataError')

    await expect(getRecord(db, 'sources', 's1')).resolves.toEqual({ ok: true, value: null })
  })

  it('is a no-op for an empty batch', async () => {
    const db = await freshDb()
    await expect(writeMany(db, [])).resolves.toEqual({ ok: true, value: undefined })
  })
})
