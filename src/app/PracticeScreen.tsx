import { useState, type ReactElement } from 'react'

import { SettingsStepper } from '../components/SettingsStepper'
import { TagFilter } from '../components/TagFilter'
import { SectionCard } from '../components/primitives/SectionCard'
import { SESSION_DURATIONS, sourceMatchesFilter } from '../domain/session'
import { useCollection } from '../hooks/useCollection'
import { useSessionDuration } from '../hooks/useSessionDuration'
import type { SessionRequest } from '../hooks/useSession'
import { useTags } from '../hooks/useTags'
import { useUiStrings } from '../hooks/useUiStringsContext'

export interface PracticeScreenProps {
  onStart(this: void, request: SessionRequest): void
}

export function PracticeScreen({ onStart }: PracticeScreenProps): ReactElement {
  const strings = useUiStrings()
  const { durationMin, setDurationMin } = useSessionDuration()
  const { tagsState } = useTags()
  const collection = useCollection()
  const [filter, setFilter] = useState<string[]>([])

  const toggleFilter = (tagId: string): void => {
    setFilter((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId],
    )
  }

  const tags = tagsState.status === 'ready' ? tagsState.tags : []
  const sources = collection.status === 'ready' ? collection.sources : []
  const pool = sources.filter((s) => sourceMatchesFilter(s.tags, filter))
  const canStart = pool.length > 0

  // Guidance under a blocked Start (SPEC FR-25): distinguish an empty collection
  // from a filter that excludes everything, so the fix is obvious.
  const guidance =
    sources.length === 0 ? strings.practice.emptyCollection : strings.practice.emptyFilter

  const startSession = (): void => {
    onStart({ sourceIds: pool.map((s) => s.id), plannedMinutes: durationMin, tagFilter: filter })
  }

  return (
    <div className="flex w-full flex-1 flex-col text-left">
      <SectionCard padding="6px 18px">
        <SettingsStepper<number>
          label={strings.practice.duration}
          value={durationMin}
          options={SESSION_DURATIONS}
          formatValue={(v) => `${String(v)} ${strings.practice.minUnit}`}
          onChange={setDurationMin}
          strings={strings.practice.stepper}
          noBorder
        />
        {sources.length > 0 && tags.length > 0 ? (
          <div className="border-t border-[var(--color-border-soft)] py-4">
            <TagFilter tags={tags} selected={filter} onToggle={toggleFilter} />
          </div>
        ) : null}
      </SectionCard>

      <div className="flex-1" />

      <div className="w-full">
        {canStart ? null : (
          <p className="mb-3 text-center text-sm text-[var(--color-zen-text-soft)]">{guidance}</p>
        )}
        <button
          type="button"
          disabled={!canStart}
          onClick={startSession}
          className="w-full rounded-full bg-[var(--color-zen-accent)] py-4 text-[15px] font-semibold tracking-[0.06em] text-[var(--color-zen-on-accent)] transition disabled:cursor-not-allowed disabled:opacity-45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zen-accent focus-visible:ring-offset-2 motion-reduce:transition-none"
        >
          {strings.practice.start}
        </button>
      </div>
    </div>
  )
}
