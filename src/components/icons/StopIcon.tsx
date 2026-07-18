import type { ReactElement, SVGProps } from 'react'

export function StopIcon(props: SVGProps<SVGSVGElement>): ReactElement {
  return (
    <svg
      aria-hidden="true"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <rect x="6" y="6" width="12" height="12" rx="2" />
    </svg>
  )
}
