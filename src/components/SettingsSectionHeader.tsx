import type { ReactElement } from 'react'

// Quiet uppercase tracked label grouping a card below it. Labels the Settings
// page sections (Statistics / Theme / Language / About). Ported from HRV.
export interface SettingsSectionHeaderProps {
  // Localized text, natural case (the component applies uppercase via CSS).
  label: string
}

export function SettingsSectionHeader({ label }: SettingsSectionHeaderProps): ReactElement {
  return (
    <h2
      className="uppercase"
      style={{
        fontSize: 11,
        fontWeight: 500,
        letterSpacing: '0.16em',
        color: 'var(--color-zen-muted)',
        marginTop: 24,
        marginBottom: 8,
      }}
    >
      {label}
    </h2>
  )
}
