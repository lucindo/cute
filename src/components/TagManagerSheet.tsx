import type { ReactElement } from 'react'

import { Sheet } from './primitives/Sheet'
import { TagManager } from './TagManager'
import { useUiStrings } from '../hooks/useUiStringsContext'
import type { TagRecord } from '../storage'

export interface TagManagerSheetProps {
  open: boolean
  tags: TagRecord[]
  onRename(this: void, id: string, name: string): void
  onDelete(this: void, id: string): void
  onClose(this: void): void
}

// Tag catalog editor in the same bottom-sheet shell as the item card, so
// managing tags doesn't shove the grid around.
export function TagManagerSheet({
  open,
  tags,
  onRename,
  onDelete,
  onClose,
}: TagManagerSheetProps): ReactElement {
  const strings = useUiStrings()

  return (
    <Sheet open={open} onClose={onClose} label={strings.tags.edit}>
      {open && (
        <div className="grid gap-5">
          <h2
            style={{ fontSize: 19, fontWeight: 600, letterSpacing: '-0.01em' }}
            className="text-center text-[var(--color-zen-text)] sm:text-left"
          >
            {strings.tags.edit}
          </h2>
          <TagManager tags={tags} onRename={onRename} onDelete={onDelete} />
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-[var(--color-border-soft)] bg-transparent px-5 py-3 text-[15px] font-medium text-[var(--color-zen-text)] transition hover:bg-[var(--color-zen-bg-soft)] active:bg-[var(--color-zen-bg-soft)] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zen-accent focus-visible:ring-offset-2"
          >
            {strings.collection.close}
          </button>
        </div>
      )}
    </Sheet>
  )
}
