import '@testing-library/jest-dom/vitest'

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { SettingsStepper } from './SettingsStepper'

const STR = { decrease: 'Decrease', increase: 'Increase' }

describe('SettingsStepper', () => {
  it('steps to the next and previous option', async () => {
    const onChange = vi.fn()
    render(
      <SettingsStepper
        label="Duration"
        value={5}
        options={[4, 5, 6]}
        onChange={onChange}
        strings={STR}
      />,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Increase Duration' }))
    await userEvent.click(screen.getByRole('button', { name: 'Decrease Duration' }))
    expect(onChange).toHaveBeenNthCalledWith(1, 6)
    expect(onChange).toHaveBeenNthCalledWith(2, 4)
  })

  it('disables decrease at the first option and increase at the last', () => {
    const { rerender } = render(
      <SettingsStepper label="D" value={1} options={[1, 2, 3]} onChange={() => {}} strings={STR} />,
    )
    expect(screen.getByRole('button', { name: 'Decrease D' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Increase D' })).toBeEnabled()

    rerender(
      <SettingsStepper label="D" value={3} options={[1, 2, 3]} onChange={() => {}} strings={STR} />,
    )
    expect(screen.getByRole('button', { name: 'Increase D' })).toBeDisabled()
  })

  it('formats the displayed value', () => {
    render(
      <SettingsStepper
        label="D"
        value={5}
        options={[5]}
        onChange={() => {}}
        formatValue={(v) => `${String(v)} min`}
        strings={STR}
      />,
    )
    expect(screen.getByText('5 min')).toBeInTheDocument()
  })
})
