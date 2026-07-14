import '@testing-library/jest-dom/vitest'

import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { TagsScreen } from './TagsScreen'
import { UI_STRINGS, type UiStrings } from '../content/strings'
import { getAllRecords, getRecord, openDb, writeMany, type SourceRecord, type WriteOp } from '../storage'
import { UiStringsProvider } from '../hooks/useUiStringsContext'

const T = UI_STRINGS.en.tags

async function openDbOrThrow(): Promise<IDBDatabase> {
  const opened = await openDb()
  if (!opened.ok) throw new Error('openDb failed')
  return opened.value
}

function source(overrides: Partial<SourceRecord> & { id: string }): SourceRecord {
  return {
    type: 'image',
    mimeType: 'image/webp',
    bytes: 3,
    createdAt: 1,
    tags: [],
    deleted: false,
    ...overrides,
  }
}

async function seed(records: SourceRecord[]): Promise<void> {
  const db = await openDbOrThrow()
  const ops: WriteOp[] = records.map((record) => ({ op: 'put', store: 'sources', record }))
  const written = await writeMany(db, ops)
  db.close()
  if (!written.ok) throw new Error('seed: write failed')
}

function renderScreen(
  strings: UiStrings = UI_STRINGS.en,
  onBack: () => void = () => {},
): ReturnType<typeof render> {
  return render(
    <UiStringsProvider value={strings}>
      <TagsScreen onBack={onBack} />
    </UiStringsProvider>,
  )
}

describe('TagsScreen', () => {
  it('creates a standalone tag', async () => {
    renderScreen()

    await userEvent.type(await screen.findByLabelText(T.newTagPlaceholder), 'Sunset')
    await userEvent.click(screen.getByRole('button', { name: T.add }))

    expect(await screen.findByText('Sunset')).toBeInTheDocument()
    const tags = await getAllRecords(await openDbOrThrow(), 'tags')
    if (!tags.ok) throw new Error('expected ok')
    expect(tags.value.some((t) => t.name === 'Sunset')).toBe(true)
  })

  it('shows a per-tag item count from live sources', async () => {
    await seed([
      source({ id: 'a', tags: ['seed:babies'] }),
      source({ id: 'b', tags: ['seed:babies'] }),
      source({ id: 'c', tags: ['seed:kittens'] }),
    ])
    renderScreen()

    const babies = await screen.findByRole('group', { name: 'Babies' })
    expect(within(babies).getByText(T.itemCount(2))).toBeInTheDocument()
    const kittens = screen.getByRole('group', { name: 'Kittens' })
    expect(within(kittens).getByText(T.itemCount(1))).toBeInTheDocument()
  })

  it('renames a seeded tag', async () => {
    renderScreen()
    await userEvent.click(await screen.findByRole('button', { name: `${T.rename} Babies` }))

    const input = screen.getByLabelText(T.rename)
    await userEvent.clear(input)
    await userEvent.type(input, 'Infants')
    await userEvent.click(screen.getByRole('button', { name: T.save }))

    expect(await screen.findByText('Infants')).toBeInTheDocument()
    const stored = await getRecord(await openDbOrThrow(), 'tags', 'seed:babies')
    expect(stored).toEqual({ ok: true, value: { id: 'seed:babies', name: 'Infants' } })
  })

  it('deletes a tag after confirmation and strips it from sources', async () => {
    await seed([source({ id: 'a', tags: ['seed:puppies'] })])
    renderScreen()
    await userEvent.click(await screen.findByRole('button', { name: `${T.delete} Puppies` }))

    const dialog = screen.getByRole('dialog', { name: T.deleteTitle })
    await userEvent.click(within(dialog).getByRole('button', { name: T.deleteConfirm }))

    await waitFor(() => {
      expect(screen.queryByText('Puppies')).not.toBeInTheDocument()
    })
    const db = await openDbOrThrow()
    await expect(getRecord(db, 'tags', 'seed:puppies')).resolves.toEqual({ ok: true, value: null })
    const stored = await getRecord(db, 'sources', 'a')
    if (!stored.ok || stored.value === null) throw new Error('expected the source')
    expect(stored.value.tags).toEqual([])
  })

  it('renders seeded tag names in the active locale', async () => {
    renderScreen(UI_STRINGS['pt-BR'])
    expect(await screen.findByText('Bebês')).toBeInTheDocument()
  })

  it('calls onBack from the back button', async () => {
    const onBack = vi.fn()
    renderScreen(UI_STRINGS.en, onBack)

    await userEvent.click(await screen.findByRole('button', { name: T.back }))
    expect(onBack).toHaveBeenCalledTimes(1)
  })
})
