import type { CSSProperties, ReactElement } from 'react'

import { THEMES, type ThemeId } from '../domain/settings'
import { usePreferenceChoice } from '../hooks/usePreferenceChoice'
import { PickerCardGrid } from './primitives/PickerCardGrid'

export interface ThemePickerProps {
  // Localized section label + per-option labels (settings.theme.*).
  label: string
  optionLabels: Readonly<Record<ThemeId, string>>
}

// 14px swatch of each theme's background, shown regardless of the active theme.
// Hexes mirror --color-zen-bg per theme scope in styles/theme.css.
const SWATCH_STYLE: Record<ThemeId, CSSProperties> = {
  light: { background: '#f3f5f7' },
  dark: { background: '#1a1d24' },
  system: {
    background: 'linear-gradient(90deg, #f3f5f7 0%, #f3f5f7 50%, #1a1d24 50%, #1a1d24 100%)',
  },
}

export function ThemePicker({ label, optionLabels }: ThemePickerProps): ReactElement {
  const [theme, setTheme] = usePreferenceChoice('theme')
  return (
    <PickerCardGrid<ThemeId>
      sectionLabel={label}
      sectionLabelHidden
      labelId="theme-picker-label"
      options={THEMES}
      value={theme}
      onChange={setTheme}
      renderOption={(id) => (
        <>
          <span
            aria-hidden="true"
            className="inline-block size-3.5 shrink-0 rounded-full border border-[var(--color-border-soft)]"
            style={SWATCH_STYLE[id]}
          />
          <span>{optionLabels[id]}</span>
        </>
      )}
      columns={3}
    />
  )
}
