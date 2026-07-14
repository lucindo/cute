import { useState, type ReactElement } from 'react'

import { tagDisplayName } from '../domain/tags'
import { useUiStrings } from '../hooks/useUiStringsContext'
import type { TagRecord } from '../storage'

export interface TagAssignPanelProps {
  tags: TagRecord[]
  selectedSources: readonly { id: string; tags: string[] }[]
  onToggle(this: void, tagId: string, mode: 'add' | 'remove'): void
  onCreate(this: void, name: string): void
}

// Tag chips for the current grid selection (SPEC FR-15/AC-6). A chip tap adds
// the tag to every selected source unless all already have it — then it
// removes it from all. Partial coverage shows as aria-pressed "mixed".
export function TagAssignPanel({
  tags,
  selectedSources,
  onToggle,
  onCreate,
}: TagAssignPanelProps): ReactElement {
  const strings = useUiStrings()
  const [draft, setDraft] = useState('')

  const sorted = [...tags].sort((a, b) =>
    tagDisplayName(a, strings.tags.seeded).localeCompare(tagDisplayName(b, strings.tags.seeded)),
  )

  return (
    <div>
      <ul className="flex flex-wrap gap-2">
        {sorted.map((tag) => {
          const count = selectedSources.filter((s) => s.tags.includes(tag.id)).length
          const all = count > 0 && count === selectedSources.length
          const chipStyle = all
            ? 'border-transparent bg-[var(--color-zen-accent)] text-[var(--color-zen-on-accent)]'
            : count > 0
              ? 'border-[var(--color-zen-accent)] text-[var(--color-zen-accent)]'
              : 'border-[var(--color-border-soft)] text-[var(--color-zen-text)]'
          return (
            <li key={tag.id}>
              <button
                type="button"
                aria-pressed={all ? true : count > 0 ? 'mixed' : false}
                onClick={() => {
                  onToggle(tag.id, all ? 'remove' : 'add')
                }}
                className={`rounded-full border px-3 py-1 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zen-accent motion-reduce:transition-none ${chipStyle}`}
              >
                {tagDisplayName(tag, strings.tags.seeded)}
              </button>
            </li>
          )
        })}
      </ul>
      <form
        className="mt-3 flex gap-2"
        onSubmit={(event) => {
          event.preventDefault()
          const name = draft.trim()
          if (name === '') return
          onCreate(name)
          setDraft('')
        }}
      >
        <input
          value={draft}
          onChange={(event) => {
            setDraft(event.target.value)
          }}
          placeholder={strings.tags.newTagPlaceholder}
          aria-label={strings.tags.newTagPlaceholder}
          className="w-40 rounded-lg border border-[var(--color-border-soft)] bg-transparent px-3 py-1 text-sm text-[var(--color-zen-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zen-accent"
        />
        <button
          type="submit"
          className="rounded-full border border-[var(--color-border-soft)] px-3 py-1 text-sm font-medium text-[var(--color-zen-text)] hover:bg-[var(--color-zen-bg-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zen-accent"
        >
          {strings.tags.add}
        </button>
      </form>
    </div>
  )
}
