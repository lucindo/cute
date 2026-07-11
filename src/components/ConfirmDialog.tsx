import { useEffect, useId, useRef, type MouseEventHandler, type ReactElement, type ReactNode } from 'react'

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

// Native <dialog> confirmation modal, ported from HRV: bottom-sheet on mobile,
// centered card on desktop. Default focus lands on Cancel (the safe action);
// Esc and backdrop click both resolve to cancel. The confirm action is styled
// destructive — every current consumer deletes something.
export function ConfirmDialog({
  open,
  onConfirm,
  onCancel,
  title,
  confirmLabel,
  cancelLabel,
  body,
}: ConfirmDialogProps): ReactElement {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const cancelButtonRef = useRef<HTMLButtonElement>(null)
  const titleId = useId()

  // Imperative open/close so the browser sets up <dialog>'s top-layer + inert
  // behavior. Default focus on cancel, not on the destructive primary.
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) {
      // A force-closed dialog can leave dialog.open === false while React still
      // believes open === true; showModal() then throws InvalidStateError if
      // the dialog is actually already open non-modally.
      try {
        dialog.showModal()
      } catch {
        /* already modal — safe to ignore */
      }
      cancelButtonRef.current?.focus()
    } else if (!open && dialog.open) {
      dialog.close()
    }
  }, [open])

  // Esc fires `cancel` (preventable) then `close`. We handle `cancel` and call
  // onCancel; preventDefault avoids double-fire of the close event.
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    const handleCancel = (event: Event): void => {
      event.preventDefault()
      onCancel()
    }
    dialog.addEventListener('cancel', handleCancel)
    return () => {
      dialog.removeEventListener('cancel', handleCancel)
    }
  }, [onCancel])

  // Click on the dialog itself is the backdrop area; clicks on the inner
  // panel land on a child and are ignored.
  const handleBackdropClick: MouseEventHandler<HTMLDialogElement> = (event) => {
    if (event.target === dialogRef.current) {
      onCancel()
    }
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onClick={handleBackdropClick}
      className="modal-fade m-0 mt-auto mb-0 max-h-[85vh] w-full max-w-full overflow-y-auto rounded-t-3xl rounded-b-none border-t border-[var(--color-border-soft)] bg-[var(--color-zen-surface)] p-0 shadow-[var(--shadow-modal)] backdrop:bg-[var(--color-modal-backdrop)] sm:m-auto sm:max-h-[82vh] sm:w-auto sm:max-w-sm sm:rounded-2xl sm:border"
    >
      <div className="p-6 pb-7 sm:p-7">
        {/* Grabber — bottom-sheet affordance on mobile only. */}
        <div
          aria-hidden="true"
          className="mx-auto mb-4 h-1 w-11 rounded-full sm:hidden"
          style={{ background: 'var(--color-border-soft)' }}
        />
        <div className="grid gap-5">
          <h2
            id={titleId}
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
      </div>
    </dialog>
  )
}
