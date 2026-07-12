import { IDBFactory } from 'fake-indexeddb'
import { describe, expect, it } from 'vitest'

import { getAllRecords, getRecord, openDb, writeMany, type SourceRecord } from './index'
import { deleteSource } from './sources'

async function freshDb(): Promise<IDBDatabase> {
  const opened = await openDb({ factory: new IDBFactory() })
  if (!opened.ok) throw new Error(`openDb failed: ${opened.error.message}`)
  return opened.value
}

const SOURCE: SourceRecord = {
  id: 's1',
  type: 'image',
  mimeType: 'image/webp',
  bytes: 3,
  createdAt: 1,
  tags: ['babies'],
  caption: 'Cutie',
  deleted: false,
}

async function seed(db: IDBDatabase): Promise<void> {
  const written = await writeMany(db, [
    { op: 'put', store: 'sources', record: SOURCE },
    { op: 'put', store: 'blobs', record: { id: 's1', type: 'image/webp', bytes: new ArrayBuffer(5) } },
    { op: 'put', store: 'thumbs', record: { id: 's1', type: 'image/webp', bytes: new ArrayBuffer(5) } },
    {
      op: 'put',
      store: 'holdEvents',
      record: { id: 'h1', sessionId: 'x', sourceId: 's1', startedAt: 5, durationMs: 900 },
    },
  ])
  if (!written.ok) throw new Error('seed failed')
}

describe('deleteSource', () => {
  it('tombstones the source, removes media, and keeps hold events', async () => {
    const db = await freshDb()
    await seed(db)

    const deleted = await deleteSource(db, 's1')
    expect(deleted).toEqual({ ok: true, value: undefined })

    const source = await getRecord(db, 'sources', 's1')
    if (!source.ok || source.value === null) throw new Error('expected the tombstone')
    expect(source.value).toEqual({ ...SOURCE, deleted: true })

    await expect(getRecord(db, 'blobs', 's1')).resolves.toEqual({ ok: true, value: null })
    await expect(getRecord(db, 'thumbs', 's1')).resolves.toEqual({ ok: true, value: null })
    const events = await getAllRecords(db, 'holdEvents')
    if (!events.ok) throw new Error('expected ok')
    expect(events.value).toHaveLength(1)
  })

  it('errs on an unknown id without touching anything', async () => {
    const db = await freshDb()
    await seed(db)

    const deleted = await deleteSource(db, 'nope')
    expect(deleted.ok).toBe(false)
    if (deleted.ok) throw new Error('expected err')
    expect(deleted.error.name).toBe('NotFound')

    const blob = await getRecord(db, 'blobs', 's1')
    expect(blob.ok && blob.value !== null).toBe(true)
  })
})
