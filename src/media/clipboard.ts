// Turns a clipboard paste into importable files. Bytes win over links: a
// "Copy Image" usually puts both an image flavor and a text flavor on the
// clipboard, and the bytes need no network. Per-item contract like importFiles —
// one unusable item never kills the paste.

import { fetchImageUrl, type UrlRejection } from './fetchImageUrl'
import { classifyPastedUrl } from '../domain/pastedUrl'
import { err, ok, type Result } from '../domain/result'

export type ClipboardRejection = UrlRejection | { reason: 'unreadable'; mimeType: string }

export interface ClipboardOutcome {
  files: File[]
  rejected: { name: string; rejection: ClipboardRejection }[]
}

// The flavours we consume; the DOM's ClipboardItem satisfies this structurally,
// which keeps the tests free of a full ClipboardItem stub.
interface ClipboardFlavors {
  readonly types: readonly string[]
  getType(type: string): Promise<Blob>
}

export interface ClipboardDeps {
  read?: () => Promise<readonly ClipboardFlavors[]>
  fetchImage?: (url: URL) => Promise<Result<File, UrlRejection>>
}

export async function readClipboardMedia(
  deps: ClipboardDeps = {},
): Promise<Result<ClipboardOutcome, { reason: 'clipboard-unavailable' }>> {
  const read = deps.read ?? (() => navigator.clipboard.read())
  const fetchImage = deps.fetchImage ?? fetchImageUrl

  let items: readonly ClipboardFlavors[]
  try {
    items = await read()
  } catch {
    // Unsupported, insecure origin, permission refused, or the user dismissed
    // the system paste prompt — all one outcome to us.
    return err({ reason: 'clipboard-unavailable' })
  }

  const outcome: ClipboardOutcome = { files: [], rejected: [] }
  for (const item of items) {
    const imageType = item.types.find((type) => type.startsWith('image/'))
    if (imageType !== undefined) {
      try {
        const blob = await item.getType(imageType)
        outcome.files.push(new File([blob], filenameFor(imageType), { type: imageType }))
      } catch {
        outcome.rejected.push({
          name: imageType,
          rejection: { reason: 'unreadable', mimeType: imageType },
        })
      }
      continue
    }
    if (!item.types.includes('text/plain')) continue

    let text: string
    try {
      text = await (await item.getType('text/plain')).text()
    } catch {
      outcome.rejected.push({
        name: 'text/plain',
        rejection: { reason: 'unreadable', mimeType: 'text/plain' },
      })
      continue
    }
    const classified = classifyPastedUrl(text)
    // Text that isn't a link contributes nothing at all — pasting a sentence is
    // not a failure worth reporting.
    if (classified.kind === 'none') continue
    if (classified.kind === 'page-link') {
      outcome.rejected.push({
        name: classified.host,
        rejection: { reason: 'page-link', host: classified.host },
      })
      continue
    }
    const fetched = await fetchImage(classified.url)
    if (fetched.ok) outcome.files.push(fetched.value)
    else outcome.rejected.push({ name: classified.url.hostname, rejection: fetched.error })
  }
  return ok(outcome)
}

function filenameFor(mimeType: string): string {
  return `pasted.${mimeType.slice('image/'.length)}`
}
