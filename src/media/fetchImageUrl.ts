// Network boundary for a pasted image URL — the one runtime fetch the app makes
// beyond its own assets. The response's content type decides what this is, never
// the URL's shape. No referrer and no credentials: a paste must not tell the CDN
// who is pasting.

import { err, ok, type Result } from '../domain/result'

const TIMEOUT_MS = 10_000
const MAX_BYTES = 25 * 1024 * 1024

export type UrlRejection =
  | { reason: 'page-link'; host: string }
  | { reason: 'fetch-blocked'; host: string }
  | { reason: 'not-image-content'; mimeType: string }
  | { reason: 'too-large'; bytes: number }

// Seam for the network leaf, injectable for jsdom tests.
export interface FetchDeps {
  fetch?: typeof globalThis.fetch
}

export async function fetchImageUrl(
  url: URL,
  deps: FetchDeps = {},
): Promise<Result<File, UrlRejection>> {
  const doFetch = deps.fetch ?? globalThis.fetch.bind(globalThis)

  let response: Response
  try {
    response = await doFetch(url, {
      mode: 'cors',
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
  } catch {
    // A CORS denial is indistinguishable from offline or DNS failure by design —
    // script never learns which.
    return err({ reason: 'fetch-blocked', host: url.hostname })
  }
  if (!response.ok) return err({ reason: 'fetch-blocked', host: url.hostname })

  const mimeType = (response.headers.get('content-type') ?? '').split(';')[0]?.trim() ?? ''
  // Proof after the fact that an unlisted host was a page, not an image.
  if (mimeType === 'text/html') return err({ reason: 'page-link', host: url.hostname })
  if (!mimeType.startsWith('image/')) return err({ reason: 'not-image-content', mimeType })

  // Trust the declared size enough to skip the transfer, then check the real one
  // in case the header lied or was absent.
  const declared = Number(response.headers.get('content-length'))
  if (declared > MAX_BYTES) return err({ reason: 'too-large', bytes: declared })

  let blob: Blob
  try {
    blob = await response.blob()
  } catch {
    return err({ reason: 'fetch-blocked', host: url.hostname })
  }
  if (blob.size > MAX_BYTES) return err({ reason: 'too-large', bytes: blob.size })

  return ok(new File([blob], filenameFor(url), { type: mimeType }))
}

function filenameFor(url: URL): string {
  return url.pathname.split('/').filter(Boolean).at(-1) ?? url.hostname
}
