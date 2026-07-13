import { describe, expect, it } from 'vitest'

import { LOCKED_COPY } from './lockedCopy'

// Claim-safe copy: assert exact bytes so a translation or edit can't silently
// change the affiliation disclaimer or the Forrest attribution. Never convert
// these to snapshots — auto-update would defeat the lock.
describe('LOCKED_COPY', () => {
  it('en is byte-exact', () => {
    expect(LOCKED_COPY.en.inspiredByForrest).toBe("inspired by Forrest's teachings")
    expect(LOCKED_COPY.en.affiliationLine).toBe(
      'Independent project. Not affiliated with Forrest Knutson.',
    )
  })

  it('pt-BR is byte-exact', () => {
    expect(LOCKED_COPY['pt-BR'].inspiredByForrest).toBe('inspirado nos ensinamentos do Forrest')
    expect(LOCKED_COPY['pt-BR'].affiliationLine).toBe(
      'Projeto independente. Não afiliado ao Forrest Knutson.',
    )
  })
})
