import type { CSSProperties, ReactElement, ReactNode } from 'react'

// Card chrome (ported from HRV): 1px border-soft + surface bg + 20px radius.
// Padding varies per content, so callers supply it.
export interface SectionCardProps {
  padding: CSSProperties['padding']
  children: ReactNode
}

export function SectionCard({ padding, children }: SectionCardProps): ReactElement {
  return (
    <div
      style={{
        background: 'var(--color-zen-surface)',
        border: '1px solid var(--color-border-soft)',
        borderRadius: 20,
        padding,
      }}
    >
      {children}
    </div>
  )
}
