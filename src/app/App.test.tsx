import '@testing-library/jest-dom/vitest'

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { App } from './App'
import { STATE_KEY } from '../storage'

describe('App', () => {
  it('renders the app title', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: 'Cute Baby Meditation' })).toBeInTheDocument()
  })

  it('starts in Practice mode and switches to Collection and back', async () => {
    render(<App />)
    expect(screen.getByText('The practice will live here.')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Collection' }))
    expect(
      await screen.findByText('Your collection is empty. Import photos to begin.'),
    ).toBeInTheDocument()
    expect(screen.queryByText('The practice will live here.')).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Practice' }))
    expect(screen.getByText('The practice will live here.')).toBeInTheDocument()
  })

  it('renders PT-BR strings when the persisted locale is pt-BR', () => {
    window.localStorage.setItem(
      STATE_KEY,
      JSON.stringify({ version: 1, prefs: { locale: 'pt-BR' } }),
    )
    render(<App />)
    expect(screen.getByRole('button', { name: 'Prática' })).toBeInTheDocument()
    expect(screen.getByText('A prática vai morar aqui.')).toBeInTheDocument()
    expect(document.documentElement.lang).toBe('pt-BR')
  })
})
