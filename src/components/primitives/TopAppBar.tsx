import type { ReactNode } from 'react'

export interface TopAppBarProps {
  title: string
  leading?: ReactNode
  trailing?: ReactNode
}

// Page-level header (ported from HRV): 36×36 leading slot, centered title,
// 36×36 trailing slot. Empty 36×36 placeholders keep the title centered when a
// slot is absent. Top padding folds in the iOS safe-area inset for standalone
// PWA (max() keeps desktop from burning dead vertical space).
export function TopAppBar({ title, leading, trailing }: TopAppBarProps) {
  return (
    <div
      className="flex w-full items-center justify-between px-5 pb-3 sm:px-8"
      style={{ paddingTop: 'max(1rem, env(safe-area-inset-top, 0px))' }}
    >
      {leading ?? <div className="size-9" aria-hidden="true" />}
      <h1 className="text-[17px] font-semibold tracking-[0.01em] text-[var(--color-zen-text)]">
        {title}
      </h1>
      {trailing ?? <div className="size-9" aria-hidden="true" />}
    </div>
  )
}
