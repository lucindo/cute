import '@testing-library/jest-dom/vitest'

import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { CollectionScreen } from './CollectionScreen'
import { UI_STRINGS, type UiStrings } from '../content/strings'
import { COLLECTION_CHANGED_EVENT } from '../hooks/useCollection'
import { UiStringsProvider } from '../hooks/useUiStringsContext'
import { getAllRecords, getRecord, openDb, writeMany, type SourceRecord, type WriteOp } from '../storage'

async function openDbOrThrow(): Promise<IDBDatabase> {
  const opened = await openDb()
  if (!opened.ok) throw new Error('openDb failed')
  return opened.value
}

const EMPTY_TEXT = UI_STRINGS.en.collection.empty
const ERROR_TEXT = UI_STRINGS.en.collection.loadError
// Tiles carry no caption now, so they share one accessible name.
const OPEN = UI_STRINGS.en.collection.openItem

function renderScreen(
  strings: UiStrings = UI_STRINGS.en,
  onOpenTags: () => void = () => {},
): ReturnType<typeof render> {
  return render(
    <UiStringsProvider value={strings}>
      <CollectionScreen onOpenTags={onOpenTags} />
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
      ops.push({
        op: 'put',
        store: 'thumbs',
        record: { id: record.id, type: 'image/webp', bytes: new ArrayBuffer(1) },
      })
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
    const C = UI_STRINGS.en.collection
    // Distinct held times give each tile an identifiable stat line; the older
    // tile holds longer, so order proves createdAt sorting, not held time.
    await seed([
      source({ id: 'old', createdAt: 100 }),
      source({ id: 'new', createdAt: 200 }),
      source({ id: 'gone', createdAt: 300, deleted: true }),
    ])
    const db = await openDbOrThrow()
    const holds: WriteOp[] = [
      { op: 'put', store: 'holdEvents', record: { id: 'h1', sessionId: 's', sourceId: 'old', startedAt: 0, durationMs: 5000 } },
      { op: 'put', store: 'holdEvents', record: { id: 'h2', sessionId: 's', sourceId: 'new', startedAt: 0, durationMs: 1000 } },
    ]
    if (!(await writeMany(db, holds)).ok) throw new Error('seed holds failed')
    db.close()
    renderScreen()

    const items = await screen.findAllByRole('listitem')
    expect(items).toHaveLength(2) // tombstone excluded
    expect(items.map((li) => li.textContent)).toEqual([
      C.holdStat(1, '0:01'), // 'new' (createdAt 200)
      C.holdStat(1, '0:05'), // 'old' (createdAt 100)
    ])
  })

  it('sorts by aww factor and shows per-card hold stats', async () => {
    // A is newer; B is older but has more lifetime held time.
    await seed([
      source({ id: 'a', createdAt: 200 }),
      source({ id: 'b', createdAt: 100 }),
    ])
    const db = await openDbOrThrow()
    const holds: WriteOp[] = [
      { op: 'put', store: 'holdEvents', record: { id: 'h1', sessionId: 's', sourceId: 'a', startedAt: 0, durationMs: 1000 } },
      { op: 'put', store: 'holdEvents', record: { id: 'h2', sessionId: 's', sourceId: 'b', startedAt: 0, durationMs: 5000 } },
    ]
    if (!(await writeMany(db, holds)).ok) throw new Error('seed holds failed')
    db.close()

    const C = UI_STRINGS.en.collection
    renderScreen()

    // Default (Recent): newest-first → A (0:01) then B (0:05).
    await waitFor(() => {
      expect(screen.getAllByRole('listitem')).toHaveLength(2)
    })
    expect(screen.getAllByRole('listitem').map((li) => li.textContent)).toEqual([
      C.holdStat(1, '0:01'),
      C.holdStat(1, '0:05'),
    ])

    // Aww: B (5s held) outranks A (1s).
    await userEvent.click(screen.getByRole('radio', { name: C.sortAww }))
    expect(screen.getAllByRole('listitem').map((li) => li.textContent)).toEqual([
      C.holdStat(1, '0:05'),
      C.holdStat(1, '0:01'),
    ])
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

    await seed([source({ id: 'n1', createdAt: 10 })])
    act(() => {
      window.dispatchEvent(new Event(COLLECTION_CHANGED_EVENT))
    })

    expect(await screen.findByRole('button', { name: OPEN })).toBeInTheDocument()
  })

  it('revokes thumbnail object URLs on unmount', async () => {
    await seed([source({ id: 's1' })])
    const created = vi.spyOn(URL, 'createObjectURL')
    const revoked = vi.spyOn(URL, 'revokeObjectURL')

    const { unmount } = renderScreen()
    await screen.findByRole('button', { name: OPEN })
    unmount()

    expect(created).toHaveBeenCalledTimes(1)
    const url: unknown = created.mock.results[0]?.value
    expect(revoked).toHaveBeenCalledWith(url)
    created.mockRestore()
    revoked.mockRestore()
  })
})

describe('CollectionScreen delete & storage', () => {
  const DELETE_LABEL = UI_STRINGS.en.collection.deleteLabel

  // The delete flow lives in the item sheet: tap the tile, then Delete.
  async function openDeleteDialog(): Promise<HTMLElement> {
    await userEvent.click(await screen.findByRole('button', { name: OPEN }))
    await userEvent.click(screen.getByRole('button', { name: DELETE_LABEL }))
    return screen.getByRole('dialog', { name: UI_STRINGS.en.collection.deleteTitle })
  }

  it('shows the file size in the item sheet', async () => {
    await seed([source({ id: 's1', bytes: 2_400_000 })])
    renderScreen()
    await userEvent.click(await screen.findByRole('button', { name: OPEN }))
    expect(await screen.findByText('2.4 MB')).toBeInTheDocument()
  })

  it('sums usage from records and shows quota when available', async () => {
    Object.defineProperty(navigator, 'storage', {
      value: { estimate: () => Promise.resolve({ quota: 2_000_000_000 }) },
      configurable: true,
    })
    // 2_400_000 source bytes + the 1-byte seeded thumb.
    await seed([source({ id: 's1', bytes: 2_400_000 })])
    renderScreen()
    expect(
      await screen.findByText(UI_STRINGS.en.collection.storageGauge('2.4 MB', '2.0 GB')),
    ).toBeInTheDocument()
    Reflect.deleteProperty(navigator, 'storage')
  })

  it('shows usage alone when no quota estimate exists', async () => {
    await seed([source({ id: 's1', bytes: 2_400_000 })])
    renderScreen()
    expect(await screen.findByText(UI_STRINGS.en.collection.storageUsed('2.4 MB'))).toBeInTheDocument()
  })

  it('keeps the source when deletion is cancelled', async () => {
    await seed([source({ id: 's1' })])
    renderScreen()

    const dialog = await openDeleteDialog()
    await userEvent.click(within(dialog).getByRole('button', { name: UI_STRINGS.en.collection.deleteCancel }))

    // The item sheet stays open; the source was not deleted.
    expect(screen.getByRole('dialog', { name: OPEN })).toBeInTheDocument()
    const stored = await getRecord(await openDbOrThrow(), 'thumbs', 's1')
    expect(stored.ok && stored.value !== null).toBe(true)
  })

  it('tombstones the source on confirm and refreshes the grid', async () => {
    await seed([source({ id: 's1' })])
    renderScreen()

    const dialog = await openDeleteDialog()
    await userEvent.click(within(dialog).getByRole('button', { name: UI_STRINGS.en.collection.deleteConfirm }))

    expect(await screen.findByText(EMPTY_TEXT)).toBeInTheDocument()
    const db = await openDbOrThrow()
    const stored = await getRecord(db, 'sources', 's1')
    if (!stored.ok || stored.value === null) throw new Error('expected the tombstone')
    expect(stored.value.deleted).toBe(true)
    await expect(getRecord(db, 'thumbs', 's1')).resolves.toEqual({ ok: true, value: null })
  })
})

describe('CollectionScreen item sheet', () => {
  it('opens on tile tap with preview, size, and tag chips', async () => {
    await seed([source({ id: 'a', bytes: 1_200_000, tags: ['seed:babies'] })])
    renderScreen()

    await userEvent.click(await screen.findByRole('button', { name: OPEN }))

    const sheet = screen.getByRole('dialog', { name: OPEN })
    expect(sheet.querySelector('img')).toBeInTheDocument()
    expect(within(sheet).getByText('1.2 MB')).toBeInTheDocument()
    expect(within(sheet).getByRole('button', { name: 'Babies' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('stages a tag toggle and persists it on Save', async () => {
    await seed([source({ id: 'a' })])
    renderScreen()
    await userEvent.click(await screen.findByRole('button', { name: OPEN }))

    await userEvent.click(await screen.findByRole('button', { name: 'Kittens' }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Kittens' })).toHaveAttribute('aria-pressed', 'true')
    })

    // Staged only — nothing written until Save.
    const staged = await getRecord(await openDbOrThrow(), 'sources', 'a')
    if (!staged.ok || staged.value === null) throw new Error('expected the source')
    expect(staged.value.tags).toEqual([])

    await userEvent.click(screen.getByRole('button', { name: UI_STRINGS.en.collection.save }))

    await waitFor(async () => {
      const stored = await getRecord(await openDbOrThrow(), 'sources', 'a')
      if (!stored.ok || stored.value === null) throw new Error('expected the source')
      expect(stored.value.tags).toEqual(['seed:kittens'])
    })
  })

  it('closes on the close button', async () => {
    await seed([source({ id: 'a' })])
    renderScreen()
    await userEvent.click(await screen.findByRole('button', { name: OPEN }))

    await userEvent.click(screen.getByRole('button', { name: UI_STRINGS.en.collection.close }))

    expect(screen.queryByRole('dialog', { name: OPEN })).not.toBeInTheDocument()
  })
})

describe('CollectionScreen tags', () => {
  const T = UI_STRINGS.en.tags

  it('creates a tag from the item sheet and assigns it on Save', async () => {
    await seed([source({ id: 'a' })])
    renderScreen()
    await userEvent.click(await screen.findByRole('button', { name: OPEN }))

    await userEvent.type(await screen.findByLabelText(T.newTagPlaceholder), 'Sunset')
    await userEvent.click(screen.getByRole('button', { name: T.add }))

    // Created and staged: the new tag shows as a pressed chip on the item.
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Sunset' })).toHaveAttribute('aria-pressed', 'true')
    })

    await userEvent.click(screen.getByRole('button', { name: UI_STRINGS.en.collection.save }))

    await waitFor(async () => {
      const db = await openDbOrThrow()
      const tags = await getAllRecords(db, 'tags')
      if (!tags.ok) throw new Error('expected ok')
      const sunset = tags.value.find((t) => t.name === 'Sunset')
      if (sunset === undefined) throw new Error('expected the created tag')
      const stored = await getRecord(db, 'sources', 'a')
      if (!stored.ok || stored.value === null) throw new Error('expected the source')
      expect(stored.value.tags).toEqual([sunset.id])
    })
  })

  it('navigates to the tags page from the edit-tags button', async () => {
    // The edit-tags icon lives in the populated-collection toolbar.
    await seed([source({ id: 'a' })])
    const onOpenTags = vi.fn()
    renderScreen(UI_STRINGS.en, onOpenTags)

    await userEvent.click(await screen.findByRole('button', { name: T.edit }))
    expect(onOpenTags).toHaveBeenCalledTimes(1)
  })
})

describe('CollectionScreen import', () => {
  const IMPORT_LABEL = UI_STRINGS.en.collection.importButton
  // The decode fake rejects this fixture type to simulate an undecodable file.
  const BROKEN_TYPE = 'image/heic'

  function makeImageFile(name: string, type = 'image/jpeg'): File {
    return new File(['x'], name, { type })
  }

  // The file input is sr-only and unlabeled (the + button carries the label),
  // so target it by tag — the screen renders exactly one input.
  function fileInput(container: HTMLElement): HTMLInputElement {
    const input = container.querySelector('input')
    if (input === null) throw new Error('expected the file input')
    return input
  }

  // A list item whose full text matches — rejection lines render as split
  // text nodes (name — hint), which the default text matcher can't see.
  function findRejectionLine(expected: string): Promise<HTMLElement> {
    return screen.findByText(
      (_content, element) => element !== null && element.tagName === 'LI' && element.textContent === expected,
    )
  }

  function pasteFiles(files: File[]): void {
    const event = new Event('paste', { bubbles: true, cancelable: true })
    Object.defineProperty(event, 'clipboardData', { value: { files } })
    window.dispatchEvent(event)
  }

  beforeEach(() => {
    vi.stubGlobal('createImageBitmap', (blob: Blob) =>
      blob.type === BROKEN_TYPE
        ? Promise.reject(new Error('cannot decode'))
        // Reason: only width/height/close are consumed by the pipeline; jsdom
        // cannot construct a real ImageBitmap.
        : Promise.resolve({ width: 800, height: 600, close: () => {} } as unknown as ImageBitmap),
    )
    // Reason: jsdom's canvas needs the native canvas package; the pipeline
    // needs a working 2d surface and encoder, not real pixels.
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
      { imageSmoothingQuality: 'low', drawImage: () => {} } as unknown as CanvasRenderingContext2D,
    )
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(
      function (this: HTMLCanvasElement, callback: BlobCallback, type?: string) {
        callback(new Blob(['enc'], { type: type ?? 'image/png' }))
      },
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('imports picked files into the grid', async () => {
    const { container } = renderScreen()
    await screen.findByText(EMPTY_TEXT)

    await userEvent.upload(fileInput(container), [makeImageFile('a.jpg')])

    await waitFor(() => {
      expect(container.querySelectorAll('img')).toHaveLength(1)
    })
    expect(screen.queryByText(EMPTY_TEXT)).not.toBeInTheDocument()
  })

  it('imports dropped files and lists per-file rejection hints', async () => {
    const { container } = renderScreen()
    await screen.findByText(EMPTY_TEXT)

    const dropZone = container.firstElementChild
    if (dropZone === null) throw new Error('expected the drop zone')
    fireEvent.drop(dropZone, {
      dataTransfer: {
        files: [
          makeImageFile('good.jpg'),
          makeImageFile('notes.pdf', 'application/pdf'),
          makeImageFile('broken.heic', BROKEN_TYPE),
        ],
      },
    })

    await findRejectionLine(`notes.pdf — ${UI_STRINGS.en.collection.rejection.unsupportedType}`)
    await findRejectionLine(`broken.heic — ${UI_STRINGS.en.collection.rejection.undecodable}`)
    await waitFor(() => {
      expect(container.querySelectorAll('img')).toHaveLength(1)
    })
  })

  it('imports pasted files', async () => {
    const { container } = renderScreen()
    await screen.findByText(EMPTY_TEXT)

    act(() => {
      pasteFiles([makeImageFile('pasted.png', 'image/png')])
    })

    await waitFor(() => {
      expect(container.querySelectorAll('img')).toHaveLength(1)
    })
  })

  it('disables the import button while a batch is processing', async () => {
    let release: ((bitmap: ImageBitmap) => void) | undefined
    vi.stubGlobal('createImageBitmap', () => new Promise<ImageBitmap>((resolve) => { release = resolve }))
    const { container } = renderScreen()
    await screen.findByText(EMPTY_TEXT)

    await userEvent.upload(fileInput(container), [makeImageFile('slow.jpg')])
    const busyButton = await screen.findByRole('button', { name: UI_STRINGS.en.collection.importing })
    expect(busyButton).toBeDisabled()

    act(() => {
      release?.({ width: 10, height: 10, close: () => {} })
    })
    expect(await screen.findByRole('button', { name: IMPORT_LABEL })).toBeEnabled()
    expect(await screen.findAllByRole('listitem')).toHaveLength(1)
  })
})
