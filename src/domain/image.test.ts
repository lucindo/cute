import { describe, expect, it } from 'vitest'

import { fitWithin, isAnimatedGif, isAnimatedWebp } from './image'

describe('fitWithin', () => {
  it('keeps dimensions at or under the cap', () => {
    expect(fitWithin(1200, 800, 2000)).toEqual({ width: 1200, height: 800 })
    expect(fitWithin(2000, 2000, 2000)).toEqual({ width: 2000, height: 2000 })
  })

  it('scales the longest edge to the cap, preserving aspect', () => {
    expect(fitWithin(4000, 2000, 2000)).toEqual({ width: 2000, height: 1000 })
    expect(fitWithin(1500, 3000, 300)).toEqual({ width: 150, height: 300 })
  })

  it('never collapses an edge below 1px', () => {
    expect(fitWithin(10000, 2, 300)).toEqual({ width: 300, height: 1 })
  })
})

// Minimal hand-built GIF streams. Layout: header (6) + logical screen
// descriptor (7) + optional global color table + blocks.
const GIF_HEADER = [0x47, 0x49, 0x46, 0x38, 0x39, 0x61] // 'GIF89a'

function gifScreenDescriptor(withGlobalColorTable: boolean): number[] {
  // 2x2 canvas; packed 0x80 = GCT present, size bits 0 → 2 entries (6 bytes)
  return [0x02, 0x00, 0x02, 0x00, withGlobalColorTable ? 0x80 : 0x00, 0x00, 0x00]
}

const GIF_GLOBAL_COLOR_TABLE = [0, 0, 0, 255, 255, 255]

// Image descriptor + 1-byte pixel data: separator, x, y, w, h, packed,
// LZW min code size, one data sub-block, terminator.
const GIF_FRAME = [
  0x2c, 0x00, 0x00, 0x00, 0x00, 0x02, 0x00, 0x02, 0x00, 0x00,
  0x02, 0x01, 0x44, 0x00,
]

// Graphic control extension: introducer, label, block size 4, 4 bytes, terminator.
const GIF_GRAPHIC_CONTROL = [0x21, 0xf9, 0x04, 0x00, 0x00, 0x00, 0x00, 0x00]

const GIF_TRAILER = [0x3b]

describe('isAnimatedGif', () => {
  it('is false for a single-frame gif', () => {
    const gif = Uint8Array.from([
      ...GIF_HEADER, ...gifScreenDescriptor(false), ...GIF_FRAME, ...GIF_TRAILER,
    ])
    expect(isAnimatedGif(gif)).toBe(false)
  })

  it('is true for two frames, skipping color tables and extensions', () => {
    const gif = Uint8Array.from([
      ...GIF_HEADER, ...gifScreenDescriptor(true), ...GIF_GLOBAL_COLOR_TABLE,
      ...GIF_GRAPHIC_CONTROL, ...GIF_FRAME,
      ...GIF_GRAPHIC_CONTROL, ...GIF_FRAME,
      ...GIF_TRAILER,
    ])
    expect(isAnimatedGif(gif)).toBe(true)
  })

  it('is false for non-gif and truncated data', () => {
    expect(isAnimatedGif(Uint8Array.from([0x89, 0x50, 0x4e, 0x47]))).toBe(false)
    expect(isAnimatedGif(Uint8Array.from(GIF_HEADER))).toBe(false)
    // frame count 1 then stream ends mid-block
    const truncated = Uint8Array.from([
      ...GIF_HEADER, ...gifScreenDescriptor(false), ...GIF_FRAME.slice(0, 5),
    ])
    expect(isAnimatedGif(truncated)).toBe(false)
  })
})

function webpBytes(vp8x: boolean, flags: number): Uint8Array {
  const fourcc = vp8x ? [0x56, 0x50, 0x38, 0x58] : [0x56, 0x50, 0x38, 0x20] // 'VP8X' | 'VP8 '
  return Uint8Array.from([
    0x52, 0x49, 0x46, 0x46, 0x20, 0x00, 0x00, 0x00, // 'RIFF' + size
    0x57, 0x45, 0x42, 0x50, // 'WEBP'
    ...fourcc, 0x0a, 0x00, 0x00, 0x00, // chunk size
    flags, 0x00, 0x00, 0x00,
  ])
}

describe('isAnimatedWebp', () => {
  it('is true only when the VP8X animation flag is set', () => {
    expect(isAnimatedWebp(webpBytes(true, 0x02))).toBe(true)
    expect(isAnimatedWebp(webpBytes(true, 0x00))).toBe(false)
    expect(isAnimatedWebp(webpBytes(false, 0x02))).toBe(false) // simple lossy, no VP8X
  })

  it('is false for non-webp and truncated data', () => {
    expect(isAnimatedWebp(Uint8Array.from([0x47, 0x49, 0x46]))).toBe(false)
    expect(isAnimatedWebp(webpBytes(true, 0x02).slice(0, 16))).toBe(false)
  })
})
