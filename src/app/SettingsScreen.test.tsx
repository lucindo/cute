import '@testing-library/jest-dom/vitest'

import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { strToU8, zipSync } from 'fflate'
import { describe, expect, it, vi } from 'vitest'

import { SettingsScreen } from './SettingsScreen'
import { UI_STRINGS } from '../content/strings'
import { BACKUP_VERSION } from '../domain/backup'
import { UiStringsProvider } from '../hooks/useUiStringsContext'
import { getAllRecords, openDb, writeMany, type SourceRecord } from '../storage'

const BACKUP = UI_STRINGS.en.settings.backup

const SOURCE: SourceRecord = {
  id: 's1',
  type: 'image',
  mimeType: 'image/webp',
  bytes: 3,
  createdAt: 1,
  tags: [],
  deleted: false,
}

function renderSettings(
  opts: { download?: (blob: Blob, name: string) => void } = {},
): { onOpenStats: ReturnType<typeof vi.fn>; container: HTMLElement } {
  const onOpenStats = vi.fn()
  const { container } = render(
    <UiStringsProvider value={UI_STRINGS.en}>
      <SettingsScreen
        onBack={vi.fn()}
        onOpenStats={onOpenStats}
        {...(opts.download ? { backupDeps: { download: opts.download } } : {})}
      />
    </UiStringsProvider>,
  )
  return { onOpenStats, container }
}

async function seedSource(): Promise<void> {
  const opened = await openDb()
  if (!opened.ok) throw new Error('seed: openDb failed')
  const written = await writeMany(opened.value, [{ op: 'put', store: 'sources', record: SOURCE }])
  opened.value.close()
  if (!written.ok) throw new Error('seed: write failed')
}

async function readSources(): Promise<SourceRecord[]> {
  const opened = await openDb()
  if (!opened.ok) throw new Error('read: openDb failed')
  const result = await getAllRecords(opened.value, 'sources')
  opened.value.close()
  if (!result.ok) throw new Error('read: getAll failed')
  return result.value
}

function backupFile(bytes: Uint8Array, name = 'backup.zip'): File {
  // Copy into a plain ArrayBuffer-backed view — fflate's ArrayBufferLike view
  // isn't a valid BlobPart under strict lib types.
  return new File([new Uint8Array(bytes)], name, { type: 'application/zip' })
}

function validEmptyBackup(): File {
  const zip = zipSync({
    'manifest.json': strToU8(
      JSON.stringify({ version: BACKUP_VERSION, sources: [], tags: [], sessions: [], holdEvents: [] }),
    ),
  })
  return backupFile(zip)
}

function fileInput(container: HTMLElement): HTMLInputElement {
  const input = container.querySelector<HTMLInputElement>('input[type="file"]')
  if (input === null) throw new Error('no file input')
  return input
}

function restoreDialog(container: HTMLElement): HTMLDialogElement {
  const dialog = container.querySelector<HTMLDialogElement>('dialog')
  if (dialog === null) throw new Error('no dialog')
  return dialog
}

describe('SettingsScreen — About', () => {
  it('links Source to the project repository', () => {
    renderSettings()
    expect(screen.getByRole('link', { name: 'Source' })).toHaveAttribute(
      'href',
      'https://github.com/lucindo/cute',
    )
  })

  it('shows a non-empty version row', () => {
    renderSettings()
    const version = screen.getByRole('group', { name: 'Version' })
    expect(version.textContent).toMatch(/\S/)
  })
})

describe('SettingsScreen — Statistics', () => {
  it('opens Stats from the Statistics row', async () => {
    const { onOpenStats } = renderSettings()
    await userEvent.click(screen.getByRole('button', { name: 'View statistics' }))
    expect(onOpenStats).toHaveBeenCalledOnce()
  })
})

describe('SettingsScreen — Backup', () => {
  it('exports a zip through the download seam', async () => {
    await seedSource()
    const download = vi.fn<(blob: Blob, name: string) => void>()
    renderSettings({ download })

    await userEvent.click(screen.getByRole('button', { name: BACKUP.export }))

    await waitFor(() => { expect(download).toHaveBeenCalledOnce() })
    expect(download.mock.calls[0]?.[0]).toBeInstanceOf(Blob)
    expect(download.mock.calls[0]?.[1]).toMatch(/^cute-backup-\d{4}-\d{2}-\d{2}\.zip$/)
  })

  it('gates restore behind the confirm dialog without touching data', async () => {
    await seedSource()
    const { container } = renderSettings()

    fireEvent.change(fileInput(container), { target: { files: [validEmptyBackup()] } })

    expect(restoreDialog(container).open).toBe(true)
    expect(await readSources()).toHaveLength(1) // not restored yet
  })

  it('leaves data untouched when the restore is cancelled', async () => {
    await seedSource()
    const { container } = renderSettings()

    fireEvent.change(fileInput(container), { target: { files: [validEmptyBackup()] } })
    await userEvent.click(screen.getByRole('button', { name: BACKUP.restoreCancel }))

    expect(restoreDialog(container).open).toBe(false)
    expect(await readSources()).toHaveLength(1)
  })

  it('replaces all data when the restore is confirmed', async () => {
    await seedSource()
    const { container } = renderSettings()

    fireEvent.change(fileInput(container), { target: { files: [validEmptyBackup()] } })
    await userEvent.click(screen.getByRole('button', { name: BACKUP.restoreConfirm }))

    await waitFor(async () => { expect(await readSources()).toHaveLength(0) })
  })

  it('reports an invalid file and keeps data on a corrupt restore (AC-10)', async () => {
    await seedSource()
    const { container } = renderSettings()

    fireEvent.change(fileInput(container), { target: { files: [backupFile(new Uint8Array([1, 2, 3, 4, 5]))] } })
    await userEvent.click(screen.getByRole('button', { name: BACKUP.restoreConfirm }))

    expect(await screen.findByRole('alert')).toHaveTextContent(BACKUP.invalidFile)
    expect(await readSources()).toHaveLength(1)
  })
})
