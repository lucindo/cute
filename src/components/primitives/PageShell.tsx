import type { ReactNode } from 'react'

export type PageShellWidth = 'practice' | 'page'

export interface PageShellProps {
  children: ReactNode
  overlays?: ReactNode
  // 'practice' caps at 520px on desktop (narrower for meditative focus);
  // 'page' caps at 600px (scrollable content like Learn/settings pages).
  // Mobile (<sm) is full-width in either case. Defaults to 'page'.
  width?: PageShellWidth
}

const WIDTH_CLASS: Record<PageShellWidth, string> = {
  practice: 'sm:max-w-[520px]',
  page: 'sm:max-w-[600px]',
}

/** Page-level wrapper: radial-gradient `<main>` with consistent padding,
 *  containing a centered `<section>` capped per the `width` prop. Page-level
 *  overlays (dialogs) render as siblings of the section via the `overlays`
 *  slot — kept inside `<main>` to preserve page semantics.
 *
 *  Heading contract: callers must provide an `<h1>`-bearing header as the
 *  first child so the page satisfies the document-outline requirement. */
export function PageShell({ children, overlays, width = 'page' }: PageShellProps) {
  return (
    <main
      className="min-h-screen px-4 py-6 text-[var(--color-zen-accent-strong)] sm:px-6 sm:py-8"
      style={{ background: 'var(--page-bg-gradient)' }}
    >
      <section
        className={`mx-auto flex min-h-[calc(100vh-3rem)] w-full ${WIDTH_CLASS[width]} flex-col items-center justify-start text-center sm:min-h-[calc(100vh-4rem)]`}
      >
        {children}
      </section>
      {overlays}
    </main>
  )
}
