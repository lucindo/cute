import type { ReactElement } from 'react'

import { CheckIcon } from '../components/icons/CheckIcon'
import { ChevronBackIcon } from '../components/icons/ChevronBackIcon'
import { StopIcon } from '../components/icons/StopIcon'
import { IconButton } from '../components/primitives/IconButton'
import { PageShell } from '../components/primitives/PageShell'
import { SectionCard } from '../components/primitives/SectionCard'
import { SettingsSectionHeader } from '../components/SettingsSectionHeader'
import { TopAppBar } from '../components/primitives/TopAppBar'
import { formatDuration, formatTotalDuration } from '../domain/format'
import type { RecentSession } from '../domain/stats'
import type { LocaleId } from '../domain/settings'
import type { UiStrings } from '../content/strings'
import { useFocusOnMount } from '../hooks/useFocusOnMount'
import { useStats } from '../hooks/useStats'
import { useUiStrings } from '../hooks/useUiStringsContext'

export interface StatsScreenProps {
  locale: LocaleId
  onBack(this: void): void
}

function StatRow({ label, value }: { label: string; value: string }): ReactElement {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[13px] text-[var(--color-zen-text-soft)]">{label}</span>
      <span className="text-[13px] tabular-nums text-[var(--color-zen-text)]">{value}</span>
    </div>
  )
}

function RecentRow({
  session,
  locale,
  strings,
  first,
}: {
  session: RecentSession
  locale: LocaleId
  strings: UiStrings['stats']
  first: boolean
}): ReactElement {
  const when = new Date(session.startedAt).toLocaleString(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
  // The space before the interpolation is load-bearing: Tailwind's scanner drops
  // a class that runs straight into `${`, so `py-3.5` would never be generated.
  return (
    <div
      className={`flex items-center justify-between gap-3 py-3.5 ${
        first ? '' : 'border-t border-[var(--color-border-soft)]'
      }`}
    >
      <div className="min-w-0 truncate text-[13px] text-[var(--color-zen-text)]">{when}</div>
      <div className="flex shrink-0 items-center gap-1.5 text-[var(--color-zen-text-soft)]">
        {/* The end reason rides as an icon so the row stays one line; the label is its accessible name. */}
        <span
          role="img"
          aria-label={strings.endReason[session.endReason]}
          title={strings.endReason[session.endReason]}
          className="flex text-[var(--color-zen-muted)]"
        >
          {session.endReason === 'completed' ? <CheckIcon /> : <StopIcon />}
        </span>
        <span className="whitespace-nowrap text-[13px] tabular-nums">
          {strings.sessionMeta(formatDuration(session.durationMs), session.holdCount)}
        </span>
      </div>
    </div>
  )
}

// Stats sub-page (SPEC FR-44): lifetime totals + a recent-session list, both
// aggregated at read time by useStats. Reached from the Settings Statistics row.
export function StatsScreen({ locale, onBack }: StatsScreenProps): ReactElement {
  const s = useUiStrings().stats
  const state = useStats()
  const backRef = useFocusOnMount<HTMLButtonElement>()

  return (
    <PageShell>
      <TopAppBar
        title={s.title}
        leading={
          <IconButton icon={<ChevronBackIcon />} label={s.back} onClick={onBack} buttonRef={backRef} />
        }
      />
      <div className="mt-6 w-full text-left">
        {state.status === 'error' ? (
          <p className="text-center text-sm text-[var(--color-zen-muted)]">{s.loadError}</p>
        ) : state.status === 'loading' ? null : state.stats.totalSessions === 0 ? (
          <p className="text-center text-sm text-[var(--color-zen-muted)]">{s.empty}</p>
        ) : (
          <>
            <SectionCard padding="14px 16px">
              <div className="grid gap-2">
                <StatRow label={s.sessions} value={String(state.stats.totalSessions)} />
                <StatRow label={s.practiceTime} value={formatTotalDuration(state.stats.totalPracticeMs)} />
                <StatRow label={s.totalHeld} value={formatTotalDuration(state.stats.totalHeldMs)} />
                <StatRow label={s.longest} value={formatDuration(state.stats.longestHoldMs)} />
              </div>
            </SectionCard>
            <SettingsSectionHeader label={s.recent} />
            <SectionCard padding="4px 16px">
              {state.stats.recent.map((session, i) => (
                <RecentRow
                  key={session.id}
                  session={session}
                  locale={locale}
                  strings={s}
                  first={i === 0}
                />
              ))}
            </SectionCard>
          </>
        )}
      </div>
    </PageShell>
  )
}
