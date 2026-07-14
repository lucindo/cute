import { describe, expect, it, vi } from 'vitest'

import { processImageFile, type ImageCodecDeps } from './importImage'
import { SOURCE_MAX_EDGE, THUMB_MAX_EDGE } from '../domain/image'

// Flow tests with faked codec leaves — real decode/encode need a browser
// canvas (verified on-device); the pipeline's branching is what's at risk.

function fakeBitmap(): { bitmap: ImageBitmap; close: ReturnType<typeof vi.fn> } {
  const close = vi.fn()
  // Reason: only close() is consumed by the pipeline; a full ImageBitmap
  // cannot be constructed in jsdom.
  return { bitmap: { close } as unknown as ImageBitmap, close }
}

function fakeCodec(bitmap: ImageBitmap): Required<ImageCodecDeps> {
  return {
    decode: vi.fn(() => Promise.resolve(bitmap)),
    encode: vi.fn((_b: ImageBitmap, maxEdge: number) =>
      Promise.resolve(new Blob([`encoded-${String(maxEdge)}`], { type: 'image/webp' })),
    ),
  }
}

// Two image descriptors → animated. Mirrors the fixtures in image.test.ts.
const ANIMATED_GIF_BYTES = Uint8Array.from([
  0x47, 0x49, 0x46, 0x38, 0x39, 0x61, // 'GIF89a'
  0x02, 0x00, 0x02, 0x00, 0x00, 0x00, 0x00, // screen descriptor, no color table
  0x2c, 0x00, 0x00, 0x00, 0x00, 0x02, 0x00, 0x02, 0x00, 0x00, 0x02, 0x01, 0x44, 0x00,
  0x2c, 0x00, 0x00, 0x00, 0x00, 0x02, 0x00, 0x02, 0x00, 0x00, 0x02, 0x01, 0x44, 0x00,
  0x3b,
])

describe('processImageFile', () => {
  it('re-encodes a still image and generates a thumbnail', async () => {
    const { bitmap, close } = fakeBitmap()
    const codec = fakeCodec(bitmap)
    const file = new Blob(['jpeg-bytes'], { type: 'image/jpeg' })

    const result = await processImageFile(file, codec)
    if (!result.ok) throw new Error('expected ok')
    expect(codec.encode).toHaveBeenCalledWith(bitmap, THUMB_MAX_EDGE)
    expect(codec.encode).toHaveBeenCalledWith(bitmap, SOURCE_MAX_EDGE)
    await expect(result.value.blob.text()).resolves.toBe(`encoded-${String(SOURCE_MAX_EDGE)}`)
    await expect(result.value.thumb.text()).resolves.toBe(`encoded-${String(THUMB_MAX_EDGE)}`)
    expect(close).toHaveBeenCalled()
  })

  it('passes an animated gif through as-is, with a generated thumbnail', async () => {
    const { bitmap } = fakeBitmap()
    const codec = fakeCodec(bitmap)
    const file = new Blob([ANIMATED_GIF_BYTES], { type: 'image/gif' })

    const result = await processImageFile(file, codec)
    if (!result.ok) throw new Error('expected ok')
    expect(result.value.blob).toBe(file)
    await expect(result.value.thumb.text()).resolves.toBe(`encoded-${String(THUMB_MAX_EDGE)}`)
    expect(codec.encode).toHaveBeenCalledTimes(1)
  })

  it('re-encodes a single-frame gif like any still', async () => {
    const { bitmap } = fakeBitmap()
    const codec = fakeCodec(bitmap)
    // One image descriptor only
    const file = new Blob([ANIMATED_GIF_BYTES.slice(0, 27)], { type: 'image/gif' })

    const result = await processImageFile(file, codec)
    if (!result.ok) throw new Error('expected ok')
    expect(result.value.blob).not.toBe(file)
    expect(codec.encode).toHaveBeenCalledWith(bitmap, SOURCE_MAX_EDGE)
  })

  it('rejects undecodable files with their mime type', async () => {
    const codec: ImageCodecDeps = {
      decode: () => Promise.reject(new Error('bad image')),
      encode: vi.fn(),
    }
    const file = new Blob(['not-an-image'], { type: 'image/heic' })

    const result = await processImageFile(file, codec)
    expect(result).toEqual({ ok: false, error: { reason: 'undecodable', mimeType: 'image/heic' } })
    expect(codec.encode).not.toHaveBeenCalled()
  })

  it('rejects on encode failure and still closes the bitmap', async () => {
    const { bitmap, close } = fakeBitmap()
    const codec: Required<ImageCodecDeps> = {
      decode: () => Promise.resolve(bitmap),
      encode: () => Promise.reject(new Error('no encoder')),
    }
    const file = new Blob(['jpeg-bytes'], { type: 'image/jpeg' })

    const result = await processImageFile(file, codec)
    expect(result).toEqual({ ok: false, error: { reason: 'encode-failed', mimeType: 'image/jpeg' } })
    expect(close).toHaveBeenCalled()
  })
})
