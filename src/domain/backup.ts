// Backup manifest: the metadata half of the export zip (SPEC §Interfaces).
// Media bytes ride as separate zip entries; this module only knows records.
//
// validateManifest is the RESTORE TRUST BOUNDARY. Unlike prefs' coerce-and-
// fallback, it rejects loudly on anything malformed: a restore replaces all
// data, so a half-understood manifest must abort untouched (SPEC FR-22/AC-10),
// never silently drop or default a field.

import { err, ok, type Result } from './result'
import type {
  HoldEventRecord,
  SessionRecord,
  SourceRecord,
  TagRecord,
} from '../storage'
import { asRecord } from '../storage'

export const BACKUP_VERSION = 1

export interface Manifest {
  version: number
  sources: SourceRecord[]
  tags: TagRecord[]
  sessions: SessionRecord[]
  holdEvents: HoldEventRecord[]
}

export function buildManifest(input: {
  sources: SourceRecord[]
  tags: TagRecord[]
  sessions: SessionRecord[]
  holdEvents: HoldEventRecord[]
}): Manifest {
  return { version: BACKUP_VERSION, ...input }
}

export function validateManifest(raw: unknown): Result<Manifest, string> {
  const r = asRecord(raw)
  if (r.version !== BACKUP_VERSION) {
    return err(`unsupported backup version: expected ${String(BACKUP_VERSION)}, got ${String(r.version)}`)
  }
  const sources = validateAll(r.sources, validateSource)
  if (sources === null) return err('invalid or missing sources')
  const tags = validateAll(r.tags, validateTag)
  if (tags === null) return err('invalid or missing tags')
  const sessions = validateAll(r.sessions, validateSession)
  if (sessions === null) return err('invalid or missing sessions')
  const holdEvents = validateAll(r.holdEvents, validateHoldEvent)
  if (holdEvents === null) return err('invalid or missing holdEvents')
  return ok({ version: BACKUP_VERSION, sources, tags, sessions, holdEvents })
}

// Non-finite numbers (NaN/Infinity) survive JSON as null, but a hand-edited
// manifest could smuggle them in and corrupt every downstream total; reject.
function isNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v)
}

function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((x) => typeof x === 'string')
}

// null on any bad element rejects the whole array — a partially-valid backup is
// still a corrupt backup at replace-all semantics. Rebuilds clean records, so
// unknown extra keys are dropped rather than carried into the DB.
function validateAll<T>(raw: unknown, validate: (x: unknown) => T | null): T[] | null {
  if (!Array.isArray(raw)) return null
  const out: T[] = []
  for (const item of raw) {
    const v = validate(item)
    if (v === null) return null
    out.push(v)
  }
  return out
}

function validateSource(raw: unknown): SourceRecord | null {
  const r = asRecord(raw)
  if (typeof r.id !== 'string') return null
  if (r.type !== 'image' && r.type !== 'video') return null
  if (typeof r.mimeType !== 'string') return null
  if (!isNumber(r.bytes)) return null
  if (!isNumber(r.createdAt)) return null
  if (!isStringArray(r.tags)) return null
  if (typeof r.deleted !== 'boolean') return null
  if (r.caption !== undefined && typeof r.caption !== 'string') return null
  const base: SourceRecord = {
    id: r.id,
    type: r.type,
    mimeType: r.mimeType,
    bytes: r.bytes,
    createdAt: r.createdAt,
    tags: r.tags,
    deleted: r.deleted,
  }
  return r.caption === undefined ? base : { ...base, caption: r.caption }
}

function validateTag(raw: unknown): TagRecord | null {
  const r = asRecord(raw)
  if (typeof r.id !== 'string') return null
  if (r.name !== null && typeof r.name !== 'string') return null
  return { id: r.id, name: r.name }
}

function validateSession(raw: unknown): SessionRecord | null {
  const r = asRecord(raw)
  if (typeof r.id !== 'string') return null
  if (!isNumber(r.startedAt)) return null
  if (!isNumber(r.plannedMinutes)) return null
  if (!isNumber(r.endedAt)) return null
  if (r.endReason !== 'completed' && r.endReason !== 'stopped') return null
  if (!isNumber(r.overtimeMs)) return null
  if (!isStringArray(r.tagFilter)) return null
  return {
    id: r.id,
    startedAt: r.startedAt,
    plannedMinutes: r.plannedMinutes,
    endedAt: r.endedAt,
    endReason: r.endReason,
    overtimeMs: r.overtimeMs,
    tagFilter: r.tagFilter,
  }
}

function validateHoldEvent(raw: unknown): HoldEventRecord | null {
  const r = asRecord(raw)
  if (typeof r.id !== 'string') return null
  if (typeof r.sessionId !== 'string') return null
  if (typeof r.sourceId !== 'string') return null
  if (!isNumber(r.startedAt)) return null
  if (!isNumber(r.durationMs)) return null
  return {
    id: r.id,
    sessionId: r.sessionId,
    sourceId: r.sourceId,
    startedAt: r.startedAt,
    durationMs: r.durationMs,
  }
}
