import type { ReactElement } from 'react'

import { tagDisplayName } from '../domain/tags'
import { useUiStrings } from '../hooks/useUiStringsContext'
import type { TagRecord } from '../storage'

export interface TagFilterProps {
  tags: TagRecord[]
  selected: readonly string[]
  onToggle(this: void, tagId: string): void
}

// Session-local tag filter (SPEC FR-24). Multi-select OR: a source matches if
// it carries any selected tag; empty selection = all sources, untagged
// included. Not persisted — resets on each visit to Practice.
export function TagFilter({ tags, selected, onToggle }: TagFilterProps): ReactElement {
  const strings = useUiStrings()
  const sorted = [...tags].sort((a, b) =>
    tagDisplayName(a, strings.tags.seeded).localeCompare(tagDisplayName(b, strings.tags.seeded)),
  )

  return (
    <div>
      <div className="mb-2 text-sm font-medium text-[var(--color-zen-text)]">
        {strings.practice.filter.label}
      </div>
      <ul className="flex flex-wrap gap-2">
        {sorted.map((tag) => {
          const on = selected.includes(tag.id)
          const chipStyle = on
            ? 'border-transparent bg-[var(--color-zen-accent)] text-[var(--color-zen-on-accent)]'
            : 'border-[var(--color-border-soft)] text-[var(--color-zen-text)]'
          return (
            <li key={tag.id}>
              <button
                type="button"
                aria-pressed={on}
                onClick={() => {
                  onToggle(tag.id)
                }}
                className={`rounded-full border px-3 py-1 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zen-accent motion-reduce:transition-none ${chipStyle}`}
              >
                {tagDisplayName(tag, strings.tags.seeded)}
              </button>
            </li>
          )
        })}
      </ul>
      {selected.length === 0 ? (
        <p className="mt-2 text-xs text-[var(--color-zen-text-soft)]">
          {strings.practice.filter.allHint}
        </p>
      ) : null}
    </div>
  )
}
