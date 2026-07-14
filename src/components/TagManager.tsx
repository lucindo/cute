import { useState, type ReactElement } from 'react'

import { ConfirmDialog } from './ConfirmDialog'
import { SettingsRow } from './SettingsRow'
import { tagDisplayName } from '../domain/tags'
import { useUiStrings } from '../hooks/useUiStringsContext'
import type { TagRecord } from '../storage'

export interface TagManagerProps {
  tags: TagRecord[]
  counts: ReadonlyMap<string, number>
  onRename(this: void, id: string, name: string): void
  onDelete(this: void, id: string): void
}

// Tag list with rename and confirmed delete (SPEC FR-14). Each row shows a live
// per-tag item count (counts). Creation lives on the Tags page above this list.
// Rows use HRV's SettingsRow chrome (divider + 15px label) for fidelity.
export function TagManager({ tags, counts, onRename, onDelete }: TagManagerProps): ReactElement {
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
      <div>
        {sorted.map((tag) => {
          const name = tagDisplayName(tag, strings.tags.seeded)
          if (editing?.id === tag.id) {
            return (
              <fieldset
                key={tag.id}
                aria-label={name}
                className="flex items-center gap-2 border-t border-[var(--color-border-soft)] py-3"
              >
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
              </fieldset>
            )
          }
          return (
            <SettingsRow
              key={tag.id}
              label={name}
              ariaLabel={name}
              className="flex items-center justify-between gap-2"
            >
              <div className="flex items-center gap-3">
                <span
                  aria-hidden="true"
                  className="text-[13px] tabular-nums text-[var(--color-zen-muted)]"
                >
                  {strings.tags.itemCount(counts.get(tag.id) ?? 0)}
                </span>
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
              </div>
            </SettingsRow>
          )
        })}
      </div>
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
