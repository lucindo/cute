import '@testing-library/jest-dom/vitest'

import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { SettingsScreen } from './SettingsScreen'
import { UI_STRINGS } from '../content/strings'
import { UiStringsProvider } from '../hooks/useUiStringsContext'

function renderSettings() {
  return render(
    <UiStringsProvider value={UI_STRINGS.en}>
      <SettingsScreen onBack={vi.fn()} />
    </UiStringsProvider>,
  )
}

describe('SettingsScreen — About', () => {
  it('links Source to the project repository', () => {
    renderSettings()
    expect(screen.getByRole('link', { name: 'Source' })).toHaveAttribute(
      'href',
      'https://github.com/lucindo/cute',
    )
  })

  it('shows a non-empty version row', () => {
    renderSettings()
    const version = screen.getByRole('group', { name: 'Version' })
    expect(version.textContent).toMatch(/\S/)
  })
})
