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

export async function updateSource(
  db: IDBDatabase,
  id: string,
  edits: { tags: string[] },
): Promise<Result<void, StorageError>> {
  const source = await getRecord(db, 'sources', id)
  if (!source.ok) return source
  if (source.value === null) {
    return err({ name: 'NotFound', message: `no source with id ${id}` })
  }
  const record: SourceRecord = { ...source.value, tags: edits.tags }
  return writeMany(db, [{ op: 'put', store: 'sources', record }])
}
