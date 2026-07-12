// Batch import orchestration (SPEC FR-7, FR-9, FR-10, FR-12): each file lands
// source + blob + thumb atomically; a rejected file never kills the batch.
// The outcome is not a Result — the batch always completes, per file.

import { processImageFile, type ImageCodecDeps, type ImportRejection } from './importImage'
import { processVideoFile, type VideoProbeDeps } from './importVideo'
import { newId } from '../domain/id'
import { writeMany, type SourceRecord, type SourceType, type StorageError } from '../storage'

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
  video?: VideoProbeDeps
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
    const kind: SourceType | null = file.type.startsWith('image/')
      ? 'image'
      : file.type.startsWith('video/')
        ? 'video'
        : null
    if (kind === null) {
      outcome.rejected.push({
        name: file.name,
        rejection: { reason: 'unsupported-type', mimeType: file.type },
      })
      continue
    }
    const processed =
      kind === 'image'
        ? await processImageFile(file, deps.codec ?? {})
        : await processVideoFile(file, deps.video ?? {})
    if (!processed.ok) {
      outcome.rejected.push({ name: file.name, rejection: processed.error })
      continue
    }
    const { blob, thumb } = processed.value
    const source: SourceRecord = {
      id: newId(),
      type: kind,
      mimeType: blob.type,
      bytes: blob.size,
      createdAt: Date.now(),
      tags: [],
      deleted: false,
    }
    const [bytes, thumbBytes] = await Promise.all([blob.arrayBuffer(), thumb.arrayBuffer()])
    const written = await writeMany(db, [
      { op: 'put', store: 'sources', record: source },
      { op: 'put', store: 'blobs', record: { id: source.id, type: blob.type, bytes } },
      { op: 'put', store: 'thumbs', record: { id: source.id, type: thumb.type, bytes: thumbBytes } },
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
