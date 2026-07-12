import { IDBFactory } from 'fake-indexeddb'
import { describe, expect, it } from 'vitest'

import { getAllRecords, getRecord, openDb, writeMany, type SourceRecord } from './db'
import { applyTagToSources, createTag, deleteTag, renameTag } from './tags'

async function freshDb(): Promise<IDBDatabase> {
  const opened = await openDb({ factory: new IDBFactory() })
  if (!opened.ok) throw new Error(`openDb failed: ${opened.error.message}`)
  return opened.value
}

function makeSource(id: string, tags: string[], deleted = false): SourceRecord {
  return {
    id,
    type: 'image',
    mimeType: 'image/webp',
    bytes: 1234,
    createdAt: 1_700_000_000_000,
    tags,
    deleted,
  }
}

describe('createTag', () => {
  it('stores a trimmed name and returns the record', async () => {
    const db = await freshDb()
    const created = await createTag(db, '  Vacation  ')
    if (!created.ok) throw new Error('expected ok')
    expect(created.value.name).toBe('Vacation')

    const read = await getRecord(db, 'tags', created.value.id)
    expect(read).toEqual({ ok: true, value: created.value })
  })

  it('rejects an empty name', async () => {
    const db = await freshDb()
    const created = await createTag(db, '   ')
    expect(created.ok).toBe(false)
    if (created.ok) throw new Error('expected error')
    expect(created.error.name).toBe('InvalidName')
  })
})

describe('renameTag', () => {
  it('freezes a literal name on a seeded tag', async () => {
    const db = await freshDb()
    const renamed = await renameTag(db, 'seed:babies', 'Nenéns')
    expect(renamed.ok).toBe(true)

    const read = await getRecord(db, 'tags', 'seed:babies')
    expect(read).toEqual({ ok: true, value: { id: 'seed:babies', name: 'Nenéns' } })
  })

  it('errors on an unknown id', async () => {
    const db = await freshDb()
    const renamed = await renameTag(db, 'nope', 'Anything')
    expect(renamed.ok).toBe(false)
    if (renamed.ok) throw new Error('expected error')
    expect(renamed.error.name).toBe('NotFound')
  })
})

describe('applyTagToSources', () => {
  it('adds the tag to the given sources and skips ones that already have it', async () => {
    const db = await freshDb()
    await writeMany(db, [
      { op: 'put', store: 'sources', record: makeSource('s1', []) },
      { op: 'put', store: 'sources', record: makeSource('s2', ['seed:babies']) },
      { op: 'put', store: 'sources', record: makeSource('s3', []) },
    ])

    const applied = await applyTagToSources(db, 'seed:babies', ['s1', 's2', 'gone'], 'add')
    expect(applied.ok).toBe(true)

    const sources = await getAllRecords(db, 'sources')
    if (!sources.ok) throw new Error('expected ok')
    const tagsById = new Map(sources.value.map((s) => [s.id, s.tags]))
    expect(tagsById.get('s1')).toEqual(['seed:babies'])
    expect(tagsById.get('s2')).toEqual(['seed:babies'])
    expect(tagsById.get('s3')).toEqual([])
  })

  it('removes the tag only from the given sources', async () => {
    const db = await freshDb()
    await writeMany(db, [
      { op: 'put', store: 'sources', record: makeSource('s1', ['seed:babies']) },
      { op: 'put', store: 'sources', record: makeSource('s2', ['seed:babies']) },
    ])

    const applied = await applyTagToSources(db, 'seed:babies', ['s1'], 'remove')
    expect(applied.ok).toBe(true)

    const sources = await getAllRecords(db, 'sources')
    if (!sources.ok) throw new Error('expected ok')
    const tagsById = new Map(sources.value.map((s) => [s.id, s.tags]))
    expect(tagsById.get('s1')).toEqual([])
    expect(tagsById.get('s2')).toEqual(['seed:babies'])
  })

  it('errors on an unknown tag id', async () => {
    const db = await freshDb()
    await writeMany(db, [{ op: 'put', store: 'sources', record: makeSource('s1', []) }])
    const applied = await applyTagToSources(db, 'nope', ['s1'], 'add')
    expect(applied.ok).toBe(false)
    if (applied.ok) throw new Error('expected error')
    expect(applied.error.name).toBe('NotFound')
  })
})

describe('deleteTag', () => {
  it('removes the record and strips the id from all sources, tombstones included', async () => {
    const db = await freshDb()
    const written = await writeMany(db, [
      { op: 'put', store: 'sources', record: makeSource('s1', ['seed:babies', 'seed:kittens']) },
      { op: 'put', store: 'sources', record: makeSource('s2', ['seed:babies'], true) },
      { op: 'put', store: 'sources', record: makeSource('s3', ['seed:kittens']) },
    ])
    expect(written.ok).toBe(true)

    const deleted = await deleteTag(db, 'seed:babies')
    expect(deleted.ok).toBe(true)

    await expect(getRecord(db, 'tags', 'seed:babies')).resolves.toEqual({ ok: true, value: null })
    const sources = await getAllRecords(db, 'sources')
    if (!sources.ok) throw new Error('expected ok')
    const tagsById = new Map(sources.value.map((s) => [s.id, s.tags]))
    expect(tagsById.get('s1')).toEqual(['seed:kittens'])
    expect(tagsById.get('s2')).toEqual([])
    expect(tagsById.get('s3')).toEqual(['seed:kittens'])
  })

  it('errors on an unknown id', async () => {
    const db = await freshDb()
    const deleted = await deleteTag(db, 'nope')
    expect(deleted.ok).toBe(false)
    if (deleted.ok) throw new Error('expected error')
    expect(deleted.error.name).toBe('NotFound')
  })
})
