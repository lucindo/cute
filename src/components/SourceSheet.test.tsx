import '@testing-library/jest-dom/vitest'

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { SourceSheet } from './SourceSheet'
import { UI_STRINGS } from '../content/strings'
import type { CollectionSource } from '../hooks/useCollection'
import { UiStringsProvider } from '../hooks/useUiStringsContext'
import type { TagRecord } from '../storage'

const S = UI_STRINGS.en.collection

function source(overrides: Partial<CollectionSource> = {}): CollectionSource {
  return {
    id: 's1',
    type: 'image',
    mimeType: 'image/webp',
    bytes: 3,
    createdAt: 1,
    tags: [],
    deleted: false,
    thumbUrl: null,
    holdCount: 0,
    totalHeldMs: 0,
    ...overrides,
  }
}

function renderSheet(opts: { src?: CollectionSource; tags?: TagRecord[]; newTagId?: string } = {}) {
  const onCreateTag = vi
    .fn<(name: string) => Promise<string | null>>()
    .mockResolvedValue(opts.newTagId ?? 't-new')
  const onSave = vi.fn<(id: string, edits: { tags: string[] }) => void>()
  const onRequestDelete = vi.fn<(id: string) => void>()
  const onClose = vi.fn<() => void>()
  render(
    <UiStringsProvider value={UI_STRINGS.en}>
      <SourceSheet
        source={opts.src ?? source()}
        tags={opts.tags ?? []}
        onCreateTag={onCreateTag}
        onSave={onSave}
        onRequestDelete={onRequestDelete}
        onClose={onClose}
      />
    </UiStringsProvider>,
  )
  return { onCreateTag, onSave, onRequestDelete, onClose }
}

const saveButton = (): HTMLElement => screen.getByRole('button', { name: S.save })
const closeButton = (): HTMLElement => screen.getByRole('button', { name: S.close })

describe('SourceSheet', () => {
  it('disables Save until an edit is made', () => {
    renderSheet()
    expect(saveButton()).toBeDisabled()
  })

  it('stages a tag toggle without writing until Save, then commits and closes', async () => {
    const user = userEvent.setup()
    const tags: TagRecord[] = [{ id: 't1', name: 'Kittens' }]
    const { onSave, onClose } = renderSheet({ tags })

    await user.click(screen.getByRole('button', { name: 'Kittens' }))
    expect(saveButton()).toBeEnabled()

    await user.click(saveButton())
    expect(onSave).toHaveBeenCalledExactlyOnceWith('s1', { tags: ['t1'] })
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('creates a new tag and stages its assignment', async () => {
    const user = userEvent.setup()
    const { onCreateTag } = renderSheet({ newTagId: 't-new' })

    await user.type(screen.getByLabelText(UI_STRINGS.en.tags.newTagPlaceholder), 'Ducklings')
    await user.click(screen.getByRole('button', { name: UI_STRINGS.en.tags.add }))

    expect(onCreateTag).toHaveBeenCalledExactlyOnceWith('Ducklings')
    // Resolving the id stages the assignment, which makes the draft dirty.
    expect(await screen.findByRole('button', { name: S.save })).toBeEnabled()
  })

  it('closes immediately when there are no changes', async () => {
    const user = userEvent.setup()
    const { onClose } = renderSheet()

    await user.click(closeButton())
    expect(onClose).toHaveBeenCalledOnce()
    expect(screen.queryByRole('dialog', { name: S.discardTitle })).not.toBeInTheDocument()
  })

  it('asks to confirm when closing with unsaved changes, and discards', async () => {
    const user = userEvent.setup()
    const tags: TagRecord[] = [{ id: 't1', name: 'Kittens' }]
    const { onClose } = renderSheet({ tags })

    await user.click(screen.getByRole('button', { name: 'Kittens' }))
    await user.click(closeButton())
    expect(onClose).not.toHaveBeenCalled()
    expect(screen.getByRole('dialog', { name: S.discardTitle })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: S.discardConfirm }))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('keeps editing when the discard prompt is dismissed', async () => {
    const user = userEvent.setup()
    const tags: TagRecord[] = [{ id: 't1', name: 'Kittens' }]
    const { onClose } = renderSheet({ tags })

    await user.click(screen.getByRole('button', { name: 'Kittens' }))
    await user.click(closeButton())
    await user.click(screen.getByRole('button', { name: S.discardCancel }))

    expect(onClose).not.toHaveBeenCalled()
    expect(saveButton()).toBeEnabled()
  })
})
