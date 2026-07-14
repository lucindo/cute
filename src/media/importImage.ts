// Image import pipeline (SPEC FR-8, FR-11): decode → downscale → re-encode,
// plus a thumbnail. Animated GIF/WebP keep their original bytes (a canvas
// re-encode would freeze the first frame) but still get a poster thumbnail.
// Undecodable files reject loudly — media must fail at import, never later.

import { fitWithin, isAnimatedGif, isAnimatedWebp, SOURCE_MAX_EDGE, THUMB_MAX_EDGE } from '../domain/image'
import { err, ok, type Result } from '../domain/result'

const ENCODE_QUALITY = 0.8

export interface ProcessedImage {
  blob: Blob // re-encoded still, or original bytes for animated passthrough
  thumb: Blob
}

export type ImportRejection =
  | { reason: 'undecodable'; mimeType: string }
  | { reason: 'encode-failed'; mimeType: string }

// Seams for the two browser-only leaves, injectable for jsdom tests.
export interface ImageCodecDeps {
  decode?: (blob: Blob) => Promise<ImageBitmap>
  encode?: (bitmap: ImageBitmap, maxEdge: number) => Promise<Blob>
}

export async function processImageFile(
  file: Blob,
  deps: ImageCodecDeps = {},
): Promise<Result<ProcessedImage, ImportRejection>> {
  const decode = deps.decode ?? decodeImage
  const encode = deps.encode ?? encodeImage

  let passthrough = false
  if (file.type === 'image/gif' || file.type === 'image/webp') {
    let bytes: Uint8Array
    try {
      bytes = new Uint8Array(await file.arrayBuffer())
    } catch {
      // File became unreadable between the picker and here — fail as undecodable
      // rather than throw out of the batch.
      return err({ reason: 'undecodable', mimeType: file.type })
    }
    passthrough = file.type === 'image/gif' ? isAnimatedGif(bytes) : isAnimatedWebp(bytes)
  }

  let bitmap: ImageBitmap
  try {
    bitmap = await decode(file)
  } catch {
    return err({ reason: 'undecodable', mimeType: file.type })
  }
  try {
    const thumb = await encode(bitmap, THUMB_MAX_EDGE)
    const blob = passthrough ? file : await encode(bitmap, SOURCE_MAX_EDGE)
    return ok({ blob, thumb })
  } catch {
    return err({ reason: 'encode-failed', mimeType: file.type })
  } finally {
    bitmap.close()
  }
}

function decodeImage(blob: Blob): Promise<ImageBitmap> {
  return createImageBitmap(blob)
}

// Shared with the video pipeline, which encodes poster frames the same way.
export async function encodeImage(bitmap: ImageBitmap, maxEdge: number): Promise<Blob> {
  const { width, height } = fitWithin(bitmap.width, bitmap.height, maxEdge)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (ctx === null) throw new Error('2d canvas context unavailable')
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(bitmap, 0, 0, width, height)
  // WebP preferred; browsers without a WebP encoder silently fall back to
  // image/png in toBlob, so verify the type and re-encode as JPEG instead.
  const webp = await toBlob(canvas, 'image/webp')
  if (webp !== null && webp.type === 'image/webp') return webp
  const jpeg = await toBlob(canvas, 'image/jpeg')
  if (jpeg !== null && jpeg.type === 'image/jpeg') return jpeg
  throw new Error('canvas produced no encodable blob')
}

function toBlob(canvas: HTMLCanvasElement, type: string): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob(resolve, type, ENCODE_QUALITY)
  })
}
