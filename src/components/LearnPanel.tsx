import type { ReactElement, ReactNode } from 'react'

import type { LearnContent, LearnLink } from '../content/learnContent'
import type { LockedCopy } from '../content/lockedCopy'
import type { UiStrings } from '../content/strings'
import { SettingsSectionHeader } from './SettingsSectionHeader'
import { SectionCard } from './primitives/SectionCard'

// Body of the About/Learn surface (ported from HRV, flattened — cute has one
// practice, so HRV's per-practice content map is gone). Each section title is a
// SettingsSectionHeader above its own SectionCard, matching the Settings page.

export interface LearnPanelProps {
  content: LearnContent
  locked: LockedCopy
  strings: UiStrings['learn']
}

const LINK_CLASSES =
  'inline-flex min-h-[44px] items-center text-sm font-medium text-[var(--color-zen-accent)] hover:text-[var(--color-zen-accent-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-zen-accent)] focus-visible:ring-offset-2'

const BODY_CLASSES = 'text-sm leading-relaxed text-[var(--color-zen-text-soft)]'

function Card({ children }: { children: ReactNode }): ReactElement {
  return <SectionCard padding="16px 18px">{children}</SectionCard>
}

function LinkRow({ label, url }: LearnLink): ReactElement {
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className={LINK_CLASSES}>
      {label}
    </a>
  )
}

export function LearnPanel({ content, locked, strings }: LearnPanelProps): ReactElement {
  const { description, videoNote, videos, forrest, links } = content

  return (
    <div>
      <SettingsSectionHeader label={description.section1.title} />
      <Card>
        <p className={BODY_CLASSES}>{description.section1.body}</p>
      </Card>

      <SettingsSectionHeader label={description.section2.title} />
      <Card>
        <p className={BODY_CLASSES}>{description.section2.body}</p>
        <p
          className={`${BODY_CLASSES} mt-3 border-l-2 border-[var(--color-border-soft)] pl-3 text-xs italic`}
        >
          {videoNote}
        </p>
      </Card>

      <SettingsSectionHeader label={strings.videosHeading} />
      <Card>
        <div className="grid gap-2">
          {videos.map((video) => (
            <LinkRow key={video.url} label={video.label} url={video.url} />
          ))}
        </div>
      </Card>

      <SettingsSectionHeader label={forrest.title} />
      <Card>
        <p className={BODY_CLASSES}>{forrest.body}</p>
      </Card>

      <SettingsSectionHeader label={strings.resourcesHeading} />
      <Card>
        <div className="grid gap-2">
          <LinkRow label={links.youtubeChannel.label} url={links.youtubeChannel.url} />
          <LinkRow label={links.website.label} url={links.website.url} />
          <LinkRow label={links.book.label} url={links.book.url} />
          <LinkRow label={links.patreon.label} url={links.patreon.url} />
        </div>
      </Card>

      <p className="mt-6 text-center text-xs font-bold italic first-letter:uppercase text-[var(--color-zen-muted)]">
        {locked.inspiredByForrest}
      </p>
      <p className="text-center text-xs text-[var(--color-zen-muted)]">{locked.affiliationLine}</p>
    </div>
  )
}
