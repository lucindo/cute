import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { Toggle } from './Toggle'

describe('Toggle', () => {
  it('renders as a switch with the provided aria-label', () => {
    render(<Toggle checked={false} onChange={vi.fn()} label="Video sound" />)
    expect(screen.getByRole('switch', { name: 'Video sound' })).toBeInTheDocument()
  })

  it('exposes aria-checked reflecting the checked prop', () => {
    const { rerender } = render(<Toggle checked onChange={vi.fn()} label="Video sound" />)
    expect(screen.getByRole('switch', { name: 'Video sound' })).toHaveAttribute(
      'aria-checked',
      'true',
    )
    rerender(<Toggle checked={false} onChange={vi.fn()} label="Video sound" />)
    expect(screen.getByRole('switch', { name: 'Video sound' })).toHaveAttribute(
      'aria-checked',
      'false',
    )
  })

  it('fires onChange with the next value when clicked', () => {
    const onChange = vi.fn()
    render(<Toggle checked={false} onChange={onChange} label="Video sound" />)
    fireEvent.click(screen.getByRole('switch', { name: 'Video sound' }))
    expect(onChange).toHaveBeenCalledWith(true)
  })

  it('does not fire onChange when disabled', () => {
    const onChange = vi.fn()
    render(<Toggle checked={false} onChange={onChange} label="Video sound" disabled />)
    fireEvent.click(screen.getByRole('switch', { name: 'Video sound' }))
    expect(onChange).not.toHaveBeenCalled()
  })
})
