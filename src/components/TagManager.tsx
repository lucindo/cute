import { useState, type ReactElement } from 'react'

import { ConfirmDialog } from './ConfirmDialog'
import { tagDisplayName } from '../domain/tags'
import { useUiStrings } from '../hooks/useUiStringsContext'
import type { TagRecord } from '../storage'

export interface TagManagerProps {
  tags: TagRecord[]
  onRename(this: void, id: string, name: string): void
  onDelete(this: void, id: string): void
}

// Tag list with rename and confirmed delete (SPEC FR-14). Creation lives in
// the assign panel, where a new tag is created and assigned in one gesture.
export function TagManager({ tags, onRename, onDelete }: TagManagerProps): ReactElement {
  const strings = useUiStrings()
  const [editing, setEditing] = useState<{ id: string; value: string } | null>(null)
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)

  const sorted = [...tags].sort((a, b) =>
    tagDisplayName(a, strings.tags.seeded).localeCompare(tagDisplayName(b, strings.tags.seeded)),
  )

  const actionButton =
    'rounded px-1 text-sm text-[var(--color-zen-text-soft)] hover:text-[var(--color-zen-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zen-accent'

  return (
    <div>
      {sorted.length === 0 && (
        <p className="text-sm text-[var(--color-zen-text-soft)]">{strings.tags.empty}</p>
      )}
      <ul className="max-w-sm space-y-1">
        {sorted.map((tag) => {
          const name = tagDisplayName(tag, strings.tags.seeded)
          return (
            <li key={tag.id} className="flex items-center gap-2">
              {editing?.id === tag.id ? (
                <form
                  className="flex flex-1 items-center gap-2"
                  onSubmit={(event) => {
                    event.preventDefault()
                    const value = editing.value.trim()
                    if (value === '') return
                    onRename(tag.id, value)
                    setEditing(null)
                  }}
                >
                  <input
                    autoFocus
                    value={editing.value}
                    onChange={(event) => {
                      setEditing({ id: tag.id, value: event.target.value })
                    }}
                    aria-label={strings.tags.rename}
                    className="w-40 rounded-lg border border-[var(--color-border-soft)] bg-transparent px-3 py-1 text-sm text-[var(--color-zen-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zen-accent"
                  />
                  <button type="submit" className={actionButton}>
                    {strings.tags.save}
                  </button>
                  <button
                    type="button"
                    className={actionButton}
                    onClick={() => {
                      setEditing(null)
                    }}
                  >
                    {strings.tags.cancel}
                  </button>
                </form>
              ) : (
                <>
                  <span className="flex-1 text-left text-sm text-[var(--color-zen-text)]">{name}</span>
                  <button
                    type="button"
                    aria-label={`${strings.tags.rename} ${name}`}
                    className={actionButton}
                    onClick={() => {
                      setEditing({ id: tag.id, value: name })
                    }}
                  >
                    {strings.tags.rename}
                  </button>
                  <button
                    type="button"
                    aria-label={`${strings.tags.delete} ${name}`}
                    className={`${actionButton} hover:text-[var(--color-destructive)]`}
                    onClick={() => {
                      setPendingDelete(tag.id)
                    }}
                  >
                    {strings.tags.delete}
                  </button>
                </>
              )}
            </li>
          )
        })}
      </ul>
      <ConfirmDialog
        open={pendingDelete !== null}
        title={strings.tags.deleteTitle}
        body={strings.tags.deleteBody}
        confirmLabel={strings.tags.deleteConfirm}
        cancelLabel={strings.tags.cancel}
        onConfirm={() => {
          if (pendingDelete !== null) onDelete(pendingDelete)
          setPendingDelete(null)
        }}
        onCancel={() => {
          setPendingDelete(null)
        }}
      />
    </div>
  )
}
