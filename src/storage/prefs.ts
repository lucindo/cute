// Per-field coerce-and-fallback for user prefs. Coercers are NON-THROWING;
// a single drifted field does not discard the others.

import { coerceSessionDuration, DEFAULT_SESSION_DURATION } from '../domain/session'
import {
  DEFAULT_LOCALE,
  DEFAULT_THEME,
  isValidLocale,
  isValidTheme,
  type LocaleId,
  type ThemeId,
} from '../domain/settings'

import { asRecord, readEnvelope, writeEnvelope, type StorageDeps } from './storage'

// Same-tab prefs sync primitive: the native 'storage' event does not fire in
// the writing tab, so pref writers dispatch this CustomEvent and app-side
// hooks listen for it. A detail without 'key' means "re-read all prefs".
export const PREFS_CHANGED_EVENT = 'cute:prefs-changed'

export interface UserPrefs {
  locale: LocaleId
  // Appearance theme; 'system' follows the OS preference.
  theme: ThemeId
  // Last-used session duration in minutes (SPEC FR-23).
  sessionDurationMin: number
  // In-session video sound, default on (SPEC FR-35).
  videoSound: boolean
}

export const DEFAULT_PREFS: UserPrefs = {
  locale: DEFAULT_LOCALE,
  theme: DEFAULT_THEME,
  sessionDurationMin: DEFAULT_SESSION_DURATION,
  videoSound: true,
}

export function coerceLocale(raw: unknown): LocaleId {
  return isValidLocale(raw) ? raw : DEFAULT_LOCALE
}

export function coerceTheme(raw: unknown): ThemeId {
  return isValidTheme(raw) ? raw : DEFAULT_THEME
}

export function coerceVideoSound(raw: unknown): boolean {
  return typeof raw === 'boolean' ? raw : true
}

export function coercePrefs(raw: unknown): UserPrefs {
  const r = asRecord(raw)
  return {
    locale: coerceLocale(r.locale),
    theme: coerceTheme(r.theme),
    sessionDurationMin: coerceSessionDuration(r.sessionDurationMin),
    videoSound: coerceVideoSound(r.videoSound),
  }
}

export function loadPrefs(deps: StorageDeps = {}): UserPrefs {
  return coercePrefs(readEnvelope(deps).prefs)
}

export function savePrefs(prefs: UserPrefs, deps: StorageDeps = {}): void {
  const env = readEnvelope(deps)
  writeEnvelope({ ...env, prefs }, deps)
}
