import { useEffect, useRef, type ReactElement } from 'react'

import { ChevronBackIcon } from '../components/icons/ChevronBackIcon'
import { LanguagePicker } from '../components/LanguagePicker'
import { SettingsSectionHeader } from '../components/SettingsSectionHeader'
import { ThemePicker } from '../components/ThemePicker'
import { IconButton } from '../components/primitives/IconButton'
import { PageShell } from '../components/primitives/PageShell'
import { TopAppBar } from '../components/primitives/TopAppBar'
import { useUiStrings } from '../hooks/useUiStringsContext'

export interface SettingsScreenProps {
  onBack(this: void): void
}

export function SettingsScreen({ onBack }: SettingsScreenProps): ReactElement {
  const strings = useUiStrings()
  const backRef = useRef<HTMLButtonElement>(null)

  // Land focus on the way out so keyboard/SR users aren't stranded at page top.
  useEffect(() => {
    backRef.current?.focus()
  }, [])

  return (
    <PageShell>
      <TopAppBar
        title={strings.settings.title}
        leading={
          <IconButton
            icon={<ChevronBackIcon />}
            label={strings.settings.back}
            onClick={onBack}
            buttonRef={backRef}
          />
        }
      />
      <div className="w-full text-left">
        <SettingsSectionHeader label={strings.settings.theme.label} />
        <ThemePicker
          label={strings.settings.theme.label}
          optionLabels={strings.settings.theme.options}
        />
        <SettingsSectionHeader label={strings.settings.language.label} />
        <LanguagePicker label={strings.settings.language.label} />
      </div>
    </PageShell>
  )
}
