import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { SessionOverlay } from './SessionOverlay'
import { UI_STRINGS } from '../content/strings'
import type { SessionFrame } from '../domain/sessionMachine'

const S = UI_STRINGS.en.session

function renderOverlay(frame: Partial<SessionFrame> = {}) {
  return render(
    <SessionOverlay
      frame={{
        remainingMs: 0,
        overtimeMs: 0,
        currentSourceId: 's1',
        holdActive: false,
        ...frame,
      }}
      muted={false}
      onToggleSound={vi.fn()}
      onStop={vi.fn()}
      strings={S}
    />,
  )
}

// Zero-padded minutes keep the clock a fixed five characters for the whole
// session, so nothing beside it drifts; these guard that shape.
describe('SessionOverlay countdown', () => {
  it('zero-pads the minutes so the clock keeps one shape', () => {
    renderOverlay({ remainingMs: 5 * 60_000 })
    expect(screen.getByText('05:00')).toBeInTheDocument()
  })

  it('keeps two-digit minutes intact', () => {
    renderOverlay({ remainingMs: 30 * 60_000 })
    expect(screen.getByText('30:00')).toBeInTheDocument()
  })

  // Colour is the only overtime cue — the clock carries no sign — so it is the
  // one thing here worth pinning.
  it('counts overtime up in amber, unsigned', () => {
    renderOverlay({ remainingMs: 0, overtimeMs: 12_000 })
    expect(screen.getByText('00:12')).toHaveStyle({ color: 'rgb(232, 184, 75)' })
  })

  it('counts remaining time down in white', () => {
    renderOverlay({ remainingMs: 12_000 })
    expect(screen.getByText('00:12')).toHaveStyle({ color: 'rgb(255, 255, 255)' })
  })
})
