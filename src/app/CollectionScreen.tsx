import type { ReactElement } from 'react'

import { useUiStrings } from '../hooks/useUiStringsContext'

export function CollectionScreen(): ReactElement {
  const strings = useUiStrings()
  return <p className="text-sm text-[var(--color-zen-text-soft)]">{strings.collection.placeholder}</p>
}
