// Source deletion (SPEC FR-18): blob and thumb go, the source stays as a
// tombstone so hold events and lifetime totals keep resolving.

import { getRecord, writeMany, type SourceRecord, type StorageError } from './db'
import { err, type Result } from '../domain/result'

export async function deleteSource(
  db: IDBDatabase,
  id: string,
): Promise<Result<void, StorageError>> {
  const source = await getRecord(db, 'sources', id)
  if (!source.ok) return source
  if (source.value === null) {
    return err({ name: 'NotFound', message: `no source with id ${id}` })
  }
  return writeMany(db, [
    { op: 'put', store: 'sources', record: { ...source.value, deleted: true } },
    { op: 'delete', store: 'blobs', id },
    { op: 'delete', store: 'thumbs', id },
  ])
}

export async function setCaption(
  db: IDBDatabase,
  id: string,
  caption: string,
): Promise<Result<void, StorageError>> {
  const source = await getRecord(db, 'sources', id)
  if (!source.ok) return source
  if (source.value === null) {
    return err({ name: 'NotFound', message: `no source with id ${id}` })
  }
  const record: SourceRecord = { ...source.value }
  const trimmed = caption.trim()
  // Empty clears the field so the tile falls back to its generic label.
  if (trimmed === '') delete record.caption
  else record.caption = trimmed
  return writeMany(db, [{ op: 'put', store: 'sources', record }])
}
