import { describe, expect, it, vi } from 'vitest'

import { processVideoFile, type VideoProbeDeps } from './importVideo'
import { THUMB_MAX_EDGE } from '../domain/image'

// Flow tests with faked probe/encode leaves — a real probe needs a browser
// <video> decoder (verified on-device); the pipeline's branching is what's
// at risk.

function fakeBitmap(): { bitmap: ImageBitmap; close: ReturnType<typeof vi.fn> } {
  const close = vi.fn()
  // Reason: only close() is consumed by the pipeline; a full ImageBitmap
  // cannot be constructed in jsdom.
  return { bitmap: { close } as unknown as ImageBitmap, close }
}

describe('processVideoFile', () => {
  it('keeps original bytes and generates a poster thumbnail', async () => {
    const { bitmap, close } = fakeBitmap()
    const deps: Required<VideoProbeDeps> = {
      probe: vi.fn(() => Promise.resolve(bitmap)),
      encode: vi.fn(() => Promise.resolve(new Blob(['poster'], { type: 'image/webp' }))),
    }
    const file = new Blob(['mp4-bytes'], { type: 'video/mp4' })

    const result = await processVideoFile(file, deps)
    if (!result.ok) throw new Error('expected ok')
    expect(result.value.blob).toBe(file)
    expect(deps.encode).toHaveBeenCalledWith(bitmap, THUMB_MAX_EDGE)
    await expect(result.value.thumb.text()).resolves.toBe('poster')
    expect(close).toHaveBeenCalled()
  })

  it('rejects unprobeable files with their mime type', async () => {
    const deps: VideoProbeDeps = {
      probe: () => Promise.reject(new Error('no decoder')),
      encode: vi.fn(),
    }
    const file = new Blob(['avi-bytes'], { type: 'video/x-msvideo' })

    const result = await processVideoFile(file, deps)
    expect(result).toEqual({
      ok: false,
      error: { reason: 'undecodable', mimeType: 'video/x-msvideo' },
    })
    expect(deps.encode).not.toHaveBeenCalled()
  })

  it('rejects on thumbnail encode failure and still closes the poster', async () => {
    const { bitmap, close } = fakeBitmap()
    const deps: Required<VideoProbeDeps> = {
      probe: () => Promise.resolve(bitmap),
      encode: () => Promise.reject(new Error('no encoder')),
    }
    const file = new Blob(['mp4-bytes'], { type: 'video/mp4' })

    const result = await processVideoFile(file, deps)
    expect(result).toEqual({ ok: false, error: { reason: 'encode-failed', mimeType: 'video/mp4' } })
    expect(close).toHaveBeenCalled()
  })
})
