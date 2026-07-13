import type { ReactElement, ReactNode } from 'react'

export interface PickerCardGridProps<T extends string> {
  sectionLabel: string
  labelId: string
  options: readonly T[]
  value: T
  onChange(this: void, next: T): void
  renderOption(this: void, option: T): ReactNode
  columns: 2 | 3 | 4
  // Render the `<p>` sublabel sr-only when an enclosing SettingsSectionHeader
  // already carries the visible label; the aria-labelledby link stays intact.
  sectionLabelHidden?: boolean | undefined
}

const COLUMNS_CLASS: Record<2 | 3 | 4, string> = {
  2: 'grid-cols-2',
  3: 'grid-cols-3',
  4: 'grid-cols-4',
}

const BASE_BUTTON =
  'inline-flex items-center justify-center gap-2 rounded-full px-3 py-2 text-xs transition motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zen-accent focus-visible:ring-offset-2'
const SELECTED_BUTTON =
  'border border-[var(--color-zen-accent)] bg-[var(--color-zen-bg-soft)] text-[var(--color-zen-text)]'
const UNSELECTED_BUTTON =
  'border border-[var(--color-border-soft)] bg-[var(--color-zen-surface)] text-[var(--color-zen-text-soft)] hover:bg-[var(--color-zen-bg-soft)] active:bg-[var(--color-zen-bg-soft)]'

/** Radiogroup-as-cards primitive (ported from HRV). Each consumer is a thin
 *  adapter owning its choice hook and option→label mapping; the primitive owns
 *  the card styling, the a11y wiring, and the layout grid. `labelId` is explicit
 *  (not useId) so the caller controls the aria-labelledby id. */
export function PickerCardGrid<T extends string>({
  sectionLabel,
  labelId,
  options,
  value,
  onChange,
  renderOption,
  columns,
  sectionLabelHidden = false,
}: PickerCardGridProps<T>): ReactElement {
  const labelClass = sectionLabelHidden
    ? 'sr-only'
    : 'text-sm font-semibold text-[var(--color-zen-accent-strong)]'
  const radiogroupMarginClass = sectionLabelHidden ? '' : 'mt-2 '

  return (
    <div>
      <p id={labelId} className={labelClass}>
        {sectionLabel}
      </p>
      <div
        role="radiogroup"
        aria-labelledby={labelId}
        className={`${radiogroupMarginClass}grid ${COLUMNS_CLASS[columns]} gap-2`}
      >
        {options.map((id) => {
          const selected = value === id
          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => {
                onChange(id)
              }}
              className={`${BASE_BUTTON} ${selected ? SELECTED_BUTTON : UNSELECTED_BUTTON} ${selected ? 'font-semibold' : 'font-medium'}`}
            >
              {renderOption(id)}
            </button>
          )
        })}
      </div>
    </div>
  )
}
