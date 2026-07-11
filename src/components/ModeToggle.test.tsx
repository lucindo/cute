import '@testing-library/jest-dom/vitest'

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { ModeToggle } from './ModeToggle'

const STRINGS = {
  label: 'App mode',
  modeNames: { practice: 'Practice', collection: 'Collection' },
}

describe('ModeToggle', () => {
  it('marks the active mode with aria-pressed', () => {
    render(<ModeToggle active="practice" onSwitch={() => {}} strings={STRINGS} />)
    expect(screen.getByRole('button', { name: 'Practice' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Collection' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('calls onSwitch with the clicked mode', async () => {
    const onSwitch = vi.fn()
    render(<ModeToggle active="practice" onSwitch={onSwitch} strings={STRINGS} />)
    await userEvent.click(screen.getByRole('button', { name: 'Collection' }))
    expect(onSwitch).toHaveBeenCalledWith('collection')
  })

  it('exposes the group label', () => {
    render(<ModeToggle active="collection" onSwitch={() => {}} strings={STRINGS} />)
    expect(screen.getByRole('group', { name: 'App mode' })).toBeInTheDocument()
  })
})
