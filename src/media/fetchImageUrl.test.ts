import { describe, expect, it, vi } from 'vitest'

import { fetchImageUrl } from './fetchImageUrl'

const URL_JPG = new URL('https://cdn.example.com/pics/photo.jpg')

function respond(body: BlobPart, headers: Record<string, string>, status = 200): Response {
  return new Response(body, { status, headers })
}

function stub(response: Response | Error): typeof globalThis.fetch {
  return vi.fn(() => (response instanceof Error ? Promise.reject(response) : Promise.resolve(response)))
}

describe('fetchImageUrl', () => {
  it('returns the image as a File named from the URL path', async () => {
    const result = await fetchImageUrl(URL_JPG, {
      fetch: stub(respond('bytes', { 'content-type': 'image/jpeg' })),
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.name).toBe('photo.jpg')
    expect(result.value.type).toBe('image/jpeg')
  })

  it('parses a content type carrying parameters', async () => {
    const result = await fetchImageUrl(URL_JPG, {
      fetch: stub(respond('bytes', { 'content-type': 'image/png; charset=binary' })),
    })
    expect(result.ok && result.value.type).toBe('image/png')
  })

  it('falls back to the host when the path has no filename', async () => {
    const result = await fetchImageUrl(new URL('https://cdn.example.com/'), {
      fetch: stub(respond('bytes', { 'content-type': 'image/jpeg' })),
    })
    expect(result.ok && result.value.name).toBe('cdn.example.com')
  })

  it('reports an HTML response as a page link', async () => {
    const result = await fetchImageUrl(URL_JPG, {
      fetch: stub(respond('<html></html>', { 'content-type': 'text/html' })),
    })
    expect(result).toEqual({
      ok: false,
      error: { reason: 'page-link', host: 'cdn.example.com' },
    })
  })

  it('rejects any other non-image content type', async () => {
    const result = await fetchImageUrl(URL_JPG, {
      fetch: stub(respond('{}', { 'content-type': 'application/json' })),
    })
    expect(result).toEqual({
      ok: false,
      error: { reason: 'not-image-content', mimeType: 'application/json' },
    })
  })

  it('rejects a missing content type rather than assuming an image', async () => {
    const result = await fetchImageUrl(URL_JPG, { fetch: stub(respond('bytes', {})) })
    expect(result.ok).toBe(false)
  })

  it('reports a thrown fetch as blocked — CORS, offline and DNS all land here', async () => {
    const result = await fetchImageUrl(URL_JPG, { fetch: stub(new TypeError('Failed to fetch')) })
    expect(result).toEqual({
      ok: false,
      error: { reason: 'fetch-blocked', host: 'cdn.example.com' },
    })
  })

  it('reports an error status as blocked', async () => {
    const result = await fetchImageUrl(URL_JPG, {
      fetch: stub(respond('nope', { 'content-type': 'image/jpeg' }, 404)),
    })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error.reason).toBe('fetch-blocked')
  })

  it('refuses an oversize image on its declared length, without reading the body', async () => {
    const response = respond('bytes', {
      'content-type': 'image/jpeg',
      'content-length': String(40 * 1024 * 1024),
    })
    const blob = vi.spyOn(response, 'blob')
    const result = await fetchImageUrl(URL_JPG, { fetch: stub(response) })
    expect(result).toEqual({
      ok: false,
      error: { reason: 'too-large', bytes: 40 * 1024 * 1024 },
    })
    expect(blob).not.toHaveBeenCalled()
  })

  it('refuses an oversize image whose length header was absent', async () => {
    const result = await fetchImageUrl(URL_JPG, {
      fetch: stub(respond(new Uint8Array(26 * 1024 * 1024), { 'content-type': 'image/jpeg' })),
    })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error.reason).toBe('too-large')
  })

  it('sends no credentials and no referrer', async () => {
    const fetchStub = stub(respond('bytes', { 'content-type': 'image/jpeg' }))
    await fetchImageUrl(URL_JPG, { fetch: fetchStub })
    expect(fetchStub).toHaveBeenCalledWith(
      URL_JPG,
      expect.objectContaining({ credentials: 'omit', referrerPolicy: 'no-referrer' }),
    )
  })
})
