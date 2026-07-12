import type { ReactElement } from 'react'

// Quiet uppercase tracked label grouping a card below it. Labels the Settings
// page sections (Statistics / Theme / Language / About). Ported from HRV.
export interface SettingsSectionHeaderProps {
  // Localized text, natural case (the component applies uppercase via CSS).
  label: string
  // <h2> when this header is the primary heading of a page-level section;
  // <p> when the surrounding card already owns the semantic structure.
  as?: 'h2' | 'p'
}

export function SettingsSectionHeader({
  label,
  as = 'h2',
}: SettingsSectionHeaderProps): ReactElement {
  const Tag = as
  return (
    <Tag
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
    </Tag>
  )
}
