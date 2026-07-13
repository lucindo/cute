// Dev-only IndexedDB seeder for the performance pass (roadmap: 500-source
// library, NFR-1 transition / NFR-2 scale). main.tsx installs it behind
// import.meta.env.DEV, so the whole module is tree-shaken out of production.
//
// In the dev console:
//   await cuteSeed(500)   fill the library with synthetic sources
//   await cuteClear()     wipe the media stores (tags kept)
// Reload after seeding to measure a cold grid/session.

import { newId } from '../domain/id'
import { SEEDED_TAG_IDS } from '../domain/tags'
import { COLLECTION_CHANGED_EVENT } from '../hooks/useCollection'
import {
  openDb,
  writeMany,
  type HoldEventRecord,
  type SessionRecord,
  type SourceRecord,
  type WriteOp,
} from '../storage'

// webp keeps the synthetic blobs small; decode cost tracks pixel size, not
// file size, so a compact gradient still exercises a realistic re-encode.
const MIME = 'image/webp'

interface SeedOptions {
  // Full-media edge in px — representative of an imported photo after the
  // ≤2000px fit-within re-encode; 1280 keeps generation snappy at 500 items.
  fullPx?: number
  thumbPx?: number
}

function renderTile(px: number, hue: number, label: string): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = px
  canvas.height = px
  const ctx = canvas.getContext('2d')
  if (ctx === null) throw new Error('2d canvas context unavailable')
  const gradient = ctx.createLinearGradient(0, 0, px, px)
  gradient.addColorStop(0, `hsl(${String(hue)}, 65%, 58%)`)
  gradient.addColorStop(1, `hsl(${String((hue + 45) % 360)}, 65%, 38%)`)
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, px, px)
  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)'
  ctx.font = `${String(Math.round(px / 5))}px sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(label, px / 2, px / 2)
  return canvas
}

function encode(canvas: HTMLCanvasElement): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob === null) {
          reject(new Error('canvas.toBlob returned null'))
          return
        }
        blob.arrayBuffer().then(resolve, reject)
      },
      MIME,
      0.8,
    )
  })
}

// Spread seeded tags across sources so the tag filter has realistic buckets;
// leave every third source untagged.
function pickTags(index: number): string[] {
  if (index % 3 === 0) return []
  const tag = SEEDED_TAG_IDS[index % SEEDED_TAG_IDS.length]
  return tag === undefined ? [] : [tag]
}

export async function seedLibrary(count = 500, options: SeedOptions = {}): Promise<void> {
  const fullPx = options.fullPx ?? 1280
  const thumbPx = options.thumbPx ?? 256
  const opened = await openDb()
  if (!opened.ok) {
    console.error('[seed] openDb failed', opened.error)
    return
  }
  const db = opened.value
  const now = Date.now()

  // A few sessions own the seeded holds, keeping holdEvents referentially
  // honest and giving the Stats page data.
  const sessionCount = Math.max(1, Math.ceil(count / 50))
  const sessionIds: string[] = []
  const sessionOps: WriteOp[] = []
  for (let i = 0; i < sessionCount; i++) {
    const id = newId()
    sessionIds.push(id)
    const startedAt = now - (i + 1) * 3_600_000
    sessionOps.push({
      op: 'put',
      store: 'sessions',
      record: {
        id,
        startedAt,
        plannedMinutes: 5,
        endedAt: startedAt + 5 * 60_000,
        endReason: 'completed',
        overtimeMs: 0,
        tagFilter: [],
      } satisfies SessionRecord,
    })
  }

  const BATCH = 25
  for (let start = 0; start < count; start += BATCH) {
    const ops: WriteOp[] = start === 0 ? [...sessionOps] : []
    const end = Math.min(start + BATCH, count)
    for (let i = start; i < end; i++) {
      const id = newId()
      const hue = (i * 53) % 360
      const [full, thumb] = await Promise.all([
        encode(renderTile(fullPx, hue, String(i + 1))),
        encode(renderTile(thumbPx, hue, String(i + 1))),
      ])
      ops.push({
        op: 'put',
        store: 'sources',
        record: {
          id,
          type: 'image',
          mimeType: MIME,
          bytes: full.byteLength,
          createdAt: now - i * 60_000, // low index = newest, matching import order
          tags: pickTags(i),
          deleted: false,
        } satisfies SourceRecord,
      })
      ops.push({ op: 'put', store: 'blobs', record: { id, type: MIME, bytes: full } })
      ops.push({ op: 'put', store: 'thumbs', record: { id, type: MIME, bytes: thumb } })
      // ~40% of sources carry 1–8 holds so aww-sort and stats have variety.
      const sessionId = sessionIds[i % sessionIds.length]
      if (i % 5 < 2 && sessionId !== undefined) {
        const holds = 1 + Math.floor(Math.random() * 8)
        for (let h = 0; h < holds; h++) {
          ops.push({
            op: 'put',
            store: 'holdEvents',
            record: {
              id: newId(),
              sessionId,
              sourceId: id,
              startedAt: now,
              durationMs: 300 + Math.floor(Math.random() * 12_000),
            } satisfies HoldEventRecord,
          })
        }
      }
    }
    const result = await writeMany(db, ops)
    if (!result.ok) {
      console.error('[seed] write failed', result.error)
      db.close()
      return
    }
    console.info(`[seed] ${String(end)}/${String(count)}`)
  }
  db.close()
  window.dispatchEvent(new Event(COLLECTION_CHANGED_EVENT))
  console.info(`[seed] done — ${String(count)} sources. Reload to measure from cold.`)
}

export async function clearLibrary(): Promise<void> {
  const opened = await openDb()
  if (!opened.ok) {
    console.error('[seed] openDb failed', opened.error)
    return
  }
  const ops: WriteOp[] = [
    { op: 'clear', store: 'sources' },
    { op: 'clear', store: 'blobs' },
    { op: 'clear', store: 'thumbs' },
    { op: 'clear', store: 'sessions' },
    { op: 'clear', store: 'holdEvents' },
  ]
  const result = await writeMany(opened.value, ops)
  opened.value.close()
  if (!result.ok) {
    console.error('[seed] clear failed', result.error)
    return
  }
  window.dispatchEvent(new Event(COLLECTION_CHANGED_EVENT))
  console.info('[seed] media stores cleared.')
}

declare global {
  interface Window {
    cuteSeed?: (count?: number, options?: SeedOptions) => Promise<void>
    cuteClear?: () => Promise<void>
  }
}

export function installDevSeed(): void {
  window.cuteSeed = seedLibrary
  window.cuteClear = clearLibrary
  console.info('[seed] dev seeder ready — cuteSeed(500) to fill, cuteClear() to wipe.')
}
