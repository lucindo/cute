import { useState, type ReactElement } from 'react'

import { ConfirmDialog } from './ConfirmDialog'
import { tagDisplayName } from '../domain/tags'
import { useUiStrings } from '../hooks/useUiStringsContext'
import type { TagRecord } from '../storage'

export interface TagManagerProps {
  tags: TagRecord[]
  counts: ReadonlyMap<string, number>
  onRename(this: void, id: string, name: string): void
  onDelete(this: void, id: string): void
}

// Fixed row height so switching a row into rename mode never reflows the list.
const rowClass =
  'flex min-h-[3.5rem] items-center gap-2 border-t border-[var(--color-border-soft)] py-2'
const btnBase =
  'rounded-lg px-3 py-1.5 text-sm transition motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2'
const secondaryBtn = `${btnBase} border border-[var(--color-border-soft)] bg-transparent font-medium text-[var(--color-zen-text)] hover:bg-[var(--color-zen-bg-soft)] active:bg-[var(--color-zen-bg-soft)] focus-visible:ring-zen-accent`
const primaryBtn = `${btnBase} bg-[var(--color-zen-accent)] font-semibold text-[var(--color-zen-on-accent)] hover:opacity-90 active:opacity-90 focus-visible:ring-zen-accent`
const destructiveBtn = `${btnBase} bg-[var(--color-destructive)] font-semibold text-[var(--color-destructive-on)] hover:bg-[var(--color-destructive-hover)] active:bg-[var(--color-destructive-active)] focus-visible:ring-[var(--color-destructive)]`

// Tag list with rename and confirmed delete (SPEC FR-14). Each row shows a live
// per-tag item count (counts). Creation lives on the Tags page above this list.
export function TagManager({ tags, counts, onRename, onDelete }: TagManagerProps): ReactElement {
  const strings = useUiStrings()
  const [editing, setEditing] = useState<{ id: string; value: string } | null>(null)
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)

  const sorted = [...tags].sort((a, b) =>
    tagDisplayName(a, strings.tags.seeded).localeCompare(tagDisplayName(b, strings.tags.seeded)),
  )

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
              <fieldset key={tag.id} aria-label={name} className={rowClass}>
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
                    className="w-40 rounded-lg border border-[var(--color-border-soft)] bg-transparent px-3 py-1.5 text-[15px] text-[var(--color-zen-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zen-accent"
                  />
                  <button type="submit" className={primaryBtn}>
                    {strings.tags.save}
                  </button>
                  <button
                    type="button"
                    className={secondaryBtn}
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
            <fieldset key={tag.id} aria-label={name} className={`${rowClass} justify-between`}>
              <span className="text-[15px] text-[var(--color-zen-text)]">{name}</span>
              <div className="flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className="mr-1 text-[13px] tabular-nums text-[var(--color-zen-muted)]"
                >
                  {strings.tags.itemCount(counts.get(tag.id) ?? 0)}
                </span>
                <button
                  type="button"
                  aria-label={`${strings.tags.rename} ${name}`}
                  className={secondaryBtn}
                  onClick={() => {
                    setEditing({ id: tag.id, value: name })
                  }}
                >
                  {strings.tags.rename}
                </button>
                <button
                  type="button"
                  aria-label={`${strings.tags.delete} ${name}`}
                  className={destructiveBtn}
                  onClick={() => {
                    setPendingDelete(tag.id)
                  }}
                >
                  {strings.tags.delete}
                </button>
              </div>
            </fieldset>
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
