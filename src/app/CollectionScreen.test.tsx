import '@testing-library/jest-dom/vitest'

import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { CollectionScreen } from './CollectionScreen'
import { UI_STRINGS } from '../content/strings'
import { COLLECTION_CHANGED_EVENT } from '../hooks/useCollection'
import { UiStringsProvider } from '../hooks/useUiStringsContext'
import { getRecord, openDb, writeMany, type SourceRecord, type WriteOp } from '../storage'

async function openDbOrThrow(): Promise<IDBDatabase> {
  const opened = await openDb()
  if (!opened.ok) throw new Error('openDb failed')
  return opened.value
}

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

describe('CollectionScreen delete & storage', () => {
  const DELETE_LABEL = UI_STRINGS.en.collection.deleteLabel

  async function openDeleteDialog(): Promise<HTMLElement> {
    await userEvent.click(await screen.findByRole('button', { name: DELETE_LABEL }))
    return screen.getByRole('dialog')
  }

  it('shows per-source file size', async () => {
    await seed([source({ id: 's1', caption: 'One', bytes: 2_400_000 })])
    renderScreen()
    expect(await screen.findByText('2.4 MB')).toBeInTheDocument()
  })

  it('shows the storage gauge when an estimate is available', async () => {
    Object.defineProperty(navigator, 'storage', {
      value: { estimate: () => Promise.resolve({ usage: 1_000_000, quota: 2_000_000_000 }) },
      configurable: true,
    })
    renderScreen()
    expect(
      await screen.findByText(UI_STRINGS.en.collection.storageGauge('1.0 MB', '2.0 GB')),
    ).toBeInTheDocument()
    Reflect.deleteProperty(navigator, 'storage')
  })

  it('keeps the source when deletion is cancelled', async () => {
    await seed([source({ id: 's1', caption: 'One' })])
    renderScreen()

    const dialog = await openDeleteDialog()
    await userEvent.click(within(dialog).getByRole('button', { name: UI_STRINGS.en.collection.deleteCancel }))

    expect(screen.getByAltText('One')).toBeInTheDocument()
    const stored = await getRecord(await openDbOrThrow(), 'thumbs', 's1')
    expect(stored.ok && stored.value !== null).toBe(true)
  })

  it('tombstones the source on confirm and refreshes the grid', async () => {
    await seed([source({ id: 's1', caption: 'One' })])
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

describe('CollectionScreen import', () => {
  const IMPORT_LABEL = UI_STRINGS.en.collection.importButton
  // The decode fake rejects this fixture type to simulate an undecodable file.
  const BROKEN_TYPE = 'image/heic'

  function makeImageFile(name: string, type = 'image/jpeg'): File {
    return new File(['x'], name, { type })
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

    await userEvent.upload(screen.getByLabelText(IMPORT_LABEL), [makeImageFile('a.jpg')])

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
    renderScreen()
    await screen.findByText(EMPTY_TEXT)

    await userEvent.upload(screen.getByLabelText(IMPORT_LABEL), [makeImageFile('slow.jpg')])
    const busyButton = await screen.findByRole('button', { name: UI_STRINGS.en.collection.importing })
    expect(busyButton).toBeDisabled()

    act(() => {
      release?.({ width: 10, height: 10, close: () => {} })
    })
    expect(await screen.findByRole('button', { name: IMPORT_LABEL })).toBeEnabled()
    expect(await screen.findAllByRole('listitem')).toHaveLength(1)
  })
})
