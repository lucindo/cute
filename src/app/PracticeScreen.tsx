import type { ReactElement } from 'react'

import { SettingsStepper } from '../components/SettingsStepper'
import { SESSION_DURATIONS } from '../domain/session'
import { useSessionDuration } from '../hooks/useSessionDuration'
import { useUiStrings } from '../hooks/useUiStringsContext'

export function PracticeScreen(): ReactElement {
  const strings = useUiStrings()
  const { duration, setDuration } = useSessionDuration()

  return (
    <div className="w-full text-left">
      <SettingsStepper<number>
        label={strings.practice.duration}
        value={duration}
        options={SESSION_DURATIONS}
        formatValue={(v) => `${String(v)} ${strings.practice.minUnit}`}
        onChange={setDuration}
        strings={strings.practice.stepper}
      />
    </div>
  )
}
