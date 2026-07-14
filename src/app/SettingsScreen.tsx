import { useRef, useState, type ChangeEvent, type ReactElement } from 'react'

import { ConfirmDialog } from '../components/ConfirmDialog'
import { ChevronBackIcon } from '../components/icons/ChevronBackIcon'
import { ChevronRightIcon } from '../components/icons/ChevronRightIcon'
import { LanguagePicker } from '../components/LanguagePicker'
import { SettingsSectionHeader } from '../components/SettingsSectionHeader'
import { ThemePicker } from '../components/ThemePicker'
import { IconButton } from '../components/primitives/IconButton'
import { PageShell } from '../components/primitives/PageShell'
import { SectionCard } from '../components/primitives/SectionCard'
import { SettingsRow } from '../components/SettingsRow'
import { TopAppBar } from '../components/primitives/TopAppBar'
import { useBackup, type BackupDeps } from '../hooks/useBackup'
import { useFocusOnMount } from '../hooks/useFocusOnMount'
import { useUiStrings } from '../hooks/useUiStringsContext'

const GITHUB_URL = 'https://github.com/lucindo/cute'

const BUILD_INFO =
  [__APP_VERSION__, __APP_BUILD_SHA__, __APP_BUILD_DATE__].filter((v) => v.length > 0).join(' · ') ||
  'unknown'

const ROW_CLASS =
  'flex min-h-[44px] w-full items-center rounded-2xl px-2 text-left text-[15px] text-[var(--color-zen-text)] transition hover:bg-[var(--color-zen-bg-soft)] active:bg-[var(--color-zen-bg-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zen-accent focus-visible:ring-offset-2 motion-reduce:transition-none disabled:opacity-50'

export interface SettingsScreenProps {
  onBack(this: void): void
  onOpenStats(this: void): void
  // Seam for the browser-only download leaf; defaults to a real anchor click.
  backupDeps?: BackupDeps
}

// Owns the backup export/restore leaf: useBackup state, the hidden file input,
// and the restore-confirm dialog (top-layer, so its DOM position is moot).
function BackupSection({ backupDeps }: { backupDeps: BackupDeps | undefined }): ReactElement {
  const b = useUiStrings().settings.backup
  const { backupState, exportNow, restore } = useBackup(backupDeps)
  const fileRef = useRef<HTMLInputElement>(null)
  const [pendingRestore, setPendingRestore] = useState<File | null>(null)

  const working = backupState.status === 'working'
  const errorText =
    backupState.status === 'error'
      ? backupState.error.name === 'InvalidBackup'
        ? b.invalidFile
        : b.error
      : null

  function onFilePicked(event: ChangeEvent<HTMLInputElement>): void {
    const file = event.target.files?.[0]
    // Reset so re-picking the same file fires change again.
    event.target.value = ''
    if (file !== undefined) setPendingRestore(file)
  }

  function confirmRestore(): void {
    if (pendingRestore !== null) restore(pendingRestore)
    setPendingRestore(null)
  }

  return (
    <>
      <SettingsSectionHeader label={b.label} />
      <SectionCard padding="4px 8px">
        <button type="button" onClick={exportNow} disabled={working} className={ROW_CLASS}>
          {b.export}
        </button>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={working}
          className={`${ROW_CLASS} border-t border-[var(--color-border-soft)]`}
        >
          {b.restore}
        </button>
      </SectionCard>
      {errorText !== null && (
        <p role="alert" className="mt-2 px-2 text-[13px] text-[var(--color-destructive)]">
          {errorText}
        </p>
      )}
      <input
        ref={fileRef}
        type="file"
        accept=".zip,application/zip"
        className="hidden"
        aria-hidden="true"
        onChange={onFilePicked}
      />
      <ConfirmDialog
        open={pendingRestore !== null}
        title={b.restoreTitle}
        body={b.restoreBody}
        confirmLabel={b.restoreConfirm}
        cancelLabel={b.restoreCancel}
        onConfirm={confirmRestore}
        onCancel={() => { setPendingRestore(null) }}
      />
    </>
  )
}

export function SettingsScreen({ onBack, onOpenStats, backupDeps }: SettingsScreenProps): ReactElement {
  const strings = useUiStrings()
  const backRef = useFocusOnMount<HTMLButtonElement>()

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
        <SettingsSectionHeader label={strings.settings.statistics.label} />
        <SectionCard padding="4px 8px">
          <button
            type="button"
            onClick={onOpenStats}
            className={`${ROW_CLASS} justify-between`}
          >
            <span>{strings.settings.statistics.open}</span>
            <ChevronRightIcon className="text-[var(--color-zen-muted)]" />
          </button>
        </SectionCard>
        <SettingsSectionHeader label={strings.settings.theme.label} />
        <ThemePicker
          label={strings.settings.theme.label}
          optionLabels={strings.settings.theme.options}
        />
        <SettingsSectionHeader label={strings.settings.language.label} />
        <LanguagePicker label={strings.settings.language.label} />
        <BackupSection backupDeps={backupDeps} />
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
