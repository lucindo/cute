import { useMemo, useState, type ReactElement } from 'react'

import { ChevronBackIcon } from '../components/icons/ChevronBackIcon'
import { IconButton } from '../components/primitives/IconButton'
import { PageShell } from '../components/primitives/PageShell'
import { SectionCard } from '../components/primitives/SectionCard'
import { TagManager } from '../components/TagManager'
import { TopAppBar } from '../components/primitives/TopAppBar'
import { useCollection } from '../hooks/useCollection'
import { useFocusOnMount } from '../hooks/useFocusOnMount'
import { useTags } from '../hooks/useTags'
import { useUiStrings } from '../hooks/useUiStringsContext'

export interface TagsScreenProps {
  onBack(this: void): void
}

// Full-page tag editor (reached from the Collection "Edit tags" button): create
// a tag, and rename/delete existing tags with a live per-tag item count.
// Replaces the cramped bottom-sheet manager.
export function TagsScreen({ onBack }: TagsScreenProps): ReactElement {
  const t = useUiStrings().tags
  const { tagsState, actionState, rename, remove, create } = useTags()
  const collection = useCollection()
  const backRef = useFocusOnMount<HTMLButtonElement>()
  const [newName, setNewName] = useState('')

  // Live count of live sources carrying each tag; tombstoned sources are
  // already excluded by useCollection, so the badge reflects visible media.
  const counts = useMemo(() => {
    const map = new Map<string, number>()
    if (collection.status !== 'ready') return map
    for (const source of collection.sources)
      for (const id of source.tags) map.set(id, (map.get(id) ?? 0) + 1)
    return map
  }, [collection])

  return (
    <PageShell>
      <TopAppBar
        title={t.title}
        leading={
          <IconButton icon={<ChevronBackIcon />} label={t.back} onClick={onBack} buttonRef={backRef} />
        }
      />
      <div className="w-full text-left">
        <SectionCard padding="14px 16px">
          <form
            className="flex items-center gap-2"
            onSubmit={(event) => {
              event.preventDefault()
              const name = newName.trim()
              if (name === '') return
              void create(name).then((id) => {
                if (id !== null) setNewName('')
              })
            }}
          >
            <input
              value={newName}
              onChange={(event) => {
                setNewName(event.target.value)
              }}
              placeholder={t.newTagPlaceholder}
              aria-label={t.newTagPlaceholder}
              className="min-w-0 flex-1 rounded-lg border border-[var(--color-border-soft)] bg-transparent px-3 py-2 text-[15px] text-[var(--color-zen-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zen-accent"
            />
            <button
              type="submit"
              className="rounded-lg bg-[var(--color-zen-accent)] px-4 py-2 text-sm font-semibold text-[var(--color-zen-on-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zen-accent focus-visible:ring-offset-2"
            >
              {t.add}
            </button>
          </form>
        </SectionCard>
        <div className="mt-4">
          {tagsState.status === 'ready' && (
            <TagManager tags={tagsState.tags} counts={counts} onRename={rename} onDelete={remove} />
          )}
        </div>
        {actionState.status === 'error' && (
          <p className="mt-3 text-sm text-[var(--color-zen-text-soft)]">{t.actionFailed}</p>
        )}
      </div>
    </PageShell>
  )
}
