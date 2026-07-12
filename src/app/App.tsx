import { useCallback, useRef, useState, type ReactElement } from 'react'

import { CollectionScreen } from './CollectionScreen'
import { PracticeScreen } from './PracticeScreen'
import { SessionView } from './SessionView'
import { SegmentedControl } from '../components/primitives/SegmentedControl'
import { PageShell } from '../components/primitives/PageShell'
import { TopAppBar } from '../components/primitives/TopAppBar'
import { useLocale } from '../hooks/useLocale'
import type { SessionRequest } from '../hooks/useSession'
import { UiStringsProvider } from '../hooks/useUiStringsContext'

type AppMode = 'practice' | 'collection'

export function App(): ReactElement {
  const { uiStrings } = useLocale()
  const [mode, setMode] = useState<AppMode>('practice')
  const [sessionRequest, setSessionRequest] = useState<SessionRequest | null>(null)

  // One persistent <video> for the whole app (SPEC FR-35): it must outlive the
  // Practice→Session mount swap so the Start gesture can unlock it for unmuted
  // iOS playback. SessionView drives its src/playback; App only owns visibility.
  const videoRef = useRef<HTMLVideoElement>(null)
  const [videoActive, setVideoActive] = useState(false)

  const handleStart = useCallback((request: SessionRequest): void => {
    const v = videoRef.current
    // Prime the shared element inside the Start gesture so iOS grants it the
    // user activation the first async-loaded video needs to play with sound.
    if (v !== null) {
      void v
        .play()
        .then(() => {
          v.pause()
        })
        .catch(() => undefined)
    }
    setSessionRequest(request)
  }, [])

  return (
    <UiStringsProvider value={uiStrings}>
      <video
        ref={videoRef}
        playsInline
        loop
        hidden={!videoActive}
        className="pointer-events-none fixed inset-0 z-10 h-full w-full bg-black object-contain"
      />
      {sessionRequest === null ? (
        <PageShell width="practice">
          <TopAppBar title={uiStrings.shell.appTitle} />
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
          {mode === 'practice' ? (
            <PracticeScreen onStart={handleStart} />
          ) : (
            <CollectionScreen />
          )}
        </PageShell>
      ) : (
        <SessionView
          request={sessionRequest}
          videoRef={videoRef}
          setVideoActive={setVideoActive}
          onExit={() => {
            setSessionRequest(null)
          }}
        />
      )}
    </UiStringsProvider>
  )
}
