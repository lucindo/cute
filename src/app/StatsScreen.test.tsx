import '@testing-library/jest-dom/vitest'

import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { StatsScreen } from './StatsScreen'
import { UI_STRINGS } from '../content/strings'
import { UiStringsProvider } from '../hooks/useUiStringsContext'
import { openDb, saveCompletedSession, type HoldEventRecord, type SessionRecord } from '../storage'

type Hold = Omit<HoldEventRecord, 'id'>

function renderScreen(onBack = vi.fn()): { onBack: ReturnType<typeof vi.fn> } {
  render(
    <UiStringsProvider value={UI_STRINGS.en}>
      <StatsScreen locale="en" onBack={onBack} />
    </UiStringsProvider>,
  )
  return { onBack }
}

async function seed(record: SessionRecord, holds: Hold[]): Promise<void> {
  const opened = await openDb()
  if (!opened.ok) throw new Error('seed: openDb failed')
  const saved = await saveCompletedSession(opened.value, record, holds)
  opened.value.close()
  if (!saved.ok) throw new Error('seed: save failed')
}

function session(overrides: Partial<SessionRecord> & { id: string }): SessionRecord {
  return {
    startedAt: 1000,
    plannedMinutes: 5,
    endedAt: 301_000,
    endReason: 'completed',
    overtimeMs: 0,
    tagFilter: [],
    ...overrides,
  }
}

function hold(sessionId: string, durationMs: number): Hold {
  return { sessionId, sourceId: 'src', startedAt: 0, durationMs }
}

// The value span sits in the same flex row as its label (see StatRow).
function statRow(label: string): HTMLElement {
  const row = screen.getByText(label).closest('div')
  if (row === null) throw new Error(`no stat row for "${label}"`)
  return row
}

describe('StatsScreen', () => {
  it('shows lifetime totals and the recent-session list, newest first', async () => {
    await seed(session({ id: 'a', startedAt: 1000, endedAt: 301_000, endReason: 'completed' }), [
      hold('a', 2000),
      hold('a', 4000),
    ])
    await seed(session({ id: 'b', startedAt: 400_000, endedAt: 460_000, endReason: 'stopped' }), [
      hold('b', 3000),
    ])

    renderScreen()

    // Totals: 2 sessions, 6m practice (300s + 60s), 9s held, longest 0:04.
    await waitFor(() => {
      expect(within(statRow('Sessions')).getByText('2')).toBeInTheDocument()
    })
    expect(within(statRow('Practice time')).getByText('6m')).toBeInTheDocument()
    expect(within(statRow('Total held')).getByText('9s')).toBeInTheDocument()
    expect(within(statRow('Longest hold')).getByText('0:04')).toBeInTheDocument()

    // Recent rows: end reason (icon, labelled) + "duration · ♥ holds" for each session.
    expect(screen.getByRole('img', { name: 'Completed' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Stopped' })).toBeInTheDocument()
    expect(screen.getByText('5:00 · ♥ 2')).toBeInTheDocument()
    expect(screen.getByText('1:00 · ♥ 1')).toBeInTheDocument()
  })

  it('shows the empty message when no sessions were recorded', async () => {
    renderScreen()
    expect(await screen.findByText(UI_STRINGS.en.stats.empty)).toBeInTheDocument()
    expect(screen.queryByText('Sessions')).not.toBeInTheDocument()
  })

  it('returns via the back control', async () => {
    const { onBack } = renderScreen()
    await userEvent.click(screen.getByRole('button', { name: UI_STRINGS.en.stats.back }))
    expect(onBack).toHaveBeenCalledOnce()
  })
})

describe('StatsScreen — clear history', () => {
  const STATS = UI_STRINGS.en.stats

  it('hides the clear control when there is no history', async () => {
    renderScreen()
    await screen.findByText(STATS.empty)
    expect(screen.queryByRole('button', { name: STATS.clear })).not.toBeInTheDocument()
  })

  it('wipes the history and empties the screen once confirmed', async () => {
    await seed(session({ id: 'a' }), [hold('a', 2000)])
    renderScreen()

    await waitFor(() => { expect(screen.getByText('Sessions')).toBeInTheDocument() })
    await userEvent.click(screen.getByRole('button', { name: STATS.clear }))
    await userEvent.click(screen.getByRole('button', { name: STATS.clearConfirm }))

    expect(await screen.findByText(STATS.empty)).toBeInTheDocument()
    expect(screen.queryByText('Sessions')).not.toBeInTheDocument()
  })

  it('keeps the history when the clear is cancelled', async () => {
    await seed(session({ id: 'a' }), [hold('a', 2000)])
    renderScreen()

    await waitFor(() => { expect(screen.getByText('Sessions')).toBeInTheDocument() })
    await userEvent.click(screen.getByRole('button', { name: STATS.clear }))
    await userEvent.click(screen.getByRole('button', { name: STATS.clearCancel }))

    expect(screen.getByText('Sessions')).toBeInTheDocument()
    expect(screen.queryByText(STATS.empty)).not.toBeInTheDocument()
  })
})
