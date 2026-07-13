import '@testing-library/jest-dom/vitest'

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { SettingsScreen } from './SettingsScreen'
import { UI_STRINGS } from '../content/strings'
import { UiStringsProvider } from '../hooks/useUiStringsContext'

function renderSettings(onOpenStats = vi.fn()): { onOpenStats: ReturnType<typeof vi.fn> } {
  render(
    <UiStringsProvider value={UI_STRINGS.en}>
      <SettingsScreen onBack={vi.fn()} onOpenStats={onOpenStats} />
    </UiStringsProvider>,
  )
  return { onOpenStats }
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

describe('SettingsScreen — Statistics', () => {
  it('opens Stats from the Statistics row', async () => {
    const { onOpenStats } = renderSettings()
    await userEvent.click(screen.getByRole('button', { name: 'View statistics' }))
    expect(onOpenStats).toHaveBeenCalledOnce()
  })
})
