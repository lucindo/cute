import '@testing-library/jest-dom/vitest'

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { IconButton } from './IconButton'

describe('IconButton', () => {
  it('exposes its label as the accessible name', () => {
    render(<IconButton icon={<svg />} label="Settings" />)
    expect(screen.getByRole('button', { name: 'Settings' })).toBeInTheDocument()
  })

  it('fires onClick when pressed', async () => {
    const onClick = vi.fn()
    render(<IconButton icon={<svg />} label="Settings" onClick={onClick} />)
    await userEvent.click(screen.getByRole('button', { name: 'Settings' }))
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('does not fire onClick while disabled', async () => {
    const onClick = vi.fn()
    render(<IconButton icon={<svg />} label="Settings" onClick={onClick} disabled />)
    await userEvent.click(screen.getByRole('button', { name: 'Settings' }))
    expect(onClick).not.toHaveBeenCalled()
  })
})
