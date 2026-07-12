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
    expect(coercePrefs({ locale: 'fr' })).toEqual({
      locale: 'en',
      theme: 'system',
      sessionDurationMin: 5,
      videoSound: true,
    })
  })

  it('accepts a valid locale', () => {
    expect(coercePrefs({ locale: 'pt-BR' })).toEqual({
      locale: 'pt-BR',
      theme: 'system',
      sessionDurationMin: 5,
      videoSound: true,
    })
  })

  it('defaults theme to system and keeps a valid value', () => {
    expect(coercePrefs({}).theme).toBe('system')
    expect(coercePrefs({ theme: 'sepia' }).theme).toBe('system')
    expect(coercePrefs({ theme: 'dark' }).theme).toBe('dark')
    expect(coercePrefs({ theme: 'light' }).theme).toBe('light')
  })

  it('keeps a valid session duration and falls back on an invalid one', () => {
    expect(coercePrefs({ locale: 'en', sessionDurationMin: 12 }).sessionDurationMin).toBe(12)
    expect(coercePrefs({ locale: 'en', sessionDurationMin: 99 }).sessionDurationMin).toBe(5)
  })

  it('defaults video sound on and keeps an explicit boolean', () => {
    expect(coercePrefs({ locale: 'en' }).videoSound).toBe(true)
    expect(coercePrefs({ videoSound: 'yes' }).videoSound).toBe(true)
    expect(coercePrefs({ videoSound: false }).videoSound).toBe(false)
  })
})

describe('loadPrefs / savePrefs', () => {
  it('round-trips prefs', () => {
    savePrefs({ locale: 'pt-BR', theme: 'dark', sessionDurationMin: 12, videoSound: false })
    expect(loadPrefs()).toEqual({
      locale: 'pt-BR',
      theme: 'dark',
      sessionDurationMin: 12,
      videoSound: false,
    })
  })

  it('returns defaults when the envelope is absent', () => {
    expect(loadPrefs()).toEqual(DEFAULT_PREFS)
  })

  it('drops unknown pref fields on read, without touching known ones', () => {
    window.localStorage.setItem(
      STATE_KEY,
      JSON.stringify({ version: 1, prefs: { locale: 'pt-BR', ghost: true } }),
    )
    expect(loadPrefs()).toEqual({
      locale: 'pt-BR',
      theme: 'system',
      sessionDurationMin: 5,
      videoSound: true,
    })
  })
})
