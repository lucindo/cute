import type { ReactElement } from 'react'

import { LOCALES, type LocaleId } from '../domain/settings'
import { usePreferenceChoice } from '../hooks/usePreferenceChoice'
import { SegmentedControl } from './primitives/SegmentedControl'

// Endonyms — each language names itself, unchanged by the active UI locale.
const LOCALE_NAMES: Record<LocaleId, string> = {
  en: 'English',
  'pt-BR': 'Português',
}

export interface LanguagePickerProps {
  // Localized section label, doubling as the radiogroup's accessible name.
  label: string
}

export function LanguagePicker({ label }: LanguagePickerProps): ReactElement {
  const [locale, setLocale] = usePreferenceChoice('locale')
  return (
    <SegmentedControl<LocaleId>
      options={LOCALES.map((id) => ({ id, label: LOCALE_NAMES[id] }))}
      value={locale}
      onChange={setLocale}
      ariaLabel={label}
    />
  )
}
