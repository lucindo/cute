import type { ReactElement } from 'react'

import { SettingsRow } from './SettingsRow'
import { Toggle } from './primitives/Toggle'

export interface SettingsToggleRowProps {
  label: string
  ariaLabel: string
  checked: boolean
  onChange(this: void, next: boolean): void
  disabled?: boolean
  noBorder?: boolean
}

// Toggle row (ported from HRV): label left / switch right, same row chrome as
// SettingsStepper. Dims the label alongside the switch when disabled, matching
// SettingsStepper — HRV dims only the switch.
export function SettingsToggleRow({
  label,
  ariaLabel,
  checked,
  onChange,
  disabled = false,
  noBorder = false,
}: SettingsToggleRowProps): ReactElement {
  return (
    <SettingsRow
      label={label}
      ariaLabel={ariaLabel}
      className="flex items-center justify-between"
      dimmed={disabled}
      noBorder={noBorder}
    >
      <Toggle checked={checked} onChange={onChange} label={ariaLabel} disabled={disabled} />
    </SettingsRow>
  )
}
