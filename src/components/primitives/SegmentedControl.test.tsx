import '@testing-library/jest-dom/vitest'

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { SegmentedControl } from './SegmentedControl'

const OPTIONS = [
  { id: 'practice', label: 'Practice' },
  { id: 'collection', label: 'Collection' },
] as const

describe('SegmentedControl', () => {
  it('marks the selected option with aria-checked', () => {
    render(
      <SegmentedControl options={OPTIONS} value="practice" onChange={() => {}} ariaLabel="App mode" />,
    )
    expect(screen.getByRole('radio', { name: 'Practice' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('radio', { name: 'Collection' })).toHaveAttribute('aria-checked', 'false')
  })

  it('calls onChange with the clicked option id', async () => {
    const onChange = vi.fn()
    render(
      <SegmentedControl options={OPTIONS} value="practice" onChange={onChange} ariaLabel="App mode" />,
    )
    await userEvent.click(screen.getByRole('radio', { name: 'Collection' }))
    expect(onChange).toHaveBeenCalledWith('collection')
  })

  it('exposes the group label', () => {
    render(
      <SegmentedControl options={OPTIONS} value="collection" onChange={() => {}} ariaLabel="App mode" />,
    )
    expect(screen.getByRole('radiogroup', { name: 'App mode' })).toBeInTheDocument()
  })
})
