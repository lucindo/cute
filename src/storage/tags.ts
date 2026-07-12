// Tag catalog operations (SPEC FR-14). Sources reference tags by id, so a
// rename touches one record; delete strips the id from every source — live
// and tombstoned — in the same transaction as the record removal.

import { err, ok, type Result } from '../domain/result'
import {
  getAllRecords,
  getRecord,
  writeMany,
  type StorageError,
  type TagRecord,
  type WriteOp,
} from './db'

export async function createTag(
  db: IDBDatabase,
  name: string,
): Promise<Result<TagRecord, StorageError>> {
  const trimmed = name.trim()
  if (trimmed === '') return err({ name: 'InvalidName', message: 'tag name is empty' })
  const record: TagRecord = { id: crypto.randomUUID(), name: trimmed }
  const written = await writeMany(db, [{ op: 'put', store: 'tags', record }])
  if (!written.ok) return written
  return ok(record)
}

export async function renameTag(
  db: IDBDatabase,
  id: string,
  name: string,
): Promise<Result<void, StorageError>> {
  const trimmed = name.trim()
  if (trimmed === '') return err({ name: 'InvalidName', message: 'tag name is empty' })
  const tag = await getRecord(db, 'tags', id)
  if (!tag.ok) return tag
  if (tag.value === null) return err({ name: 'NotFound', message: `no tag with id ${id}` })
  return writeMany(db, [{ op: 'put', store: 'tags', record: { id, name: trimmed } }])
}

export async function deleteTag(
  db: IDBDatabase,
  id: string,
): Promise<Result<void, StorageError>> {
  const tag = await getRecord(db, 'tags', id)
  if (!tag.ok) return tag
  if (tag.value === null) return err({ name: 'NotFound', message: `no tag with id ${id}` })
  const sources = await getAllRecords(db, 'sources')
  if (!sources.ok) return sources
  const strips = sources.value
    .filter((s) => s.tags.includes(id))
    .map((s): WriteOp => ({
      op: 'put',
      store: 'sources',
      record: { ...s, tags: s.tags.filter((t) => t !== id) },
    }))
  return writeMany(db, [{ op: 'delete', store: 'tags', id }, ...strips])
}
