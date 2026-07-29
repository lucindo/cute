import { describe, expect, it, vi } from 'vitest'

import { readClipboardMedia } from './clipboard'
import { ok } from '../domain/result'

function item(flavors: Record<string, string>): {
  types: string[]
  getType: (type: string) => Promise<Blob>
} {
  return {
    types: Object.keys(flavors),
    getType: (type) => {
      const body = flavors[type]
      return body === undefined
        ? Promise.reject(new Error('no such flavor'))
        : Promise.resolve(new Blob([body], { type }))
    },
  }
}

const neverFetch = vi.fn(() => Promise.reject(new Error('should not fetch')))

describe('readClipboardMedia', () => {
  it('takes image bytes and names them by flavour', async () => {
    const result = await readClipboardMedia({
      read: () => Promise.resolve([item({ 'image/png': 'bytes' })]),
      fetchImage: neverFetch,
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.files).toHaveLength(1)
    expect(result.value.files[0]?.name).toBe('pasted.png')
    expect(result.value.files[0]?.type).toBe('image/png')
  })

  it('prefers image bytes over a text link on the same item', async () => {
    const fetchImage = vi.fn(() =>
      Promise.resolve(ok(new File(['x'], 'fetched.jpg', { type: 'image/jpeg' }))),
    )
    const result = await readClipboardMedia({
      read: () =>
        Promise.resolve([
          item({ 'image/png': 'bytes', 'text/plain': 'https://cdn.example.com/photo.jpg' }),
        ]),
      fetchImage,
    })
    expect(fetchImage).not.toHaveBeenCalled()
    expect(result.ok && result.value.files[0]?.name).toBe('pasted.png')
  })

  it('fetches a text link when no image flavour is offered', async () => {
    const file = new File(['x'], 'photo.jpg', { type: 'image/jpeg' })
    const fetchImage = vi.fn(() => Promise.resolve(ok(file)))
    const result = await readClipboardMedia({
      read: () => Promise.resolve([item({ 'text/plain': 'https://cdn.example.com/photo.jpg' })]),
      fetchImage,
    })
    expect(fetchImage).toHaveBeenCalledWith(new URL('https://cdn.example.com/photo.jpg'))
    expect(result.ok && result.value.files).toEqual([file])
  })

  it('reports a social page link without fetching it', async () => {
    const result = await readClipboardMedia({
      read: () => Promise.resolve([item({ 'text/plain': 'https://www.instagram.com/p/abc/' })]),
      fetchImage: neverFetch,
    })
    expect(neverFetch).not.toHaveBeenCalled()
    expect(result.ok && result.value.rejected).toEqual([
      { name: 'instagram.com', rejection: { reason: 'page-link', host: 'instagram.com' } },
    ])
  })

  it('ignores pasted text that is not a link', async () => {
    const result = await readClipboardMedia({
      read: () => Promise.resolve([item({ 'text/plain': 'what a cute baby' })]),
      fetchImage: neverFetch,
    })
    expect(result.ok && result.value).toEqual({ files: [], rejected: [] })
  })

  it('keeps the paste alive when one item is unreadable', async () => {
    const result = await readClipboardMedia({
      read: () =>
        Promise.resolve([
          { types: ['image/png'], getType: () => Promise.reject(new Error('sanitization failed')) },
          item({ 'image/jpeg': 'bytes' }),
        ]),
      fetchImage: neverFetch,
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.files.map((file) => file.name)).toEqual(['pasted.jpeg'])
    expect(result.value.rejected).toEqual([
      { name: 'image/png', rejection: { reason: 'unreadable', mimeType: 'image/png' } },
    ])
  })

  it('surfaces a refused or unsupported clipboard as unavailable', async () => {
    const result = await readClipboardMedia({
      read: () => Promise.reject(new DOMException('denied', 'NotAllowedError')),
      fetchImage: neverFetch,
    })
    expect(result).toEqual({ ok: false, error: { reason: 'clipboard-unavailable' } })
  })
})
