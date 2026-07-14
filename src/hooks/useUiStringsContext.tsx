import { createContext, useContext, type ReactElement, type ReactNode } from 'react'

import type { UiStrings } from '../content/strings'

const UiStringsContext = createContext<UiStrings | null>(null)

export interface UiStringsProviderProps {
  value: UiStrings
  children: ReactNode
}

export function UiStringsProvider({ value, children }: UiStringsProviderProps): ReactElement {
  return <UiStringsContext.Provider value={value}>{children}</UiStringsContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components -- co-locating the hook with its Provider; HMR for an app-wide Provider is a non-concern.
export function useUiStrings(): UiStrings {
  const value = useContext(UiStringsContext)
  if (value === null) {
    throw new Error('useUiStrings must be used within a <UiStringsProvider>')
  }
  return value
}
