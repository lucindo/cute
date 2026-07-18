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
    // svh, not vh: iOS Safari measures 100vh with the toolbar retracted, which
    // hides bottom-anchored content (the Start button) until the user scrolls.
    // Bottom inset is ours to pay because index.html opts into viewport-fit=cover.
    <main
      className="flex min-h-[100svh] flex-col px-4 pt-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] text-[var(--color-zen-accent-strong)] sm:px-6 sm:pt-8 sm:pb-[max(2rem,env(safe-area-inset-bottom))]"
      style={{ background: 'var(--page-bg-gradient)' }}
    >
      <section
        className={`mx-auto flex w-full flex-1 ${WIDTH_CLASS[width]} flex-col items-center justify-start text-center`}
      >
        {children}
      </section>
      {overlays}
    </main>
  )
}
