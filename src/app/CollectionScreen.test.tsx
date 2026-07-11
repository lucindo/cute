import '@testing-library/jest-dom/vitest'

import { act, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { CollectionScreen } from './CollectionScreen'
import { UI_STRINGS } from '../content/strings'
import { COLLECTION_CHANGED_EVENT } from '../hooks/useCollection'
import { UiStringsProvider } from '../hooks/useUiStringsContext'
import { openDb, writeMany, type SourceRecord, type WriteOp } from '../storage'

const EMPTY_TEXT = UI_STRINGS.en.collection.empty
const ERROR_TEXT = UI_STRINGS.en.collection.loadError

function renderScreen(): ReturnType<typeof render> {
  return render(
    <UiStringsProvider value={UI_STRINGS.en}>
      <CollectionScreen />
    </UiStringsProvider>,
  )
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

// Seeds through the same global fake-IndexedDB the screen opens by default.
async function seed(records: SourceRecord[]): Promise<void> {
  const opened = await openDb()
  if (!opened.ok) throw new Error('seed: openDb failed')
  const ops: WriteOp[] = []
  for (const record of records) {
    ops.push({ op: 'put', store: 'sources', record })
    if (!record.deleted) {
      ops.push({ op: 'put', store: 'thumbs', record: { id: record.id, blob: new Blob(['t']) } })
    }
  }
  const written = await writeMany(opened.value, ops)
  opened.value.close()
  if (!written.ok) throw new Error('seed: write failed')
}

describe('CollectionScreen', () => {
  it('shows the empty-state guidance when there are no sources', async () => {
    renderScreen()
    expect(await screen.findByText(EMPTY_TEXT)).toBeInTheDocument()
  })

  it('renders live thumbnails newest-first and skips tombstones', async () => {
    await seed([
      source({ id: 'old', caption: 'Old', createdAt: 100 }),
      source({ id: 'new', caption: 'New', createdAt: 200 }),
      source({ id: 'gone', caption: 'Gone', createdAt: 300, deleted: true }),
    ])
    renderScreen()

    expect(await screen.findAllByRole('listitem')).toHaveLength(2)
    const alts = screen.getAllByRole('img').map((img) => img.getAttribute('alt'))
    expect(alts).toEqual(['New', 'Old'])
    expect(screen.queryByAltText('Gone')).not.toBeInTheDocument()
  })

  it('shows the load error when IndexedDB is unavailable', async () => {
    Object.defineProperty(globalThis, 'indexedDB', {
      value: undefined,
      configurable: true,
      writable: true,
    })
    renderScreen()
    expect(await screen.findByText(ERROR_TEXT)).toBeInTheDocument()
  })

  it('picks up newly imported sources on the change event', async () => {
    renderScreen()
    await screen.findByText(EMPTY_TEXT)

    await seed([source({ id: 'n1', caption: 'Fresh', createdAt: 10 })])
    act(() => {
      window.dispatchEvent(new Event(COLLECTION_CHANGED_EVENT))
    })

    expect(await screen.findByAltText('Fresh')).toBeInTheDocument()
  })

  it('revokes thumbnail object URLs on unmount', async () => {
    await seed([source({ id: 's1', caption: 'One' })])
    const created = vi.spyOn(URL, 'createObjectURL')
    const revoked = vi.spyOn(URL, 'revokeObjectURL')

    const { unmount } = renderScreen()
    await screen.findByAltText('One')
    unmount()

    expect(created).toHaveBeenCalledTimes(1)
    const url: unknown = created.mock.results[0]?.value
    expect(revoked).toHaveBeenCalledWith(url)
    created.mockRestore()
    revoked.mockRestore()
  })
})
