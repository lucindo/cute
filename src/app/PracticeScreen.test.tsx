import '@testing-library/jest-dom/vitest'

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { PracticeScreen } from './PracticeScreen'
import { UI_STRINGS } from '../content/strings'
import type { SessionRequest } from '../hooks/useSession'
import { UiStringsProvider } from '../hooks/useUiStringsContext'
import {
  loadPrefs,
  openDb,
  savePrefs,
  writeMany,
  type SourceRecord,
  type WriteOp,
} from '../storage'

function renderPractice(onStart: (request: SessionRequest) => void = vi.fn()) {
  return render(
    <UiStringsProvider value={UI_STRINGS.en}>
      <PracticeScreen onStart={onStart} />
    </UiStringsProvider>,
  )
}

function source(id: string, tags: string[]): SourceRecord {
  return {
    id,
    type: 'image',
    mimeType: 'image/webp',
    bytes: 3,
    createdAt: 1,
    tags,
    deleted: false,
  }
}

async function seed(records: SourceRecord[]): Promise<void> {
  const opened = await openDb()
  if (!opened.ok) throw new Error('seed: openDb failed')
  const ops: WriteOp[] = records.map((record) => ({ op: 'put', store: 'sources', record }))
  const written = await writeMany(opened.value, ops)
  opened.value.close()
  if (!written.ok) throw new Error('seed: write failed')
}

describe('PracticeScreen duration', () => {
  it('defaults to 5 min', () => {
    renderPractice()
    expect(screen.getByText('5 min')).toBeInTheDocument()
  })

  it('seeds from the last-used pref', () => {
    savePrefs({ locale: 'en', theme: 'system', sessionDurationMin: 12, videoSound: true })
    renderPractice()
    expect(screen.getByText('12 min')).toBeInTheDocument()
  })

  it('persists a change as the new last-used duration', async () => {
    renderPractice()
    await userEvent.click(screen.getByRole('button', { name: 'Increase Duration' }))
    expect(screen.getByText('6 min')).toBeInTheDocument()
    expect(loadPrefs().sessionDurationMin).toBe(6)
  })
})

describe('PracticeScreen tag filter', () => {
  it('renders seeded tag chips and toggles selection once a collection exists', async () => {
    await seed([source('s1', ['seed:kittens'])])
    renderPractice()

    const kittens = await screen.findByRole('button', { name: 'Kittens' })
    expect(kittens).toHaveAttribute('aria-pressed', 'false')

    await userEvent.click(kittens)
    expect(kittens).toHaveAttribute('aria-pressed', 'true')
  })

  it('hides the filter while the collection is empty', async () => {
    renderPractice()
    await screen.findByText(UI_STRINGS.en.practice.emptyCollection)
    expect(screen.queryByRole('button', { name: 'Kittens' })).not.toBeInTheDocument()
  })
})

describe('PracticeScreen start guard', () => {
  it('blocks Start on an empty collection and points to the Collection', async () => {
    renderPractice()
    expect(await screen.findByText(UI_STRINGS.en.practice.emptyCollection)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Start' })).toBeDisabled()
  })

  it('enables Start when a source is available and launches with the matched pool', async () => {
    const onStart = vi.fn()
    await seed([source('s1', ['seed:kittens'])])
    renderPractice(onStart)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Start' })).toBeEnabled()
    })
    await userEvent.click(screen.getByRole('button', { name: 'Start' }))
    expect(onStart).toHaveBeenCalledWith({
      sourceIds: ['s1'],
      plannedMinutes: 5,
      tagFilter: [],
    })
  })

  it('blocks Start when the filter matches nothing', async () => {
    await seed([source('s1', ['seed:babies'])])
    renderPractice()

    const kittens = await screen.findByRole('button', { name: 'Kittens' })
    await userEvent.click(kittens)

    expect(screen.getByRole('button', { name: 'Start' })).toBeDisabled()
    expect(screen.getByText(UI_STRINGS.en.practice.emptyFilter)).toBeInTheDocument()
  })
})
