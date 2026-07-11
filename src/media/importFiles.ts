// Batch import orchestration (SPEC FR-7, FR-10, FR-12): each file lands
// source + blob + thumb atomically; a rejected file never kills the batch.
// The outcome is not a Result — the batch always completes, per file.

import { processImageFile, type ImageCodecDeps, type ImportRejection } from './importImage'
import { writeMany, type SourceRecord, type StorageError } from '../storage'

export type FileRejection =
  | ImportRejection
  | { reason: 'unsupported-type'; mimeType: string }
  | { reason: 'storage-failed'; error: StorageError }

export interface ImportOutcome {
  imported: SourceRecord[]
  rejected: { name: string; rejection: FileRejection }[]
}

export interface ImportDeps {
  codec?: ImageCodecDeps
}

export async function importFiles(
  db: IDBDatabase,
  files: readonly File[],
  deps: ImportDeps = {},
): Promise<ImportOutcome> {
  const outcome: ImportOutcome = { imported: [], rejected: [] }
  // Sequential on purpose: decoding a batch in parallel holds every bitmap in
  // memory at once, which sinks phones on large drops.
  for (const file of files) {
    // Videos get their own probe pipeline (task 5); until then they reject
    // like any other non-image.
    if (!file.type.startsWith('image/')) {
      outcome.rejected.push({
        name: file.name,
        rejection: { reason: 'unsupported-type', mimeType: file.type },
      })
      continue
    }
    const processed = await processImageFile(file, deps.codec ?? {})
    if (!processed.ok) {
      outcome.rejected.push({ name: file.name, rejection: processed.error })
      continue
    }
    const { blob, thumb } = processed.value
    const source: SourceRecord = {
      id: crypto.randomUUID(),
      type: 'image',
      mimeType: blob.type,
      bytes: blob.size,
      createdAt: Date.now(),
      tags: [],
      deleted: false,
    }
    const written = await writeMany(db, [
      { op: 'put', store: 'sources', record: source },
      { op: 'put', store: 'blobs', record: { id: source.id, blob } },
      { op: 'put', store: 'thumbs', record: { id: source.id, blob: thumb } },
    ])
    if (!written.ok) {
      outcome.rejected.push({
        name: file.name,
        rejection: { reason: 'storage-failed', error: written.error },
      })
      continue
    }
    outcome.imported.push(source)
  }
  return outcome
}
