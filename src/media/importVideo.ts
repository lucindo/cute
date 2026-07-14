// Video import pipeline (SPEC FR-9): prove the browser can decode the file
// by loading it into an off-DOM <video>, capture a poster frame as the
// thumbnail, and keep the original bytes — client-side transcoding is out of
// scope, so what won't play here rejects at import, never in a session.

import { THUMB_MAX_EDGE } from '../domain/image'
import { err, ok, type Result } from '../domain/result'
import { encodeImage, type ImportRejection } from './importImage'

export interface ProcessedVideo {
  blob: Blob // original bytes, untouched
  thumb: Blob
}

// Seams for the browser-only leaves, injectable for jsdom tests.
export interface VideoProbeDeps {
  probe?: (blob: Blob) => Promise<ImageBitmap>
  encode?: (bitmap: ImageBitmap, maxEdge: number) => Promise<Blob>
}

export async function processVideoFile(
  file: Blob,
  deps: VideoProbeDeps = {},
): Promise<Result<ProcessedVideo, ImportRejection>> {
  const probe = deps.probe ?? probeVideo
  const encode = deps.encode ?? encodeImage

  let poster: ImageBitmap
  try {
    poster = await probe(file)
  } catch {
    return err({ reason: 'undecodable', mimeType: file.type })
  }
  try {
    const thumb = await encode(poster, THUMB_MAX_EDGE)
    return ok({ blob: file, thumb })
  } catch {
    return err({ reason: 'encode-failed', mimeType: file.type })
  } finally {
    poster.close()
  }
}

// Frame 0 is often black or a fade-in; nudge forward for the poster.
const POSTER_SEEK_S = 0.5

async function probeVideo(blob: Blob): Promise<ImageBitmap> {
  const url = URL.createObjectURL(blob)
  const video = document.createElement('video')
  video.muted = true
  video.playsInline = true
  video.preload = 'auto'
  try {
    video.src = url
    // iOS Safari won't decode frames for an off-DOM <video> that never played,
    // so `loadeddata`/`seeked` never fire (and never error) — the import hangs.
    // A muted inline play() is allowed without a gesture and forces the decode;
    // it may still reject, so the loadeddata wait below is what actually gates.
    await video.play().catch(() => {})
    await videoEvent(video, 'loadeddata')
    // Duration is Infinity for some WebM without metadata — skip the seek.
    if (Number.isFinite(video.duration) && video.duration > POSTER_SEEK_S) {
      video.currentTime = POSTER_SEEK_S
      await videoEvent(video, 'seeked')
    }
    return await createImageBitmap(video)
  } finally {
    // Detach before revoking so the decoder releases the blob (iOS Safari).
    video.removeAttribute('src')
    video.load()
    URL.revokeObjectURL(url)
  }
}

// Cap on each decode wait: a video event that never fires (nor errors) must
// reject so the file rejects as undecodable, never hanging the whole import.
const PROBE_TIMEOUT_MS = 10_000

function videoEvent(video: HTMLVideoElement, event: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const cleanup = (): void => {
      clearTimeout(timer)
      video.removeEventListener(event, onEvent)
      video.removeEventListener('error', onError)
    }
    const onEvent = (): void => {
      cleanup()
      resolve()
    }
    const onError = (): void => {
      cleanup()
      reject(new Error(video.error?.message ?? 'video decode failed'))
    }
    const timer = setTimeout(() => {
      cleanup()
      reject(new Error(`video ${event} timed out`))
    }, PROBE_TIMEOUT_MS)
    video.addEventListener(event, onEvent)
    video.addEventListener('error', onError)
  })
}
