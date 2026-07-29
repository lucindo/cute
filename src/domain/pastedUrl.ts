// Classifies clipboard text so a paste can say "that's a page link, not an
// image" without a network round trip. PAGE_HOSTS only sharpens that message —
// it never gates the fetch, so an unlisted page host still fails on its
// response content type.

export type PastedUrl =
  | { kind: 'page-link'; host: string }
  | { kind: 'candidate'; url: URL }
  | { kind: 'none' }

// Hosts that hand out page URLs on copy, never direct image bytes.
const PAGE_HOSTS = [
  'instagram.com',
  'x.com',
  'twitter.com',
  'facebook.com',
  'threads.net',
  'reddit.com',
  'tiktok.com',
  'pinterest.com',
  'youtube.com',
  'youtu.be',
  'tumblr.com',
  'bsky.app',
]

export function classifyPastedUrl(text: string): PastedUrl {
  let url: URL
  try {
    url = new URL(text.trim())
  } catch {
    return { kind: 'none' }
  }
  // http would be blocked as mixed content anyway.
  if (url.protocol !== 'https:') return { kind: 'none' }
  const pageHost = PAGE_HOSTS.find(
    (host) => url.hostname === host || url.hostname.endsWith(`.${host}`),
  )
  // Report the base host, not the www./m. variant the user happened to copy.
  if (pageHost !== undefined) return { kind: 'page-link', host: pageHost }
  return { kind: 'candidate', url }
}
