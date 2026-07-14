import { describe, expect, it } from 'vitest'

import { isValidLocale, isValidTheme, resolveTheme } from './settings'

describe('isValidLocale', () => {
  it('accepts known locale ids', () => {
    expect(isValidLocale('en')).toBe(true)
    expect(isValidLocale('pt-BR')).toBe(true)
  })

  it('rejects unknown strings and non-strings', () => {
    expect(isValidLocale('fr')).toBe(false)
    expect(isValidLocale('')).toBe(false)
    expect(isValidLocale(null)).toBe(false)
    expect(isValidLocale(undefined)).toBe(false)
    expect(isValidLocale(42)).toBe(false)
  })
})

describe('isValidTheme', () => {
  it('accepts known theme ids', () => {
    expect(isValidTheme('light')).toBe(true)
    expect(isValidTheme('dark')).toBe(true)
    expect(isValidTheme('system')).toBe(true)
  })

  it('rejects unknown strings and non-strings', () => {
    expect(isValidTheme('solarized')).toBe(false)
    expect(isValidTheme('')).toBe(false)
    expect(isValidTheme(null)).toBe(false)
    expect(isValidTheme(undefined)).toBe(false)
    expect(isValidTheme(true)).toBe(false)
  })
})

describe('resolveTheme', () => {
  it('pins light and dark regardless of system preference', () => {
    expect(resolveTheme('light', true)).toBe('light')
    expect(resolveTheme('light', false)).toBe('light')
    expect(resolveTheme('dark', true)).toBe('dark')
    expect(resolveTheme('dark', false)).toBe('dark')
  })

  it('follows the system preference when set to system', () => {
    expect(resolveTheme('system', true)).toBe('dark')
    expect(resolveTheme('system', false)).toBe('light')
  })
})
