import '@testing-library/jest-dom/vitest'

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState, type ReactElement } from 'react'
import { describe, expect, it } from 'vitest'

import { TagFilter } from './TagFilter'
import { UI_STRINGS } from '../content/strings'
import { UiStringsProvider } from '../hooks/useUiStringsContext'
import type { TagRecord } from '../storage'

const TAGS: TagRecord[] = [
  { id: 't-zebra', name: 'Zebra' },
  { id: 't-apple', name: 'Apple' },
]

// Controlled harness mirroring PracticeScreen's session-local state.
function Harness(): ReactElement {
  const [selected, setSelected] = useState<string[]>([])
  return (
    <UiStringsProvider value={UI_STRINGS.en}>
      <TagFilter
        tags={TAGS}
        selected={selected}
        onToggle={(id) => {
          setSelected((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
          )
        }}
      />
    </UiStringsProvider>
  )
}

describe('TagFilter', () => {
  it('renders a chip per tag, sorted by display name', () => {
    render(<Harness />)
    const chips = screen.getAllByRole('button')
    expect(chips.map((c) => c.textContent)).toEqual(['Apple', 'Zebra'])
  })

  it('shows the all-sources hint only when nothing is selected', async () => {
    render(<Harness />)
    expect(screen.getByText('All sources')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Apple' }))
    expect(screen.queryByText('All sources')).not.toBeInTheDocument()
  })

  it('toggles a chip on and back off', async () => {
    render(<Harness />)
    const apple = screen.getByRole('button', { name: 'Apple' })
    expect(apple).toHaveAttribute('aria-pressed', 'false')

    await userEvent.click(apple)
    expect(apple).toHaveAttribute('aria-pressed', 'true')

    await userEvent.click(apple)
    expect(apple).toHaveAttribute('aria-pressed', 'false')
  })
})
