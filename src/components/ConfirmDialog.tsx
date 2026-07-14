import { useRef, type ReactElement, type ReactNode } from 'react'

import { Sheet } from './primitives/Sheet'

export interface ConfirmDialogProps {
  open: boolean
  onConfirm(this: void): void
  onCancel(this: void): void
  title: string
  confirmLabel: string
  cancelLabel: string
  // Optional summary slot rendered between the title and the action buttons.
  body?: ReactNode
}

// Confirmation modal on the Sheet shell. Default focus lands on Cancel (the
// safe action); the confirm action is styled destructive — every current
// consumer deletes something.
export function ConfirmDialog({
  open,
  onConfirm,
  onCancel,
  title,
  confirmLabel,
  cancelLabel,
  body,
}: ConfirmDialogProps): ReactElement {
  const cancelButtonRef = useRef<HTMLButtonElement>(null)

  return (
    <Sheet open={open} onClose={onCancel} label={title} initialFocus={cancelButtonRef}>
      <div className="grid gap-5">
        <h2
          style={{ fontSize: 19, fontWeight: 600, letterSpacing: '-0.01em' }}
          className="text-center text-[var(--color-zen-text)] sm:text-left"
        >
          {title}
        </h2>
        {body !== undefined && (
          <div className="text-sm text-[var(--color-zen-text-soft)]">{body}</div>
        )}
        {/* Column order matches DOM order on mobile (cancel on top, confirm
            below) so the destructive action doesn't sit above the safe one.
            On desktop the row places the primary action right of cancel. */}
        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            ref={cancelButtonRef}
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-[var(--color-border-soft)] bg-transparent px-5 py-3 sm:flex-1 text-[15px] font-medium text-[var(--color-zen-text)] transition hover:bg-[var(--color-zen-bg-soft)] active:bg-[var(--color-zen-bg-soft)] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zen-accent focus-visible:ring-offset-2"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-xl bg-[var(--color-destructive)] px-5 py-3 sm:flex-1 text-[15px] font-semibold text-[var(--color-destructive-on)] transition hover:bg-[var(--color-destructive-hover)] active:bg-[var(--color-destructive-active)] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-destructive)] focus-visible:ring-offset-2"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </Sheet>
  )
}
