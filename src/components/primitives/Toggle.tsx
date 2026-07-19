import type { ReactElement } from 'react'

export interface ToggleProps {
  checked: boolean
  onChange(this: void, next: boolean): void
  label: string
  disabled?: boolean
  className?: string
}

// Toggle locked values (ported from HRV):
// - 44 × 24 pill; bg=accent when on / transparent + 1 px border-soft when off
// - 20 × 20 knob; on-accent color when on / muted when off
// - 180 ms slide; subtle 0 1px 2px shadow on the knob
export function Toggle({
  checked,
  onChange,
  label,
  disabled = false,
  className = '',
}: ToggleProps): ReactElement {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => {
        onChange(!checked)
      }}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-all disabled:cursor-not-allowed disabled:opacity-45 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zen-accent focus-visible:ring-offset-2 ${
        checked
          ? 'border-transparent bg-[var(--color-zen-accent)]'
          : 'border-[var(--color-border-soft)] bg-transparent'
      } ${className}`.trim()}
    >
      <span
        aria-hidden="true"
        className={`absolute top-[1px] inline-block size-5 rounded-full shadow-[0_1px_2px_rgba(0,0,0,0.15)] transition-[left] duration-[180ms] motion-reduce:transition-none ${
          checked ? 'left-[21px] bg-[var(--color-zen-on-accent)]' : 'left-[2px] bg-[var(--color-zen-muted)]'
        }`}
      />
    </button>
  )
}
