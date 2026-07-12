// Per-field coerce-and-fallback for user prefs. Coercers are NON-THROWING;
// a single drifted field does not discard the others.

import { coerceSessionDuration, DEFAULT_SESSION_DURATION } from '../domain/session'
import { DEFAULT_LOCALE, isValidLocale, type LocaleId } from '../domain/settings'

import { asRecord, readEnvelope, writeEnvelope, type StorageDeps } from './storage'

// Same-tab prefs sync primitive: the native 'storage' event does not fire in
// the writing tab, so pref writers dispatch this CustomEvent and app-side
// hooks listen for it. A detail without 'key' means "re-read all prefs".
export const PREFS_CHANGED_EVENT = 'cute:prefs-changed'

export interface UserPrefs {
  locale: LocaleId
  // Last-used session duration in minutes (SPEC FR-23).
  sessionDurationMin: number
}

export const DEFAULT_PREFS: UserPrefs = {
  locale: DEFAULT_LOCALE,
  sessionDurationMin: DEFAULT_SESSION_DURATION,
}

export function coerceLocale(raw: unknown): LocaleId {
  return isValidLocale(raw) ? raw : DEFAULT_LOCALE
}

export function coercePrefs(raw: unknown): UserPrefs {
  const r = asRecord(raw)
  return {
    locale: coerceLocale(r.locale),
    sessionDurationMin: coerceSessionDuration(r.sessionDurationMin),
  }
}

export function loadPrefs(deps: StorageDeps = {}): UserPrefs {
  return coercePrefs(readEnvelope(deps).prefs)
}

export function savePrefs(prefs: UserPrefs, deps: StorageDeps = {}): void {
  const env = readEnvelope(deps)
  writeEnvelope({ ...env, prefs }, deps)
}
