import { useEffect, useRef, type ReactElement } from 'react'

import { ChevronBackIcon } from '../components/icons/ChevronBackIcon'
import { ChevronRightIcon } from '../components/icons/ChevronRightIcon'
import { LanguagePicker } from '../components/LanguagePicker'
import { SettingsSectionHeader } from '../components/SettingsSectionHeader'
import { ThemePicker } from '../components/ThemePicker'
import { IconButton } from '../components/primitives/IconButton'
import { PageShell } from '../components/primitives/PageShell'
import { SettingsRow } from '../components/SettingsRow'
import { TopAppBar } from '../components/primitives/TopAppBar'
import { useUiStrings } from '../hooks/useUiStringsContext'

const GITHUB_URL = 'https://github.com/lucindo/cute'

const BUILD_INFO =
  [__APP_VERSION__, __APP_BUILD_SHA__, __APP_BUILD_DATE__].filter((v) => v.length > 0).join(' · ') ||
  'unknown'

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
        <SettingsSectionHeader label={strings.settings.about.label} />
        <SettingsRow
          label={strings.settings.about.version}
          ariaLabel={strings.settings.about.version}
          noBorder
          className="flex items-center justify-between gap-3"
        >
          <span className="text-[13px] tabular-nums text-[var(--color-zen-text-soft)]">
            {BUILD_INFO}
          </span>
        </SettingsRow>
        <a
          href={GITHUB_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between gap-3 border-t border-[var(--color-border-soft)] py-3 text-[15px] text-[var(--color-zen-text)] transition hover:text-[var(--color-zen-accent-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zen-accent focus-visible:ring-offset-2 motion-reduce:transition-none"
        >
          <span>{strings.settings.about.source}</span>
          <ChevronRightIcon className="text-[var(--color-zen-muted)]" />
        </a>
      </div>
    </PageShell>
  )
}
