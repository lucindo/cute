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
  } catch (cause) {
    // v0.5 diagnostic: carry the probe's failure detail to the UI so the
    // iOS-only reject can be pinned down on-device. Revert once diagnosed.
    return err({ reason: 'undecodable', mimeType: file.type, detail: errName(cause) })
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
  // iOS honors gestureless inline play only via these attributes, not the props.
  video.setAttribute('muted', '')
  video.setAttribute('playsinline', '')
  video.setAttribute('webkit-playsinline', '') // older iOS spelling
  // iOS Safari decodes frames only for a <video> in the document — an off-DOM
  // element never fires loadeddata/seeked (the import stalled then rejected).
  // Park it in-viewport but invisible; off-screen or display:none can also
  // suppress the decode.
  video.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;pointer-events:none'
  document.body.appendChild(video)
  try {
    video.src = url
    // Muted inline play() forces iOS to actually decode; it may still reject,
    // so the loadeddata wait below is what gates. Capture its outcome for the
    // v0.5 diagnostic and fold it into any downstream failure.
    const play = await video.play().then(
      () => 'play:ok',
      (e: unknown) => `play:${e instanceof Error ? e.name : 'fail'}`,
    )
    try {
      await videoEvent(video, 'loadeddata')
      // Duration is Infinity for some WebM without metadata — skip the seek.
      if (Number.isFinite(video.duration) && video.duration > POSTER_SEEK_S) {
        video.currentTime = POSTER_SEEK_S
        // Best-effort: a stalled seek keeps the loaded frame rather than losing
        // the whole video over a black-frame nicety.
        await videoEvent(video, 'seeked').catch(() => {})
      }
      return await grabFrame(video)
    } catch (stage) {
      // v0.6 micro-diagnostic: the blob-URL load stalled — capture where, and
      // retry from a data: URL to confirm it's the blob-URL loader.
      const diag = await diagnoseStall(video, blob)
      throw new Error(`${play} ${errName(stage)} ${diag}`, { cause: stage })
    }
  } finally {
    // Detach before revoking so the decoder releases the blob (iOS Safari).
    video.pause()
    video.removeAttribute('src')
    video.load()
    video.remove()
    URL.revokeObjectURL(url)
  }
}

// Compact one-liner for the v0.5 diagnostic — Error message, else stringified.
function errName(e: unknown): string {
  return e instanceof Error ? e.message : String(e)
}

// v0.6 diagnostic only (revert with the probe): report where the blob-URL
// <video> stalled (canPlayType, network/ready state) and whether the same bytes
// load from a data: URL. data:ok while the blob stalled ⇒ it's the blob-URL
// loader (iOS wants range requests) ⇒ the service-worker media route is right.
async function diagnoseStall(stalled: HTMLVideoElement, blob: Blob): Promise<string> {
  const canQt = stalled.canPlayType('video/quicktime')
  const qt = canQt === '' ? 'no' : canQt
  const state = `net${String(stalled.networkState)}ready${String(stalled.readyState)}`
  const megabytes = Math.round(blob.size / (1024 * 1024))
  if (blob.size > 50 * 1024 * 1024) return `qt:${qt} ${state} data:skip(${String(megabytes)}MB)`
  let data: string
  try {
    const probe = document.createElement('video')
    probe.muted = true
    probe.playsInline = true
    probe.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;pointer-events:none'
    document.body.appendChild(probe)
    try {
      probe.src = await blobToDataUrl(blob)
      await probe.play().catch(() => undefined)
      await videoEvent(probe, 'loadeddata')
      data = 'ok'
    } catch (e) {
      data = errName(e)
    } finally {
      probe.removeAttribute('src')
      probe.load()
      probe.remove()
    }
  } catch (e) {
    data = `read:${errName(e)}`
  }
  return `qt:${qt} ${state} data:${data}`
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (): void => {
      resolve(typeof reader.result === 'string' ? reader.result : '')
    }
    reader.onerror = (): void => {
      reject(reader.error ?? new Error('read failed'))
    }
    reader.readAsDataURL(blob)
  })
}

// createImageBitmap(<video>) is flaky on Safari; a canvas round-trip is not.
async function grabFrame(video: HTMLVideoElement): Promise<ImageBitmap> {
  const { videoWidth: w, videoHeight: h } = video
  if (w === 0 || h === 0) throw new Error('noframe')
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (ctx === null) throw new Error('no2dctx')
  ctx.drawImage(video, 0, 0)
  try {
    return await createImageBitmap(canvas)
  } catch (e) {
    throw new Error(`bitmap:${errName(e)}`, { cause: e })
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
      // MediaError.code (3=decode, 4=src-unsupported) is the key iOS signal.
      reject(new Error(`${event}:err${String(video.error?.code ?? '?')}`))
    }
    const timer = setTimeout(() => {
      cleanup()
      reject(new Error(`${event}:timeout`))
    }, PROBE_TIMEOUT_MS)
    video.addEventListener(event, onEvent)
    video.addEventListener('error', onError)
  })
}
