import { useState, type ReactElement } from 'react'

import { CollectionScreen } from './CollectionScreen'
import { PracticeScreen } from './PracticeScreen'
import { SegmentedControl } from '../components/primitives/SegmentedControl'
import { PageShell } from '../components/primitives/PageShell'
import { useLocale } from '../hooks/useLocale'
import { UiStringsProvider } from '../hooks/useUiStringsContext'

type AppMode = 'practice' | 'collection'

export function App(): ReactElement {
  const { uiStrings } = useLocale()
  const [mode, setMode] = useState<AppMode>('practice')

  return (
    <UiStringsProvider value={uiStrings}>
      <PageShell width="practice">
        <h1 className="mb-6 text-2xl font-semibold text-[var(--color-zen-accent-strong)]">
          {uiStrings.shell.appTitle}
        </h1>
        <div className="mb-8 w-full">
          <SegmentedControl<AppMode>
            options={[
              { id: 'practice', label: uiStrings.shell.modeToggle.practiceName },
              { id: 'collection', label: uiStrings.shell.modeToggle.collectionName },
            ]}
            value={mode}
            onChange={setMode}
            ariaLabel={uiStrings.shell.modeToggle.label}
          />
        </div>
        {mode === 'practice' ? <PracticeScreen /> : <CollectionScreen />}
      </PageShell>
    </UiStringsProvider>
  )
}
