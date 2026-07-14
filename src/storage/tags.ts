// Tag catalog operations (SPEC FR-14). Sources reference tags by id, so a
// rename touches one record; delete strips the id from every source — live
// and tombstoned — in the same transaction as the record removal.

import { newId } from '../domain/id'
import { err, ok, type Result } from '../domain/result'
import { deleteTagAndStrip, getRecord, writeMany, type StorageError, type TagRecord } from './db'

export async function createTag(
  db: IDBDatabase,
  name: string,
): Promise<Result<TagRecord, StorageError>> {
  const trimmed = name.trim()
  if (trimmed === '') return err({ name: 'InvalidName', message: 'tag name is empty' })
  const record: TagRecord = { id: newId(), name: trimmed }
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
  return deleteTagAndStrip(db, id)
}
