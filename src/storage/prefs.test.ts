import { describe, expect, it } from 'vitest'

import { coercePrefs, loadPrefs, savePrefs, DEFAULT_PREFS } from './prefs'
import { STATE_KEY } from './storage'

describe('coercePrefs', () => {
  it('falls back to defaults for non-object input', () => {
    expect(coercePrefs(undefined)).toEqual(DEFAULT_PREFS)
    expect(coercePrefs('junk')).toEqual(DEFAULT_PREFS)
    expect(coercePrefs([1, 2])).toEqual(DEFAULT_PREFS)
  })

  it('falls back to the default locale on an invalid value', () => {
    expect(coercePrefs({ locale: 'fr' })).toEqual({ locale: 'en', sessionDurationMin: 5 })
  })

  it('accepts a valid locale', () => {
    expect(coercePrefs({ locale: 'pt-BR' })).toEqual({ locale: 'pt-BR', sessionDurationMin: 5 })
  })

  it('keeps a valid session duration and falls back on an invalid one', () => {
    expect(coercePrefs({ locale: 'en', sessionDurationMin: 12 }).sessionDurationMin).toBe(12)
    expect(coercePrefs({ locale: 'en', sessionDurationMin: 99 }).sessionDurationMin).toBe(5)
  })
})

describe('loadPrefs / savePrefs', () => {
  it('round-trips prefs', () => {
    savePrefs({ locale: 'pt-BR', sessionDurationMin: 12 })
    expect(loadPrefs()).toEqual({ locale: 'pt-BR', sessionDurationMin: 12 })
  })

  it('returns defaults when the envelope is absent', () => {
    expect(loadPrefs()).toEqual(DEFAULT_PREFS)
  })

  it('drops unknown pref fields on read, without touching known ones', () => {
    window.localStorage.setItem(
      STATE_KEY,
      JSON.stringify({ version: 1, prefs: { locale: 'pt-BR', ghost: true } }),
    )
    expect(loadPrefs()).toEqual({ locale: 'pt-BR', sessionDurationMin: 5 })
  })
})
