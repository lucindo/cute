import { afterEach, describe, expect, it, vi } from 'vitest'

import { newId } from './id'

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

describe('newId', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns a v4 uuid', () => {
    expect(newId()).toMatch(UUID_V4)
  })

  it('falls back to getRandomValues when randomUUID is missing (insecure context)', () => {
    vi.stubGlobal('crypto', {
      getRandomValues: crypto.getRandomValues.bind(crypto),
    })
    const id = newId()
    expect(id).toMatch(UUID_V4)
    expect(newId()).not.toBe(id)
  })
})
