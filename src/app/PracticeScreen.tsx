import type { ReactElement } from 'react'

import { useUiStrings } from '../hooks/useUiStringsContext'

export function PracticeScreen(): ReactElement {
  const strings = useUiStrings()
  return <p className="text-sm text-[var(--color-zen-text-soft)]">{strings.practice.placeholder}</p>
}
