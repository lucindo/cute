import '@testing-library/jest-dom/vitest'

import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { SessionView } from './SessionView'
import { UI_STRINGS } from '../content/strings'
import { UiStringsProvider } from '../hooks/useUiStringsContext'
import { getAllRecords, loadPrefs, openDb, writeMany, type SourceRecord, type WriteOp } from '../storage'

const S = UI_STRINGS.en.session

async function seedSource(id: string): Promise<void> {
  const opened = await openDb()
  if (!opened.ok) throw new Error('seed: openDb failed')
  const source: SourceRecord = {
    id,
    type: 'image',
    mimeType: 'image/webp',
    bytes: 3,
    createdAt: 1,
    tags: [],
    deleted: false,
  }
  const ops: WriteOp[] = [
    { op: 'put', store: 'sources', record: source },
    { op: 'put', store: 'blobs', record: { id, type: 'image/webp', bytes: new ArrayBuffer(3) } },
  ]
  const written = await writeMany(opened.value, ops)
  opened.value.close()
  if (!written.ok) throw new Error('seed: write failed')
}

function renderSession(onExit: () => void = vi.fn()) {
  return render(
    <UiStringsProvider value={UI_STRINGS.en}>
      <SessionView
        request={{ sourceIds: ['s1'], plannedMinutes: 5, tagFilter: [] }}
        videoRef={{ current: null }}
        setVideoActive={vi.fn()}
        onExit={onExit}
      />
    </UiStringsProvider>,
  )
}

describe('SessionView', () => {
  it('records a held press, stops with confirm, and persists the session', async () => {
    await seedSource('s1')
    renderSession()

    // Hold Space ≥300ms → one recorded hold.
    fireEvent.keyDown(window, { code: 'Space' })
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 350))
    })
    fireEvent.keyUp(window, { code: 'Space' })

    // Esc opens the stop confirm; confirming ends the session.
    fireEvent.keyDown(window, { code: 'Escape' })
    const dialog = await screen.findByRole('dialog')
    await userEvent.click(within(dialog).getByRole('button', { name: S.stopConfirm }))

    // Completion summary shows one hold. The timeout clears the settle fade,
    // which holds the last frame for SETTLE_MS before the summary renders.
    expect(await screen.findByText(S.completion.title, undefined, { timeout: 2000 })).toBeInTheDocument()
    expect(screen.getByText(S.completion.holds).parentElement).toHaveTextContent('1')

    // Session + its hold are persisted.
    await waitFor(async () => {
      const opened = await openDb()
      if (!opened.ok) throw new Error('assert: openDb failed')
      const sessions = await getAllRecords(opened.value, 'sessions')
      const holds = await getAllRecords(opened.value, 'holdEvents')
      opened.value.close()
      expect(sessions.ok && sessions.value).toHaveLength(1)
      expect(holds.ok && holds.value).toHaveLength(1)
      expect(sessions.ok && sessions.value[0]?.endReason).toBe('stopped')
    })
  })

  it('opens the stop confirm from the overlay Stop button (not just hides the overlay)', async () => {
    await seedSource('s1')
    renderSession()

    await userEvent.click(screen.getByRole('button', { name: S.stop }))

    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText(S.stopTitle)).toBeInTheDocument()
  })

  // Release Space while the confirm is open, cancel, then idle well past the
  // release: a hold that ended on time cannot grow here, so an inflated duration
  // means the release was dropped.
  async function expectReleasedHoldDidNotOutliveTheConfirm(): Promise<void> {
    const dialog = await screen.findByRole('dialog')
    fireEvent.keyUp(window, { code: 'Space' })
    await userEvent.click(within(dialog).getByRole('button', { name: S.stopCancel }))

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 400))
    })

    fireEvent.keyDown(window, { code: 'Escape' })
    const stopDialog = await screen.findByRole('dialog')
    await userEvent.click(within(stopDialog).getByRole('button', { name: S.stopConfirm }))

    await waitFor(async () => {
      const opened = await openDb()
      if (!opened.ok) throw new Error('assert: openDb failed')
      const holds = await getAllRecords(opened.value, 'holdEvents')
      opened.value.close()
      if (!holds.ok) throw new Error('assert: read failed')
      expect(holds.value).toHaveLength(1)
      expect(holds.value[0]?.durationMs).toBeLessThan(600)
    })
  }

  async function holdSpacePastThreshold(): Promise<void> {
    fireEvent.keyDown(window, { code: 'Space' })
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 350))
    })
  }

  // Opening the confirm detaches the keyboard and pointer surfaces mid-press, so
  // the release that ends the hold is never delivered. Both entry points strand it.
  it('ends a held press when Esc opens the confirm', async () => {
    await seedSource('s1')
    renderSession()

    await holdSpacePastThreshold()
    fireEvent.keyDown(window, { code: 'Escape' })

    await expectReleasedHoldDidNotOutliveTheConfirm()
  })

  it('ends a held press when the overlay Stop button opens the confirm', async () => {
    await seedSource('s1')
    renderSession()

    await holdSpacePastThreshold()
    await userEvent.click(screen.getByRole('button', { name: S.stop }))

    await expectReleasedHoldDidNotOutliveTheConfirm()
  })

  it('toggles video sound from the overlay and persists the pref', async () => {
    await seedSource('s1')
    renderSession()

    const toggle = screen.getByRole('button', { name: S.mute })
    expect(toggle).toHaveAttribute('aria-pressed', 'false')

    await userEvent.click(toggle)

    expect(screen.getByRole('button', { name: S.unmute })).toHaveAttribute('aria-pressed', 'true')
    expect(loadPrefs().videoSound).toBe(false)
  })

  it('returns to setup when completion is dismissed', async () => {
    const onExit = vi.fn()
    await seedSource('s1')
    renderSession(onExit)

    fireEvent.keyDown(window, { code: 'Escape' })
    const dialog = await screen.findByRole('dialog')
    await userEvent.click(within(dialog).getByRole('button', { name: S.stopConfirm }))

    const done = await screen.findByRole('button', { name: S.completion.done }, { timeout: 2000 })
    await userEvent.click(done)
    expect(onExit).toHaveBeenCalledOnce()
  })

  it('holds the last frame before the summary replaces it (FR-36)', async () => {
    await seedSource('s1')
    renderSession()

    fireEvent.keyDown(window, { code: 'Escape' })
    const dialog = await screen.findByRole('dialog')
    await userEvent.click(within(dialog).getByRole('button', { name: S.stopConfirm }))

    expect(screen.queryByText(S.completion.title)).not.toBeInTheDocument()
    expect(await screen.findByText(S.completion.title, undefined, { timeout: 2000 })).toBeInTheDocument()
  })
})
