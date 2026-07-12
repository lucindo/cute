import { useState, type ReactElement } from 'react'

import { SettingsStepper } from '../components/SettingsStepper'
import { TagFilter } from '../components/TagFilter'
import { SESSION_DURATIONS } from '../domain/session'
import { useSessionDuration } from '../hooks/useSessionDuration'
import { useTags } from '../hooks/useTags'
import { useUiStrings } from '../hooks/useUiStringsContext'

export function PracticeScreen(): ReactElement {
  const strings = useUiStrings()
  const { duration, setDuration } = useSessionDuration()
  const { tagsState } = useTags()
  const [filter, setFilter] = useState<string[]>([])

  const toggleFilter = (tagId: string): void => {
    setFilter((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId],
    )
  }

  const tags = tagsState.status === 'ready' ? tagsState.tags : []

  return (
    <div className="flex w-full flex-col gap-8 text-left">
      <SettingsStepper<number>
        label={strings.practice.duration}
        value={duration}
        options={SESSION_DURATIONS}
        formatValue={(v) => `${String(v)} ${strings.practice.minUnit}`}
        onChange={setDuration}
        strings={strings.practice.stepper}
      />
      {tags.length > 0 ? (
        <TagFilter tags={tags} selected={filter} onToggle={toggleFilter} />
      ) : null}
    </div>
  )
}
