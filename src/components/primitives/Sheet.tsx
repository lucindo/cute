import { useEffect, useRef, type MouseEventHandler, type ReactElement, type ReactNode, type RefObject } from 'react'

export interface SheetProps {
  open: boolean
  onClose(this: void): void
  // Accessible name for the dialog.
  label: string
  // Focused after opening; defaults to the browser's first-focusable pick.
  initialFocus?: RefObject<HTMLElement | null>
  children: ReactNode
}

// Native <dialog> shell, ported from HRV: bottom-sheet on mobile, centered
// card on desktop. Esc and backdrop click both resolve to onClose.
export function Sheet({ open, onClose, label, initialFocus, children }: SheetProps): ReactElement {
  const dialogRef = useRef<HTMLDialogElement>(null)

  // Imperative open/close so the browser sets up <dialog>'s top-layer + inert
  // behavior.
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
      initialFocus?.current?.focus()
    } else if (!open && dialog.open) {
      dialog.close()
    }
  }, [open, initialFocus])

  // Esc fires `cancel` (preventable) then `close`. We handle `cancel` and call
  // onClose; preventDefault avoids double-fire of the close event.
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    const handleCancel = (event: Event): void => {
      event.preventDefault()
      onClose()
    }
    dialog.addEventListener('cancel', handleCancel)
    return () => {
      dialog.removeEventListener('cancel', handleCancel)
    }
  }, [onClose])

  // Click on the dialog itself is the backdrop area; clicks on the inner
  // panel land on a child and are ignored.
  const handleBackdropClick: MouseEventHandler<HTMLDialogElement> = (event) => {
    if (event.target === dialogRef.current) {
      onClose()
    }
  }

  return (
    <dialog
      ref={dialogRef}
      aria-label={label}
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
        {children}
      </div>
    </dialog>
  )
}
