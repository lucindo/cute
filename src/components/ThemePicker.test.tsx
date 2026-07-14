import '@testing-library/jest-dom/vitest'

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { ThemePicker } from './ThemePicker'
import { UI_STRINGS } from '../content/strings'
import { loadPrefs, PREFS_CHANGED_EVENT, STATE_KEY } from '../storage'

const THEME = UI_STRINGS.en.settings.theme

function seedTheme(theme: string): void {
  window.localStorage.setItem(STATE_KEY, JSON.stringify({ version: 1, prefs: { theme } }))
}

describe('ThemePicker', () => {
  it('renders the three options and reflects the stored theme', () => {
    seedTheme('dark')
    render(<ThemePicker label={THEME.label} optionLabels={THEME.options} />)

    const radios = screen.getAllByRole('radio')
    expect(radios.map((r) => r.textContent)).toEqual(['Light', 'Dark', 'System'])
    expect(screen.getByRole('radio', { name: 'Dark' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('radio', { name: 'Light' })).toHaveAttribute('aria-checked', 'false')
  })

  it('persists the choice and dispatches the prefs-changed event on click', async () => {
    seedTheme('light')
    const events: CustomEvent[] = []
    const onChange = (e: Event): void => {
      if (e instanceof CustomEvent) events.push(e)
    }
    window.addEventListener(PREFS_CHANGED_EVENT, onChange)

    render(<ThemePicker label={THEME.label} optionLabels={THEME.options} />)
    await userEvent.click(screen.getByRole('radio', { name: 'System' }))

    window.removeEventListener(PREFS_CHANGED_EVENT, onChange)
    expect(loadPrefs().theme).toBe('system')
    expect(events).toHaveLength(1)
    expect(events[0]?.detail).toEqual({ key: 'theme', value: 'system' })
  })

  it('preserves other prefs when the theme is written', async () => {
    window.localStorage.setItem(
      STATE_KEY,
      JSON.stringify({ version: 1, prefs: { theme: 'light', locale: 'pt-BR' } }),
    )
    render(<ThemePicker label={THEME.label} optionLabels={THEME.options} />)
    await userEvent.click(screen.getByRole('radio', { name: 'Dark' }))
    expect(loadPrefs()).toMatchObject({ theme: 'dark', locale: 'pt-BR' })
  })
})
