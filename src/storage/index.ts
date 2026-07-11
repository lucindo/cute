export { STATE_KEY, STATE_VERSION, asRecord, readEnvelope, writeEnvelope } from './storage'
export type { Envelope, StorageDeps } from './storage'
export {
  DEFAULT_PREFS,
  PREFS_CHANGED_EVENT,
  coercePrefs,
  loadPrefs,
  savePrefs,
} from './prefs'
export type { UserPrefs } from './prefs'
