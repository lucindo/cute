import type { ReactElement } from 'react'

import { useCollection } from '../hooks/useCollection'
import { useUiStrings } from '../hooks/useUiStringsContext'

export function CollectionScreen(): ReactElement | null {
  const strings = useUiStrings()
  const collection = useCollection()

  if (collection.status === 'loading') return null
  if (collection.status === 'error') {
    return <p className="text-sm text-[var(--color-zen-text-soft)]">{strings.collection.loadError}</p>
  }
  if (collection.sources.length === 0) {
    return <p className="text-sm text-[var(--color-zen-text-soft)]">{strings.collection.empty}</p>
  }
  return (
    <ul className="grid w-full grid-cols-3 gap-2 sm:grid-cols-4">
      {collection.sources.map((source) => (
        <li
          key={source.id}
          className="aspect-square overflow-hidden rounded-lg bg-[var(--color-zen-surface)]"
        >
          {source.thumbUrl !== null && (
            <img
              src={source.thumbUrl}
              alt={source.caption ?? ''}
              className="h-full w-full object-cover"
            />
          )}
        </li>
      ))}
    </ul>
  )
}
