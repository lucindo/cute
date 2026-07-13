import { useEffect, useRef, type ReactElement } from 'react'

import { ChevronBackIcon } from '../components/icons/ChevronBackIcon'
import { LearnPanel } from '../components/LearnPanel'
import { IconButton } from '../components/primitives/IconButton'
import { PageShell } from '../components/primitives/PageShell'
import { TopAppBar } from '../components/primitives/TopAppBar'
import { LEARN_CONTENT } from '../content/learnContent'
import { LOCKED_COPY } from '../content/lockedCopy'
import type { LocaleId } from '../domain/settings'
import { useUiStrings } from '../hooks/useUiStringsContext'

export interface LearnScreenProps {
  locale: LocaleId
  onBack(this: void): void
}

// About/Learn page (SPEC FR-5), reached from the shell TopAppBar trailing slot.
// Focuses the back button on mount so there's always a known affordance.
export function LearnScreen({ locale, onBack }: LearnScreenProps): ReactElement {
  const strings = useUiStrings().learn
  const backRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    backRef.current?.focus()
  }, [])

  return (
    <PageShell>
      <TopAppBar
        title={strings.title}
        leading={
          <IconButton
            icon={<ChevronBackIcon />}
            label={strings.close}
            onClick={onBack}
            buttonRef={backRef}
          />
        }
      />
      <div className="w-full text-left">
        <LearnPanel content={LEARN_CONTENT[locale]} locked={LOCKED_COPY[locale]} strings={strings} />
      </div>
    </PageShell>
  )
}
