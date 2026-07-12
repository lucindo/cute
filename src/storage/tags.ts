// Tag catalog operations (SPEC FR-14). Sources reference tags by id, so a
// rename touches one record; delete strips the id from every source — live
// and tombstoned — in the same transaction as the record removal.

import { newId } from '../domain/id'
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

export async function applyTagToSources(
  db: IDBDatabase,
  tagId: string,
  sourceIds: readonly string[],
  mode: 'add' | 'remove',
): Promise<Result<void, StorageError>> {
  const tag = await getRecord(db, 'tags', tagId)
  if (!tag.ok) return tag
  if (tag.value === null) return err({ name: 'NotFound', message: `no tag with id ${tagId}` })
  const ids = new Set(sourceIds)
  const sources = await getAllRecords(db, 'sources')
  if (!sources.ok) return sources
  // Unknown source ids are skipped: a selection can outlive a source deleted
  // in another tab.
  const updates = sources.value
    .filter((s) => ids.has(s.id) && s.tags.includes(tagId) !== (mode === 'add'))
    .map((s): WriteOp => ({
      op: 'put',
      store: 'sources',
      record: {
        ...s,
        tags: mode === 'add' ? [...s.tags, tagId] : s.tags.filter((t) => t !== tagId),
      },
    }))
  return writeMany(db, updates)
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
