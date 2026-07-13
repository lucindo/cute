// Backup export/restore (SPEC FR-20/21/22). One zip: manifest.json (record
// metadata) + media/<id>.<ext> + thumbs/<id>.<ext>. Media travels stored, not
// deflated — images and videos are already compressed. Restore validates the
// manifest before touching any store and rewrites everything in one atomic
// transaction, so a corrupt file leaves existing data untouched (AC-10).

import { strFromU8, strToU8, unzipSync, zipSync, type Zippable } from 'fflate'

import { buildManifest, validateManifest } from '../domain/backup'
import { err, ok, type Result } from '../domain/result'
import {
  getAllRecords,
  writeMany,
  type MediaBytesRecord,
  type StorageError,
  type WriteOp,
} from './db'

const MANIFEST_PATH = 'manifest.json'
const MEDIA_DIR = 'media/'
const THUMB_DIR = 'thumbs/'

export async function exportBackup(db: IDBDatabase): Promise<Result<Uint8Array, StorageError>> {
  const sources = await getAllRecords(db, 'sources')
  if (!sources.ok) return sources
  const tags = await getAllRecords(db, 'tags')
  if (!tags.ok) return tags
  const sessions = await getAllRecords(db, 'sessions')
  if (!sessions.ok) return sessions
  const holdEvents = await getAllRecords(db, 'holdEvents')
  if (!holdEvents.ok) return holdEvents
  const blobs = await getAllRecords(db, 'blobs')
  if (!blobs.ok) return blobs
  const thumbs = await getAllRecords(db, 'thumbs')
  if (!thumbs.ok) return thumbs

  const manifest = buildManifest({
    sources: sources.value,
    tags: tags.value,
    sessions: sessions.value,
    holdEvents: holdEvents.value,
  })

  const files: Zippable = { [MANIFEST_PATH]: strToU8(JSON.stringify(manifest)) }
  for (const b of blobs.value) files[`${MEDIA_DIR}${b.id}.${extForMime(b.type)}`] = stored(b.bytes)
  for (const t of thumbs.value) files[`${THUMB_DIR}${t.id}.${extForMime(t.type)}`] = stored(t.bytes)

  try {
    return ok(zipSync(files))
  } catch (cause) {
    return err({ name: 'ZipFailed', message: String(cause) })
  }
}

export async function importBackup(
  db: IDBDatabase,
  bytes: Uint8Array,
): Promise<Result<void, StorageError>> {
  let entries: Record<string, Uint8Array>
  try {
    entries = unzipSync(bytes)
  } catch {
    return err({ name: 'InvalidBackup', message: 'file is not a readable zip' })
  }

  const manifestBytes = entries[MANIFEST_PATH]
  if (manifestBytes === undefined) {
    return err({ name: 'InvalidBackup', message: 'missing manifest.json' })
  }
  let raw: unknown
  try {
    raw = JSON.parse(strFromU8(manifestBytes))
  } catch {
    return err({ name: 'InvalidBackup', message: 'manifest.json is not valid JSON' })
  }
  const manifest = validateManifest(raw)
  if (!manifest.ok) return err({ name: 'InvalidBackup', message: manifest.error })

  // Everything below is in-memory until the single writeMany, so any failure
  // above returns before a store is touched (FR-22). Clears queue before puts
  // in the same transaction, so restore is a clean replace-all.
  const ops: WriteOp[] = [
    { op: 'clear', store: 'sources' },
    { op: 'clear', store: 'blobs' },
    { op: 'clear', store: 'thumbs' },
    { op: 'clear', store: 'sessions' },
    { op: 'clear', store: 'holdEvents' },
    { op: 'clear', store: 'tags' },
  ]
  for (const record of manifest.value.sources) ops.push({ op: 'put', store: 'sources', record })
  for (const record of manifest.value.tags) ops.push({ op: 'put', store: 'tags', record })
  for (const record of manifest.value.sessions) ops.push({ op: 'put', store: 'sessions', record })
  for (const record of manifest.value.holdEvents) ops.push({ op: 'put', store: 'holdEvents', record })

  // Blob MIME is authoritative from the source record; thumb MIME (only ever
  // webp/jpeg) rides in its entry extension.
  const sourceMime = new Map(manifest.value.sources.map((s) => [s.id, s.mimeType]))
  for (const [path, data] of Object.entries(entries)) {
    if (path.startsWith(MEDIA_DIR)) {
      const id = idFromPath(path, MEDIA_DIR)
      const type = sourceMime.get(id)
      if (type === undefined) continue // media with no source record — drop it
      ops.push({ op: 'put', store: 'blobs', record: mediaRecord(id, type, data) })
    } else if (path.startsWith(THUMB_DIR)) {
      const id = idFromPath(path, THUMB_DIR)
      ops.push({ op: 'put', store: 'thumbs', record: mediaRecord(id, thumbMime(path), data) })
    }
  }

  return writeMany(db, ops)
}

function stored(bytes: ArrayBuffer): [Uint8Array, { level: 0 }] {
  return [new Uint8Array(bytes), { level: 0 }]
}

function mediaRecord(id: string, type: string, data: Uint8Array): MediaBytesRecord {
  const copy = new Uint8Array(data.byteLength)
  copy.set(data)
  return { id, type, bytes: copy.buffer }
}

function idFromPath(path: string, dir: string): string {
  const name = path.slice(dir.length)
  const dot = name.lastIndexOf('.')
  return dot === -1 ? name : name.slice(0, dot)
}

const EXT_BY_MIME: Record<string, string> = {
  'image/webp': 'webp',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/quicktime': 'mov',
}

// Cosmetic for media (blob MIME comes from the manifest); load-bearing for
// thumbs, whose MIME is recovered from this extension on restore.
function extForMime(mime: string): string {
  return EXT_BY_MIME[mime] ?? 'bin'
}

// Thumbs are only ever produced as webp or jpeg (encodeImage); anything else in
// a hand-made zip falls back to webp rather than aborting the restore.
function thumbMime(path: string): string {
  return path.endsWith('.jpg') || path.endsWith('.jpeg') ? 'image/jpeg' : 'image/webp'
}
