import { useState, type ReactElement } from 'react'

import { CollectionScreen } from './CollectionScreen'
import { PracticeScreen } from './PracticeScreen'
import { ModeToggle, type AppMode } from '../components/ModeToggle'
import { PageShell } from '../components/primitives/PageShell'
import { useLocale } from '../hooks/useLocale'
import { UiStringsProvider } from '../hooks/useUiStringsContext'

export function App(): ReactElement {
  const { uiStrings } = useLocale()
  const [mode, setMode] = useState<AppMode>('practice')

  return (
    <UiStringsProvider value={uiStrings}>
      <PageShell width="practice">
        <h1 className="mb-6 text-2xl font-semibold text-[var(--color-zen-accent-strong)]">
          {uiStrings.shell.appTitle}
        </h1>
        <div className="mb-8 w-full max-w-[320px]">
          <ModeToggle
            active={mode}
            onSwitch={setMode}
            strings={{
              label: uiStrings.shell.modeToggle.label,
              modeNames: {
                practice: uiStrings.shell.modeToggle.practiceName,
                collection: uiStrings.shell.modeToggle.collectionName,
              },
            }}
          />
        </div>
        {mode === 'practice' ? <PracticeScreen /> : <CollectionScreen />}
      </PageShell>
    </UiStringsProvider>
  )
}
