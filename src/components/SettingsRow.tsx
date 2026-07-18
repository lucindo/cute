import type { ReactElement, ReactNode } from 'react'

export interface SettingsRowProps {
  label: string
  ariaLabel: string
  /** Additional className applied to the fieldset (e.g. 'flex items-center justify-between') */
  className?: string
  /** When true, omits the border-t divider — for a row that is the sole row in
   *  a container that already separates it visually. */
  noBorder?: boolean
  /** When true, dims the label to match a disabled control (whole-row dim). */
  dimmed?: boolean
  children: ReactNode
}

// Shared row chrome for settings-style rows (ported from HRV): fieldset wrapper
// with border-t / py-3 divider, a 15px label span, and a children slot for the
// row's control. The fieldset preserves role="group" semantics for the row.
export function SettingsRow({
  label,
  ariaLabel,
  className,
  noBorder = false,
  dimmed = false,
  children,
}: SettingsRowProps): ReactElement {
  const fieldsetClass = [
    noBorder ? 'py-3' : 'border-t border-[var(--color-border-soft)] py-3',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <fieldset aria-label={ariaLabel} className={fieldsetClass}>
      <span
        className={`text-[15px] font-normal text-[var(--color-zen-text)] ${dimmed ? 'opacity-45' : ''}`}
      >
        {label}
      </span>
      {children}
    </fieldset>
  )
}
