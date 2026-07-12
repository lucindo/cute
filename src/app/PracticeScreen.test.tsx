import '@testing-library/jest-dom/vitest'

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { PracticeScreen } from './PracticeScreen'
import { UI_STRINGS } from '../content/strings'
import { UiStringsProvider } from '../hooks/useUiStringsContext'
import { loadPrefs, savePrefs } from '../storage'

function renderPractice() {
  return render(
    <UiStringsProvider value={UI_STRINGS.en}>
      <PracticeScreen />
    </UiStringsProvider>,
  )
}

describe('PracticeScreen duration', () => {
  it('defaults to 5 min', () => {
    renderPractice()
    expect(screen.getByText('5 min')).toBeInTheDocument()
  })

  it('seeds from the last-used pref', () => {
    savePrefs({ locale: 'en', sessionDurationMin: 12 })
    renderPractice()
    expect(screen.getByText('12 min')).toBeInTheDocument()
  })

  it('persists a change as the new last-used duration', async () => {
    renderPractice()
    await userEvent.click(screen.getByRole('button', { name: 'Increase Duration' }))
    expect(screen.getByText('6 min')).toBeInTheDocument()
    expect(loadPrefs().sessionDurationMin).toBe(6)
  })
})
