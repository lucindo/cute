import type { MouseEventHandler, Ref, ReactNode } from 'react'

export type IconButtonSize = 'sm' | 'md'

const SIZE_CLASS: Record<IconButtonSize, string> = {
  sm: 'size-8',
  md: 'size-10',
}

export interface IconButtonProps {
  icon: ReactNode
  label: string
  onClick?: MouseEventHandler<HTMLButtonElement>
  size?: IconButtonSize
  disabled?: boolean
  type?: 'button' | 'submit'
  className?: string
  buttonRef?: Ref<HTMLButtonElement>
}

/** Round surface-colored icon button. Used for top-bar slots (gear / back) and
 *  modal-close affordances. Size sm = 32px, md = 40px (default). The icon prop
 *  is any ReactNode — typically one of the icons from src/components/icons/.
 *  `buttonRef` lets a parent imperatively focus the button (pages focus the
 *  back chevron on mount). Ported from HRV. */
export function IconButton({
  icon,
  label,
  onClick,
  size = 'md',
  disabled = false,
  type = 'button',
  className = '',
  buttonRef,
}: IconButtonProps) {
  return (
    <button
      ref={buttonRef}
      type={type}
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className={`grid ${SIZE_CLASS[size]} place-items-center rounded-full bg-[var(--color-zen-surface)] text-[var(--color-zen-accent-strong)] shadow-[var(--shadow-card)] transition hover:bg-[var(--color-zen-bg-soft)] active:bg-[var(--color-zen-bg-soft)] disabled:cursor-not-allowed disabled:opacity-45 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zen-accent focus-visible:ring-offset-2 ${className}`.trim()}
    >
      {icon}
    </button>
  )
}
