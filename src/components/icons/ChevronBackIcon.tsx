import type { SVGProps } from 'react'

export function ChevronBackIcon({ className, ...props }: SVGProps<SVGSVGElement>) {
  // Glyph points left so back reads correctly in LTR; `rtl:` flips it in RTL.
  const mirrored = `rtl:rotate-180 ${className ?? ''}`.trim()
  return (
    <svg
      aria-hidden="true"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={mirrored}
      {...props}
    >
      <polyline points="15 6 9 12 15 18" />
    </svg>
  )
}
