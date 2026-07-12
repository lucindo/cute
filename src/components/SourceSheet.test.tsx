import '@testing-library/jest-dom/vitest'

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { SourceSheet } from './SourceSheet'
import { UI_STRINGS } from '../content/strings'
import type { CollectionSource } from '../hooks/useCollection'
import { UiStringsProvider } from '../hooks/useUiStringsContext'

const CAPTION_LABEL = UI_STRINGS.en.collection.caption

function source(overrides: Partial<CollectionSource> = {}): CollectionSource {
  return {
    id: 's1',
    type: 'image',
    mimeType: 'image/webp',
    bytes: 3,
    createdAt: 1,
    tags: [],
    caption: 'Cutie',
    deleted: false,
    thumbUrl: null,
    ...overrides,
  }
}

function renderSheet(onSaveCaption = vi.fn()): { onSaveCaption: ReturnType<typeof vi.fn> } {
  render(
    <UiStringsProvider value={UI_STRINGS.en}>
      <SourceSheet
        source={source()}
        tags={[]}
        onToggleTag={vi.fn()}
        onCreateTag={vi.fn()}
        onSaveCaption={onSaveCaption}
        onRequestDelete={vi.fn()}
        onClose={vi.fn()}
      />
    </UiStringsProvider>,
  )
  return { onSaveCaption }
}

describe('SourceSheet caption', () => {
  it('shows the current caption', () => {
    renderSheet()
    expect(screen.getByLabelText(CAPTION_LABEL)).toHaveValue('Cutie')
  })

  it('saves an edited caption on blur', async () => {
    const user = userEvent.setup()
    const { onSaveCaption } = renderSheet()

    const input = screen.getByLabelText(CAPTION_LABEL)
    await user.clear(input)
    await user.type(input, 'Sleepy pup')
    await user.tab()

    expect(onSaveCaption).toHaveBeenCalledExactlyOnceWith('s1', 'Sleepy pup')
  })

  it('does not save when the caption is unchanged', async () => {
    const user = userEvent.setup()
    const { onSaveCaption } = renderSheet()

    await user.click(screen.getByLabelText(CAPTION_LABEL))
    await user.tab()

    expect(onSaveCaption).not.toHaveBeenCalled()
  })
})
