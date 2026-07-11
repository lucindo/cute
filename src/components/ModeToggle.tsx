// Presentational segmented-control mode switcher: Practice · Collection.
// Two-pill adaptation of HRV's PracticeToggle (locked pill styling kept).

import type { ReactElement } from 'react'

export type AppMode = 'practice' | 'collection'

export interface ModeToggleProps {
  active: AppMode
  onSwitch(this: void, mode: AppMode): void
  strings: {
    label: string
    modeNames: Record<AppMode, string>
  }
}

const MODES: AppMode[] = ['practice', 'collection']

export function ModeToggle({ active, onSwitch, strings }: ModeToggleProps): ReactElement {
  // The border-soft bound is what distinguishes the switcher container from
  // bg-soft on the dark theme (where bg-soft === surface).
  return (
    <div
      role="group"
      aria-label={strings.label}
      className="flex rounded-full border border-[var(--color-border-soft)] bg-[var(--color-zen-bg-soft)] p-1"
    >
      {MODES.map((mode) => {
        const isActive = active === mode
        const pillClass = [
          'flex-1 flex items-center justify-center gap-1 rounded-full px-3 py-2 text-sm',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zen-accent focus-visible:ring-offset-2',
          isActive
            ? 'bg-[var(--color-zen-accent)] font-semibold text-[var(--color-zen-on-accent)]'
            : 'font-medium text-[var(--color-zen-text-soft)]',
        ].join(' ')

        return (
          <button
            key={mode}
            type="button"
            aria-pressed={isActive}
            onClick={() => { onSwitch(mode) }}
            className={pillClass}
          >
            <span>{strings.modeNames[mode]}</span>
          </button>
        )
      })}
    </div>
  )
}
