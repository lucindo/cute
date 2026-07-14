import { describe, expect, it } from 'vitest'

import { readEnvelope, writeEnvelope, STATE_KEY, STATE_VERSION } from './storage'

describe('readEnvelope', () => {
  it('returns an empty envelope when nothing is stored', () => {
    expect(readEnvelope()).toEqual({ version: STATE_VERSION })
  })

  it('returns an empty envelope on corrupt JSON', () => {
    window.localStorage.setItem(STATE_KEY, '{not json')
    expect(readEnvelope()).toEqual({ version: STATE_VERSION })
  })

  it('preserves unknown top-level fields written by a future build', () => {
    window.localStorage.setItem(
      STATE_KEY,
      JSON.stringify({ version: 1, prefs: { locale: 'en' }, futureField: 'kept' }),
    )
    const env: Record<string, unknown> = { ...readEnvelope() }
    expect(env.futureField).toBe('kept')
  })

  it('pins version to the on-disk value', () => {
    window.localStorage.setItem(STATE_KEY, JSON.stringify({ version: 99 }))
    expect(readEnvelope().version).toBe(99)
  })
})

describe('writeEnvelope', () => {
  it('round-trips an envelope and stamps STATE_VERSION', () => {
    writeEnvelope({ version: 0, prefs: { locale: 'pt-BR' } })
    const env = readEnvelope()
    expect(env.version).toBe(STATE_VERSION)
    expect(env.prefs).toEqual({ locale: 'pt-BR' })
  })

  it('refuses to overwrite a future-schema envelope', () => {
    window.localStorage.setItem(
      STATE_KEY,
      JSON.stringify({ version: STATE_VERSION + 1, prefs: { locale: 'pt-BR' } }),
    )
    writeEnvelope({ version: STATE_VERSION, prefs: { locale: 'en' } })
    const env = readEnvelope()
    expect(env.version).toBe(STATE_VERSION + 1)
    expect(env.prefs).toEqual({ locale: 'pt-BR' })
  })
})
