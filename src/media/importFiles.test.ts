import { IDBFactory } from 'fake-indexeddb'
import { describe, expect, it, vi } from 'vitest'

import { importFiles, type ImportDeps } from './importFiles'
import { openDb, getRecord, getAllRecords } from '../storage'

async function freshDb(): Promise<IDBDatabase> {
  const opened = await openDb({ factory: new IDBFactory() })
  if (!opened.ok) throw new Error(`openDb failed: ${opened.error.message}`)
  return opened.value
}

// Decode/probe leaves that reject files whose content is 'BAD'.
function fakeDeps(): ImportDeps {
  // Reason: only close() is consumed by the pipelines; a full ImageBitmap
  // cannot be constructed in jsdom.
  const bitmap = async (blob: Blob): Promise<ImageBitmap> => {
    if ((await blob.text()) === 'BAD') throw new Error('undecodable')
    return { close: vi.fn() } as unknown as ImageBitmap
  }
  return {
    codec: {
      decode: bitmap,
      encode: (_bitmap: ImageBitmap, maxEdge: number) =>
        Promise.resolve(new Blob([`encoded-${String(maxEdge)}`], { type: 'image/webp' })),
    },
    video: {
      probe: bitmap,
      encode: () => Promise.resolve(new Blob(['poster'], { type: 'image/webp' })),
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

    const outcome = await importFiles(db, files, fakeDeps())
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

  it('imports a video as-is with a poster thumbnail', async () => {
    const db = await freshDb()
    const files = [new File(['clip'], 'clip.mp4', { type: 'video/mp4' })]

    const outcome = await importFiles(db, files, fakeDeps())
    expect(outcome.rejected).toEqual([])
    const [source] = outcome.imported
    if (!source) throw new Error('expected an imported source')
    expect(source).toMatchObject({ type: 'video', mimeType: 'video/mp4', tags: [], deleted: false })
    // Original size, not a re-encode; byte identity is covered in importVideo tests.
    expect(source.bytes).toBe(files[0]?.size)

    const blob = await getRecord(db, 'blobs', source.id)
    const thumb = await getRecord(db, 'thumbs', source.id)
    expect(blob.ok && blob.value !== null).toBe(true)
    expect(thumb.ok && thumb.value !== null).toBe(true)
  })

  it('rejects per file and keeps the rest of the batch alive', async () => {
    const db = await freshDb()
    const files = [
      new File(['good'], 'good.jpg', { type: 'image/jpeg' }),
      new File(['BAD'], 'broken.heic', { type: 'image/heic' }),
      new File(['BAD'], 'broken.mov', { type: 'video/quicktime' }),
      new File(['doc'], 'notes.pdf', { type: 'application/pdf' }),
    ]

    const outcome = await importFiles(db, files, fakeDeps())
    expect(outcome.imported).toHaveLength(1)
    expect(outcome.rejected).toEqual([
      { name: 'broken.heic', rejection: { reason: 'undecodable', mimeType: 'image/heic' } },
      { name: 'broken.mov', rejection: { reason: 'undecodable', mimeType: 'video/quicktime' } },
      { name: 'notes.pdf', rejection: { reason: 'unsupported-type', mimeType: 'application/pdf' } },
    ])

    const sources = await getAllRecords(db, 'sources')
    if (!sources.ok) throw new Error('expected ok')
    expect(sources.value).toHaveLength(1)
  })

  it('reports storage failure per file', async () => {
    const db = await freshDb()
    db.close()

    const outcome = await importFiles(db, [new File(['a'], 'a.jpg', { type: 'image/jpeg' })], fakeDeps())
    expect(outcome.imported).toEqual([])
    expect(outcome.rejected).toHaveLength(1)
    expect(outcome.rejected[0]?.rejection.reason).toBe('storage-failed')
  })

  it('keeps the batch alive when a file becomes unreadable mid-import', async () => {
    const db = await freshDb()
    const good = new File(['a'], 'a.jpg', { type: 'image/jpeg' })
    const badVideo = new File(['clip'], 'clip.mp4', { type: 'video/mp4' })
    const badGif = new File(['x'], 'anim.gif', { type: 'image/gif' })
    const unreadable = (): Promise<ArrayBuffer> =>
      Promise.reject(new DOMException('gone', 'NotReadableError'))
    vi.spyOn(badVideo, 'arrayBuffer').mockImplementation(unreadable)
    vi.spyOn(badGif, 'arrayBuffer').mockImplementation(unreadable)

    const outcome = await importFiles(db, [good, badVideo, badGif], fakeDeps())
    expect(outcome.imported).toHaveLength(1)
    expect(outcome.rejected).toHaveLength(2)
    expect(outcome.rejected[0]?.name).toBe('clip.mp4')
    expect(outcome.rejected[0]?.rejection.reason).toBe('storage-failed')
    expect(outcome.rejected[1]).toEqual({
      name: 'anim.gif',
      rejection: { reason: 'undecodable', mimeType: 'image/gif' },
    })
  })

  it('returns an empty outcome for an empty batch', async () => {
    const db = await freshDb()
    await expect(importFiles(db, [], fakeDeps())).resolves.toEqual({ imported: [], rejected: [] })
  })
})
