import type { ReactElement } from 'react'

import { SettingsRow } from './SettingsRow'

export interface SettingsStepperStrings {
  decrease: string
  increase: string
}

export interface SettingsStepperProps<T extends string | number> {
  label: string
  value: T
  options: readonly T[]
  formatValue?: (value: T) => string
  onChange(this: void, value: T): void
  strings: SettingsStepperStrings
  /** Omit the top divider — for the first/only row in a card. */
  noBorder?: boolean
}

// Stepper row (ported from HRV): label left / [− value +] right, 32px round
// buttons, tabular-nums value. Decrease/increase disable at the ends of options.
export function SettingsStepper<T extends string | number>({
  label,
  value,
  options,
  formatValue = String,
  onChange,
  strings,
  noBorder = false,
}: SettingsStepperProps<T>): ReactElement {
  const selectedIndex = options.indexOf(value)
  const canDecrease = selectedIndex > 0
  const canIncrease = selectedIndex >= 0 && selectedIndex < options.length - 1

  const changeBy = (offset: -1 | 1): void => {
    const nextValue = options[selectedIndex + offset]
    if (nextValue !== undefined) onChange(nextValue)
  }

  const buttonClass =
    'grid size-8 place-items-center rounded-full border border-[var(--color-border-soft)] bg-transparent text-lg leading-none text-[var(--color-zen-text)] transition hover:bg-[var(--color-zen-bg-soft)] active:bg-[var(--color-zen-bg-soft)] disabled:cursor-not-allowed disabled:opacity-45 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zen-accent focus-visible:ring-offset-2'

  return (
    <SettingsRow
      label={label}
      ariaLabel={label}
      noBorder={noBorder}
      className="flex items-center justify-between"
    >
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label={`${strings.decrease} ${label}`}
          className={buttonClass}
          disabled={!canDecrease}
          onClick={() => {
            changeBy(-1)
          }}
        >
          −
        </button>
        <output
          aria-live="polite"
          className="min-w-[72px] text-center text-base font-medium tabular-nums text-[var(--color-zen-text)]"
        >
          {formatValue(value)}
        </output>
        <button
          type="button"
          aria-label={`${strings.increase} ${label}`}
          className={buttonClass}
          disabled={!canIncrease}
          onClick={() => {
            changeBy(1)
          }}
        >
          +
        </button>
      </div>
    </SettingsRow>
  )
}
