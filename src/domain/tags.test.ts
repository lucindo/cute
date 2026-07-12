import { describe, expect, it } from 'vitest'

import { tagDisplayName } from './tags'

const SEEDED_NAMES = { 'seed:babies': 'Bebês' }

describe('tagDisplayName', () => {
  it('prefers the literal name over the seeded one', () => {
    expect(tagDisplayName({ id: 'seed:babies', name: 'Nenéns' }, SEEDED_NAMES)).toBe('Nenéns')
  })

  it('resolves a null name from the seeded map', () => {
    expect(tagDisplayName({ id: 'seed:babies', name: null }, SEEDED_NAMES)).toBe('Bebês')
  })

  it('falls back to the id for an unknown null-named tag', () => {
    expect(tagDisplayName({ id: 'seed:gone', name: null }, SEEDED_NAMES)).toBe('seed:gone')
  })
})
