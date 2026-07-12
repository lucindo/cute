// IndexedDB foundation. Media, sessions, and hold events live here; only
// prefs/UI state go to localStorage (SPEC FR-41). All operations resolve to a
// Result — nothing throws, nothing is silently swallowed.

import { err, ok, type Result } from '../domain/result'

// The origin (lucindo.github.io) is shared with HRV Breathing; the name must
// stay app-unique.
export const DB_NAME = 'cute-db'
export const DB_VERSION = 2

export type SourceType = 'image' | 'video'

export interface SourceRecord {
  id: string
  type: SourceType
  mimeType: string
  bytes: number
  createdAt: number
  tags: string[]
  caption?: string
  // Tombstone (SPEC FR-18): blob and thumb are deleted, this record stays so
  // hold events and lifetime totals keep resolving.
  deleted: boolean
}

export interface MediaBlobRecord {
  id: string // same id as the owning SourceRecord
  blob: Blob
}

export type SessionEndReason = 'completed' | 'stopped'

export interface SessionRecord {
  id: string
  startedAt: number
  plannedMinutes: number
  endedAt: number
  endReason: SessionEndReason
  overtimeMs: number
  tagFilter: string[] // empty = all tags
}

// One record per hold, never merged or summed at write time (SPEC FR-28).
export interface HoldEventRecord {
  id: string
  sessionId: string
  sourceId: string
  startedAt: number
  durationMs: number
}

export const SEEDED_TAG_IDS = [
  'seed:babies',
  'seed:kittens',
  'seed:puppies',
  'seed:family',
  'seed:bhakti',
] as const

export interface TagRecord {
  id: string
  // null = seeded and never renamed: the display name localizes via strings.ts
  // (SPEC AC-21). Renaming sets a literal name, freezing it across locales.
  name: string | null
}

interface StoreRecordMap {
  sources: SourceRecord
  blobs: MediaBlobRecord
  thumbs: MediaBlobRecord
  sessions: SessionRecord
  holdEvents: HoldEventRecord
  tags: TagRecord
}

export type StoreName = keyof StoreRecordMap

const V1_STORE_NAMES = ['sources', 'blobs', 'thumbs', 'sessions', 'holdEvents'] as const

// Plain serializable shape (not the live DOMException) so errors can cross
// worker/postMessage boundaries and be asserted in tests.
export interface StorageError {
  name: string
  message: string
}

function toStorageError(cause: unknown): StorageError {
  // Structural, not instanceof: DOMExceptions can originate in another realm
  // (workers, test fakes) where `instanceof Error` is false.
  if (cause !== null && typeof cause === 'object' && 'name' in cause && 'message' in cause) {
    const { name, message } = cause
    if (typeof name === 'string' && typeof message === 'string') return { name, message }
  }
  return { name: 'UnknownError', message: String(cause) }
}

export interface DbDeps {
  factory?: IDBFactory // defaults to globalThis.indexedDB
}

export function openDb(deps: DbDeps = {}): Promise<Result<IDBDatabase, StorageError>> {
  // Reason: lib.dom types indexedDB as always-present, but older browsers and
  // some private modes lack it — that must surface as a Result, not a crash.
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
  const factory = deps.factory ?? (globalThis.indexedDB as IDBFactory | undefined)
  if (factory === undefined) {
    return Promise.resolve(err({ name: 'Unavailable', message: 'IndexedDB is not available' }))
  }
  return new Promise((resolve) => {
    try {
      const request = factory.open(DB_NAME, DB_VERSION)
      request.onupgradeneeded = (event) => {
        // Versioned ladder: each rung runs at most once per database, inside
        // the atomic versionchange transaction.
        if (event.oldVersion < 1) {
          for (const name of V1_STORE_NAMES) {
            request.result.createObjectStore(name, { keyPath: 'id' })
          }
        }
        if (event.oldVersion < 2) {
          const tags = request.result.createObjectStore('tags', { keyPath: 'id' })
          // Seeding here rather than at app startup means a deleted seed
          // never respawns (SPEC FR-13/FR-14).
          for (const id of SEEDED_TAG_IDS) {
            tags.put({ id, name: null } satisfies TagRecord)
          }
        }
      }
      request.onsuccess = () => { resolve(ok(request.result)) }
      request.onerror = () => { resolve(err(toStorageError(request.error))) }
    } catch (cause) {
      resolve(err(toStorageError(cause)))
    }
  })
}

export function getRecord<S extends StoreName>(
  db: IDBDatabase,
  store: S,
  id: string,
): Promise<Result<StoreRecordMap[S] | null, StorageError>> {
  return new Promise((resolve) => {
    try {
      const request = db.transaction(store, 'readonly').objectStore(store).get(id)
      request.onsuccess = () => {
        // Own prior writes under keyPath 'id'; trusted without re-validation
        // until a schema migration exists.
        resolve(ok((request.result as StoreRecordMap[S] | undefined) ?? null))
      }
      request.onerror = () => { resolve(err(toStorageError(request.error))) }
    } catch (cause) {
      resolve(err(toStorageError(cause)))
    }
  })
}

export function getAllRecords<S extends StoreName>(
  db: IDBDatabase,
  store: S,
): Promise<Result<StoreRecordMap[S][], StorageError>> {
  return new Promise((resolve) => {
    try {
      const request = db.transaction(store, 'readonly').objectStore(store).getAll()
      request.onsuccess = () => {
        resolve(ok(request.result as StoreRecordMap[S][]))
      }
      request.onerror = () => { resolve(err(toStorageError(request.error))) }
    } catch (cause) {
      resolve(err(toStorageError(cause)))
    }
  })
}

export type WriteOp = {
  [S in StoreName]:
    | { op: 'put'; store: S; record: StoreRecordMap[S] }
    | { op: 'delete'; store: S; id: string }
}[StoreName]

// All ops commit in one transaction or none do — import (source+blob+thumb)
// and tombstoning (source update + blob/thumb removal) must never half-apply.
export function writeMany(
  db: IDBDatabase,
  ops: readonly WriteOp[],
): Promise<Result<void, StorageError>> {
  return new Promise((resolve) => {
    if (ops.length === 0) {
      resolve(ok(undefined))
      return
    }
    let tx: IDBTransaction
    try {
      tx = db.transaction([...new Set(ops.map((o) => o.store))], 'readwrite')
    } catch (cause) {
      resolve(err(toStorageError(cause)))
      return
    }
    tx.oncomplete = () => { resolve(ok(undefined)) }
    // Failed requests abort the whole transaction, so onabort covers both
    // async request errors and explicit aborts.
    tx.onabort = () => {
      resolve(err(toStorageError(tx.error ?? new DOMException('transaction aborted', 'AbortError'))))
    }
    try {
      for (const op of ops) {
        const store = tx.objectStore(op.store)
        if (op.op === 'put') store.put(op.record)
        else store.delete(op.id)
      }
    } catch (cause) {
      // A synchronously invalid op (e.g. record missing its key) must not let
      // the already-queued ops auto-commit.
      resolve(err(toStorageError(cause)))
      tx.abort()
    }
  })
}
