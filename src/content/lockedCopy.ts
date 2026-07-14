// Claim-safe copy kept apart from the translatable catalog (learnContent.ts /
// strings.ts). Byte-equality is frozen by lockedCopy.test.ts via .toBe() — never
// a snapshot, which would auto-update and defeat the lock. Composed at render
// time by LearnPanel.

import type { LocaleId } from '../domain/settings'

export interface LockedCopy {
  readonly inspiredByForrest: string
  readonly affiliationLine: string
}

export const LOCKED_COPY: Readonly<Record<LocaleId, LockedCopy>> = {
  en: {
    inspiredByForrest: "inspired by Forrest's teachings",
    affiliationLine: 'Independent project. Not affiliated with Forrest Knutson.',
  },
  'pt-BR': {
    inspiredByForrest: 'inspirado nos ensinamentos do Forrest',
    affiliationLine: 'Projeto independente. Não afiliado ao Forrest Knutson.',
  },
} as const satisfies Readonly<Record<LocaleId, LockedCopy>>
