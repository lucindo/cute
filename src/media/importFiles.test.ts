import { IDBFactory } from 'fake-indexeddb'
import { describe, expect, it, vi } from 'vitest'

import { importFiles, type ImportDeps } from './importFiles'
import { openDb, getRecord, getAllRecords } from '../storage'

async function freshDb(): Promise<IDBDatabase> {
  const opened = await openDb({ factory: new IDBFactory() })
  if (!opened.ok) throw new Error(`openDb failed: ${opened.error.message}`)
  return opened.value
}

// Codec that decodes everything except files whose content is 'BAD'.
function fakeCodec(): ImportDeps {
  return {
    codec: {
      decode: async (blob: Blob) => {
        if ((await blob.text()) === 'BAD') throw new Error('undecodable')
        // Reason: only close() is consumed by the pipeline; a full ImageBitmap
        // cannot be constructed in jsdom.
        return { close: vi.fn() } as unknown as ImageBitmap
      },
      encode: (_bitmap: ImageBitmap, maxEdge: number) =>
        Promise.resolve(new Blob([`encoded-${String(maxEdge)}`], { type: 'image/webp' })),
    },
  }
}

describe('importFiles', () => {
  it('imports a batch: untagged sources with blob and thumb persisted', async () => {
    const db = await freshDb()
    const files = [
      new File(['a'], 'a.jpg', { type: 'image/jpeg' }),
      new File(['b'], 'b.png', { type: 'image/png' }),
    ]

    const outcome = await importFiles(db, files, fakeCodec())
    expect(outcome.rejected).toEqual([])
    expect(outcome.imported).toHaveLength(2)

    const [first] = outcome.imported
    if (!first) throw new Error('expected an imported source')
    expect(first).toMatchObject({
      type: 'image',
      mimeType: 'image/webp',
      tags: [],
      deleted: false,
    })
    expect(first.bytes).toBeGreaterThan(0)

    await expect(getRecord(db, 'sources', first.id)).resolves.toEqual({ ok: true, value: first })
    const blob = await getRecord(db, 'blobs', first.id)
    const thumb = await getRecord(db, 'thumbs', first.id)
    expect(blob.ok && blob.value !== null).toBe(true)
    expect(thumb.ok && thumb.value !== null).toBe(true)

    const ids = new Set(outcome.imported.map((s) => s.id))
    expect(ids.size).toBe(2)
  })

  it('rejects per file and keeps the rest of the batch alive', async () => {
    const db = await freshDb()
    const files = [
      new File(['good'], 'good.jpg', { type: 'image/jpeg' }),
      new File(['BAD'], 'broken.heic', { type: 'image/heic' }),
      new File(['doc'], 'notes.pdf', { type: 'application/pdf' }),
    ]

    const outcome = await importFiles(db, files, fakeCodec())
    expect(outcome.imported).toHaveLength(1)
    expect(outcome.rejected).toEqual([
      { name: 'broken.heic', rejection: { reason: 'undecodable', mimeType: 'image/heic' } },
      { name: 'notes.pdf', rejection: { reason: 'unsupported-type', mimeType: 'application/pdf' } },
    ])

    const sources = await getAllRecords(db, 'sources')
    if (!sources.ok) throw new Error('expected ok')
    expect(sources.value).toHaveLength(1)
  })

  it('reports storage failure per file', async () => {
    const db = await freshDb()
    db.close()

    const outcome = await importFiles(db, [new File(['a'], 'a.jpg', { type: 'image/jpeg' })], fakeCodec())
    expect(outcome.imported).toEqual([])
    expect(outcome.rejected).toHaveLength(1)
    expect(outcome.rejected[0]?.rejection.reason).toBe('storage-failed')
  })

  it('returns an empty outcome for an empty batch', async () => {
    const db = await freshDb()
    await expect(importFiles(db, [], fakeCodec())).resolves.toEqual({ imported: [], rejected: [] })
  })
})
