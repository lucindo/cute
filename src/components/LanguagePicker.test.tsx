import '@testing-library/jest-dom/vitest'

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { LanguagePicker } from './LanguagePicker'
import { loadPrefs, PREFS_CHANGED_EVENT, STATE_KEY } from '../storage'

function seedLocale(locale: string): void {
  window.localStorage.setItem(STATE_KEY, JSON.stringify({ version: 1, prefs: { locale } }))
}

describe('LanguagePicker', () => {
  it('renders both endonyms and reflects the stored locale', () => {
    seedLocale('pt-BR')
    render(<LanguagePicker label="Language" />)

    expect(screen.getByRole('radio', { name: 'English' })).toHaveAttribute('aria-checked', 'false')
    expect(screen.getByRole('radio', { name: 'Português' })).toHaveAttribute(
      'aria-checked',
      'true',
    )
  })

  it('persists the choice and dispatches the prefs-changed event on click', async () => {
    seedLocale('en')
    const events: CustomEvent[] = []
    const onChange = (e: Event): void => {
      if (e instanceof CustomEvent) events.push(e)
    }
    window.addEventListener(PREFS_CHANGED_EVENT, onChange)

    render(<LanguagePicker label="Language" />)
    await userEvent.click(screen.getByRole('radio', { name: 'Português' }))

    window.removeEventListener(PREFS_CHANGED_EVENT, onChange)
    expect(loadPrefs().locale).toBe('pt-BR')
    expect(events[0]?.detail).toEqual({ key: 'locale', value: 'pt-BR' })
  })
})
