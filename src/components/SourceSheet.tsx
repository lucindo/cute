import { useState, type ReactElement } from 'react'

import { ConfirmDialog } from './ConfirmDialog'
import { Sheet } from './primitives/Sheet'
import { TagAssignPanel } from './TagAssignPanel'
import { formatBytes } from '../domain/format'
import type { CollectionSource } from '../hooks/useCollection'
import { useUiStrings } from '../hooks/useUiStringsContext'
import type { TagRecord } from '../storage'

export interface SourceSheetProps {
  source: CollectionSource | null
  tags: TagRecord[]
  // Create a catalog tag and resolve its id so the assignment can be staged.
  onCreateTag(this: void, name: string): Promise<string | null>
  onSave(this: void, id: string, edits: { caption: string; tags: string[] }): void
  onRequestDelete(this: void, id: string): void
  onClose(this: void): void
}

function sameIds(ids: ReadonlySet<string>, arr: readonly string[]): boolean {
  return ids.size === arr.length && arr.every((id) => ids.has(id))
}

// Per-item bottom sheet, editing staged locally: caption and tag changes live
// in draft state and hit the DB only on Save. Closing with unsaved edits asks
// to confirm; the grid stays thumbnails-only.
export function SourceSheet({
  source,
  tags,
  onCreateTag,
  onSave,
  onRequestDelete,
  onClose,
}: SourceSheetProps): ReactElement {
  const strings = useUiStrings()
  const [caption, setCaption] = useState('')
  const [tagIds, setTagIds] = useState<ReadonlySet<string>>(() => new Set())
  const [confirmingDiscard, setConfirmingDiscard] = useState(false)
  const [seededId, setSeededId] = useState<string | null>(null)

  // Reseed the draft whenever a different item opens (or the sheet closes) —
  // resets state on prop change without remounting.
  const currentId = source?.id ?? null
  if (currentId !== seededId) {
    setSeededId(currentId)
    setCaption(source?.caption ?? '')
    setTagIds(new Set(source?.tags ?? []))
    setConfirmingDiscard(false)
  }

  const dirty =
    source !== null &&
    (caption.trim() !== (source.caption ?? '').trim() || !sameIds(tagIds, source.tags))

  const toggleTag = (tagId: string, mode: 'add' | 'remove'): void => {
    setTagIds((prev) => {
      const next = new Set(prev)
      if (mode === 'add') next.add(tagId)
      else next.delete(tagId)
      return next
    })
  }

  const createAndStage = (name: string): void => {
    onCreateTag(name).then(
      (id) => {
        if (id !== null) setTagIds((prev) => new Set(prev).add(id))
      },
      // Staging is best-effort; onCreateTag resolves null on expected failure,
      // so a reject is a bug — absorb it rather than strand an unhandled reject.
      () => undefined,
    )
  }

  const requestClose = (): void => {
    if (dirty) setConfirmingDiscard(true)
    else onClose()
  }

  const save = (): void => {
    if (source !== null) onSave(source.id, { caption, tags: [...tagIds] })
    onClose()
  }

  return (
    <>
      <Sheet
        open={source !== null}
        onClose={requestClose}
        label={source?.caption ?? strings.collection.openItem}
      >
        {source !== null && (
          <div className="grid gap-5">
            <div className="overflow-hidden rounded-xl bg-[var(--color-zen-bg-soft)]">
              {source.thumbUrl !== null && (
                <img
                  src={source.thumbUrl}
                  alt={source.caption ?? ''}
                  className="mx-auto max-h-64 w-full object-contain"
                />
              )}
            </div>
            <label className="grid gap-1.5 text-sm">
              <span className="text-[var(--color-zen-text-soft)]">{strings.collection.caption}</span>
              <input
                type="text"
                value={caption}
                placeholder={strings.collection.captionPlaceholder}
                onChange={(event) => {
                  setCaption(event.currentTarget.value)
                }}
                className="rounded-xl border border-[var(--color-border-soft)] bg-transparent px-3 py-2 text-[15px] text-[var(--color-zen-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zen-accent"
              />
            </label>
            <p className="text-xs text-[var(--color-zen-muted)]">{formatBytes(source.bytes)}</p>
            <TagAssignPanel
              tags={tags}
              selectedSources={[{ id: source.id, tags: [...tagIds] }]}
              onToggle={toggleTag}
              onCreate={createAndStage}
            />
            <div className="grid gap-3">
              <div className="flex gap-3">
                <button
                  type="button"
                  disabled={!dirty}
                  onClick={save}
                  className="flex-1 rounded-xl bg-[var(--color-zen-accent)] px-5 py-3 text-[15px] font-semibold text-[var(--color-zen-on-accent)] transition hover:opacity-90 active:opacity-90 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zen-accent focus-visible:ring-offset-2 disabled:opacity-40"
                >
                  {strings.collection.save}
                </button>
                <button
                  type="button"
                  onClick={requestClose}
                  className="flex-1 rounded-xl border border-[var(--color-border-soft)] bg-transparent px-5 py-3 text-[15px] font-medium text-[var(--color-zen-text)] transition hover:bg-[var(--color-zen-bg-soft)] active:bg-[var(--color-zen-bg-soft)] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zen-accent focus-visible:ring-offset-2"
                >
                  {strings.collection.close}
                </button>
              </div>
              <button
                type="button"
                onClick={() => {
                  onRequestDelete(source.id)
                }}
                className="w-full rounded-xl bg-[var(--color-destructive)] px-5 py-3 text-[15px] font-semibold text-[var(--color-destructive-on)] transition hover:bg-[var(--color-destructive-hover)] active:bg-[var(--color-destructive-active)] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-destructive)] focus-visible:ring-offset-2"
              >
                {strings.collection.deleteLabel}
              </button>
            </div>
          </div>
        )}
      </Sheet>
      <ConfirmDialog
        open={confirmingDiscard}
        title={strings.collection.discardTitle}
        body={strings.collection.discardBody}
        confirmLabel={strings.collection.discardConfirm}
        cancelLabel={strings.collection.discardCancel}
        onConfirm={() => {
          setConfirmingDiscard(false)
          onClose()
        }}
        onCancel={() => {
          setConfirmingDiscard(false)
        }}
      />
    </>
  )
}
