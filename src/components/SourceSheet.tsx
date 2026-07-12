import type { ReactElement } from 'react'

import { Sheet } from './primitives/Sheet'
import { TagAssignPanel } from './TagAssignPanel'
import { formatBytes } from '../domain/format'
import type { CollectionSource } from '../hooks/useCollection'
import { useUiStrings } from '../hooks/useUiStringsContext'
import type { TagRecord } from '../storage'

export interface SourceSheetProps {
  source: CollectionSource | null
  tags: TagRecord[]
  onToggleTag(this: void, tagId: string, mode: 'add' | 'remove'): void
  onCreateTag(this: void, name: string): void
  onRequestDelete(this: void, id: string): void
  onClose(this: void): void
}

// Per-item bottom sheet: bigger preview plus touch-sized tag and delete
// actions — the grid itself stays thumbnails-only.
export function SourceSheet({
  source,
  tags,
  onToggleTag,
  onCreateTag,
  onRequestDelete,
  onClose,
}: SourceSheetProps): ReactElement {
  const strings = useUiStrings()

  return (
    <Sheet
      open={source !== null}
      onClose={onClose}
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
          <p className="text-xs text-[var(--color-zen-muted)]">{formatBytes(source.bytes)}</p>
          <TagAssignPanel
            tags={tags}
            selectedSources={[source]}
            onToggle={onToggleTag}
            onCreate={onCreateTag}
          />
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-[var(--color-border-soft)] bg-transparent px-5 py-3 sm:flex-1 text-[15px] font-medium text-[var(--color-zen-text)] transition hover:bg-[var(--color-zen-bg-soft)] active:bg-[var(--color-zen-bg-soft)] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zen-accent focus-visible:ring-offset-2"
            >
              {strings.collection.close}
            </button>
            <button
              type="button"
              onClick={() => {
                onRequestDelete(source.id)
              }}
              className="rounded-xl bg-[var(--color-destructive)] px-5 py-3 sm:flex-1 text-[15px] font-semibold text-[var(--color-destructive-on)] transition hover:bg-[var(--color-destructive-hover)] active:bg-[var(--color-destructive-active)] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-destructive)] focus-visible:ring-offset-2"
            >
              {strings.collection.deleteLabel}
            </button>
          </div>
        </div>
      )}
    </Sheet>
  )
}
