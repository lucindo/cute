import { newId } from '../domain/id'
import type { HoldEventRecord, SessionRecord, StorageError, WriteOp } from './db'
import { writeMany } from './db'
import type { Result } from '../domain/result'

// Persist a finished session and its holds in one transaction (SPEC FR-28/43):
// the session record plus one record per hold, each hold assigned its storage id
// here — the domain carries holds id-free.
export function saveCompletedSession(
  db: IDBDatabase,
  record: SessionRecord,
  holds: readonly Omit<HoldEventRecord, 'id'>[],
): Promise<Result<void, StorageError>> {
  const ops: WriteOp[] = [
    { op: 'put', store: 'sessions', record },
    ...holds.map((hold): WriteOp => ({
      op: 'put',
      store: 'holdEvents',
      record: { id: newId(), ...hold },
    })),
  ]
  return writeMany(db, ops)
}
