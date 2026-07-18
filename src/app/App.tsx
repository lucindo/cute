import { useCallback, useRef, useState, type ReactElement } from 'react'

import { CollectionScreen } from './CollectionScreen'
import { PracticeScreen } from './PracticeScreen'
import { SessionView } from './SessionView'
import { SettingsScreen } from './SettingsScreen'
import { LearnScreen } from './LearnScreen'
import { StatsScreen } from './StatsScreen'
import { TagsScreen } from './TagsScreen'
import { GearIcon } from '../components/icons/GearIcon'
import { InfoIcon } from '../components/icons/InfoIcon'
import { IconButton } from '../components/primitives/IconButton'
import { SegmentedControl } from '../components/primitives/SegmentedControl'
import { PageShell } from '../components/primitives/PageShell'
import { TopAppBar } from '../components/primitives/TopAppBar'
import { useLocale } from '../hooks/useLocale'
import { useTheme } from '../hooks/useTheme'
import type { SessionRequest } from '../hooks/useSession'
import { UiStringsProvider } from '../hooks/useUiStringsContext'

type AppMode = 'practice' | 'collection'
type AppView = 'shell' | 'settings' | 'stats' | 'learn' | 'tags'

export function App(): ReactElement {
  const { locale, uiStrings } = useLocale()
  useTheme()
  const [mode, setMode] = useState<AppMode>('practice')
  const [view, setView] = useState<AppView>('shell')
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
      {sessionRequest !== null ? (
        <SessionView
          request={sessionRequest}
          videoRef={videoRef}
          setVideoActive={setVideoActive}
          onExit={() => {
            setSessionRequest(null)
          }}
        />
      ) : view === 'settings' ? (
        <SettingsScreen
          onBack={() => {
            setView('shell')
          }}
          onOpenStats={() => {
            setView('stats')
          }}
        />
      ) : view === 'stats' ? (
        <StatsScreen
          locale={locale}
          onBack={() => {
            setView('settings')
          }}
        />
      ) : view === 'learn' ? (
        <LearnScreen
          locale={locale}
          onBack={() => {
            setView('shell')
          }}
        />
      ) : view === 'tags' ? (
        <TagsScreen
          onBack={() => {
            setView('shell')
          }}
        />
      ) : (
        <PageShell width="practice">
          <TopAppBar
            title={uiStrings.shell.appTitle}
            leading={
              <IconButton
                icon={<GearIcon />}
                label={uiStrings.shell.settings}
                onClick={() => {
                  setView('settings')
                }}
              />
            }
            trailing={
              <IconButton
                icon={<InfoIcon />}
                label={uiStrings.learn.title}
                onClick={() => {
                  setView('learn')
                }}
              />
            }
          />
          {/* mt-6 matches the 24px a SettingsSectionHeader puts under the top bar. */}
          <div className="mt-6 mb-8 w-full">
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
            <CollectionScreen
              onOpenTags={() => {
                setView('tags')
              }}
            />
          )}
        </PageShell>
      )}
    </UiStringsProvider>
  )
}
