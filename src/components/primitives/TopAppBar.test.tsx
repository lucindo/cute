import '@testing-library/jest-dom/vitest'

import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { TopAppBar } from './TopAppBar'

describe('TopAppBar', () => {
  it('renders the title as the page heading', () => {
    render(<TopAppBar title="Cute Baby Meditation" />)
    expect(screen.getByRole('heading', { name: 'Cute Baby Meditation' })).toBeInTheDocument()
  })

  it('renders leading and trailing slots when provided', () => {
    render(
      <TopAppBar
        title="X"
        leading={<button type="button">Settings</button>}
        trailing={<button type="button">Info</button>}
      />,
    )
    expect(screen.getByRole('button', { name: 'Settings' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Info' })).toBeInTheDocument()
  })
})
