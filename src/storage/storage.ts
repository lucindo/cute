// Silent-fallback envelope adapter for localStorage. Every risky op is wrapped
// in try { } catch { } and the catch swallows ALL errors — the caller continues
// with in-memory defaults. localStorage holds only prefs/UI state here; media
// and practice data live in IndexedDB (see SPEC FR-41).
//
// Dual-versioning convention (inherited from HRV):
//   - STATE_KEY suffix (':v1') — bump only for breaking shape changes where old
//     data is unmigratable; it gets orphaned and the user sees defaults.
//   - STATE_VERSION (in-envelope) — bump for migrate-on-read schema changes;
//     the user keeps their data.
//
// The 'cute:' prefix is load-bearing: this origin (lucindo.github.io) is shared
// with HRV Breathing ('hrv:'-prefixed keys). Never use an unprefixed key.
export const STATE_KEY = 'cute:state:v1'
export const STATE_VERSION = 1 as const

export interface StorageDeps {
  storage?: Storage // defaults to window.localStorage
}

export interface Envelope {
  // `number` (not `typeof STATE_VERSION`) so readEnvelope can surface an
  // on-disk version > STATE_VERSION written by a newer build in another tab;
  // writeEnvelope's downgrade guard depends on seeing that value.
  version: number
  prefs?: unknown
}

const EMPTY_ENVELOPE: Envelope = { version: STATE_VERSION }

// Prototype-pollution-safe object guard: only treat `raw` as a record when it
// is a plain non-array object; otherwise hand back an empty record so every
// named-key read falls through to a default.
export function asRecord(raw: unknown): Record<string, unknown> {
  return raw !== null && typeof raw === 'object' && !Array.isArray(raw)
    ? raw as Record<string, unknown>
    : {}
}

export function readEnvelope(deps: StorageDeps = {}): Envelope {
  const storage = deps.storage ?? window.localStorage
  try {
    const raw = storage.getItem(STATE_KEY)
    if (raw === null) return { ...EMPTY_ENVELOPE }
    const parsed: unknown = JSON.parse(raw)
    if (parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)) {
      // Forward-compatible read: spread first so unknown top-level fields
      // written by a future build survive the round-trip, then pin `version`
      // to the on-disk value so writeEnvelope can detect a future-schema
      // envelope and refuse to downgrade it.
      const p = parsed as Record<string, unknown>
      const onDiskVersion =
        typeof p.version === 'number' && Number.isFinite(p.version)
          ? p.version
          : STATE_VERSION
      return { ...p, version: onDiskVersion }
    }
    return { ...EMPTY_ENVELOPE }
  } catch {
    // Read failures silent (corrupt JSON, throwing getItem in Safari ITP).
    return { ...EMPTY_ENVELOPE }
  }
}

export function writeEnvelope(env: Envelope, deps: StorageDeps = {}): void {
  const storage = deps.storage ?? window.localStorage
  try {
    // Cross-tab downgrade guard: if another tab running a NEWER build wrote a
    // future-schema envelope, refuse to overwrite it with this older build's
    // data. Best-effort, not transactional. The inner re-read is fail-open in
    // its own try/catch: if getItem throws, assume STATE_VERSION and still
    // write, rather than letting the outer catch swallow the whole write.
    let currentVersion: number = STATE_VERSION
    try {
      const raw = storage.getItem(STATE_KEY)
      if (raw !== null) {
        const parsed: unknown = JSON.parse(raw)
        if (parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)) {
          const v = (parsed as Record<string, unknown>).version
          if (typeof v === 'number' && Number.isFinite(v)) currentVersion = v
        }
      }
    } catch {
      // Treat throw/corrupt as "no version info"; proceed with write.
    }
    if (currentVersion > STATE_VERSION) {
      if (import.meta.env.DEV) {
        console.warn(
          `[storage] refusing to overwrite on-disk envelope v${String(currentVersion)} ` +
          `(this build is v${String(STATE_VERSION)}).`,
        )
      }
      return
    }
    // Stamp STATE_VERSION on every successful write; caller-passed env.version
    // is structurally ignored.
    const payload = JSON.stringify({ ...env, version: STATE_VERSION })
    storage.setItem(STATE_KEY, payload)
  } catch {
    // Write failures silent (quota, ITP, private mode).
  }
}
