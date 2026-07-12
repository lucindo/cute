import '@testing-library/jest-dom/vitest'

import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { SettingsRow } from './SettingsRow'

describe('SettingsRow', () => {
  it('renders the label and children inside a labelled group', () => {
    render(
      <SettingsRow label="Duration" ariaLabel="Duration setting">
        <span>5 min</span>
      </SettingsRow>,
    )
    const group = screen.getByRole('group', { name: 'Duration setting' })
    expect(group).toHaveTextContent('Duration')
    expect(group).toHaveTextContent('5 min')
  })

  it('drops the top border when noBorder is set', () => {
    const { rerender } = render(
      <SettingsRow label="A" ariaLabel="A">
        <span>x</span>
      </SettingsRow>,
    )
    expect(screen.getByRole('group')).toHaveClass('border-t')

    rerender(
      <SettingsRow label="A" ariaLabel="A" noBorder>
        <span>x</span>
      </SettingsRow>,
    )
    expect(screen.getByRole('group')).not.toHaveClass('border-t')
  })
})
