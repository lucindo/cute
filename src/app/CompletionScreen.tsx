import type { ReactElement } from 'react'

import { SectionCard } from '../components/primitives/SectionCard'
import type { UiStrings } from '../content/strings'
import { formatDuration } from '../domain/format'
import type { SessionSummary } from '../domain/sessionMachine'

export interface CompletionScreenProps {
  summary: SessionSummary
  onDone(this: void): void
  strings: UiStrings['session']['completion']
}

// Post-session summary (SPEC FR-40): actual duration incl. overtime, hold count,
// total held, longest hold. A normal themed screen, not the dark media takeover.
export function CompletionScreen({ summary, onDone, strings }: CompletionScreenProps): ReactElement {
  const rows = [
    { label: strings.duration, value: formatDuration(summary.durationMs) },
    { label: strings.holds, value: String(summary.holdCount) },
    { label: strings.totalHeld, value: formatDuration(summary.totalHeldMs) },
    { label: strings.longest, value: formatDuration(summary.longestHoldMs) },
  ]

  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center px-6"
      style={{
        background: 'var(--page-bg-gradient)',
        paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))',
      }}
    >
      <div className="w-full max-w-[400px]">
        <h1 className="mb-6 text-center text-2xl font-semibold text-[var(--color-zen-text)]">
          {strings.title}
        </h1>
        <SectionCard padding="2px 18px">
          {rows.map((row, i) => (
            <div
              key={row.label}
              className={`flex items-center justify-between py-3 text-[15px] ${
                i > 0 ? 'border-t border-[var(--color-border-soft)]' : ''
              }`}
            >
              <span className="text-[var(--color-zen-text-soft)]">{row.label}</span>
              <span className="font-medium tabular-nums text-[var(--color-zen-text)]">
                {row.value}
              </span>
            </div>
          ))}
        </SectionCard>
        <button
          type="button"
          onClick={onDone}
          className="mt-6 w-full rounded-full bg-[var(--color-zen-accent)] py-4 text-[15px] font-semibold tracking-[0.06em] text-[var(--color-zen-on-accent)] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zen-accent focus-visible:ring-offset-2 motion-reduce:transition-none"
        >
          {strings.done}
        </button>
      </div>
    </div>
  )
}
