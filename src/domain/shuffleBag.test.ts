import { describe, expect, it } from 'vitest'

import { createBag, deal, type Rng } from './shuffleBag'

// Deterministic RNG so the shuffle-bag invariants are checked over many seeds.
function lcg(seed: number): Rng {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 0x100000000
  }
}

// Deal `count` sources from a fresh bag, threading the last dealt id as the
// boundary-avoid hint — the way the session machine drives it.
function dealSequence(pool: string[], count: number, rng: Rng): string[] {
  let bag = createBag(pool, rng)
  const out: string[] = []
  let last: string | undefined
  for (let i = 0; i < count; i++) {
    const dealt = deal(bag, last, rng)
    out.push(dealt.id)
    bag = dealt.bag
    last = dealt.id
  }
  return out
}

describe('shuffle-bag', () => {
  it('deals every pool member once before any repeat (AC-11)', () => {
    const pool = ['a', 'b', 'c', 'd']
    for (let seed = 1; seed <= 200; seed++) {
      const first = dealSequence(pool, 4, lcg(seed))
      expect(new Set(first)).toEqual(new Set(pool))
    }
  })

  it('never repeats a source back-to-back, including across the reshuffle boundary', () => {
    const pool = ['a', 'b', 'c', 'd']
    for (let seed = 1; seed <= 200; seed++) {
      const seq = dealSequence(pool, 12, lcg(seed))
      for (let i = 1; i < seq.length; i++) {
        expect(seq[i]).not.toBe(seq[i - 1])
      }
    }
  })

  it('repeats the sole source for a pool of one', () => {
    const seq = dealSequence(['solo'], 3, lcg(7))
    expect(seq).toEqual(['solo', 'solo', 'solo'])
  })

  it('throws when dealing from an empty pool', () => {
    expect(() => deal(createBag([], lcg(1)), undefined, lcg(1))).toThrow()
  })
})
