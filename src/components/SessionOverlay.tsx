import type { ReactElement } from 'react'

import type { UiStrings } from '../content/strings'
import { formatDuration } from '../domain/format'
import type { SessionFrame } from '../domain/sessionMachine'

export interface SessionOverlayProps {
  frame: SessionFrame
  clockLabel: string
  onStop(this: void): void
  strings: UiStrings['session']
}

// Discrete session overlay (SPEC FR-33): clock, remaining/overtime countdown,
// and a stop control on translucent blurred pills so it stays legible over any
// media. The container is click-through except the Stop button, so taps on the
// media still reach the surface (toggle overlay / hold). A subtle ring on the
// time pill signals a hold in progress.
export function SessionOverlay({ frame, clockLabel, onStop, strings }: SessionOverlayProps): ReactElement {
  const overtime = frame.overtimeMs > 0
  const time = overtime ? `+${formatDuration(frame.overtimeMs)}` : formatDuration(frame.remainingMs)

  return (
    <div
      className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between gap-3 p-4"
      style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}
    >
      <span className="rounded-full bg-black/40 px-3 py-1 text-sm tabular-nums text-white/80 backdrop-blur-md">
        {clockLabel}
      </span>
      <span
        className={`rounded-full bg-black/40 px-4 py-1.5 text-lg font-semibold tabular-nums backdrop-blur-md${
          frame.holdActive ? ' hold-pulse' : ''
        }`}
        style={{ color: overtime ? '#e8b84b' : '#ffffff' }}
      >
        {time}
      </span>
      <button
        type="button"
        onClick={onStop}
        // Keep the press off the takeover's gesture handler, else the bubbled
        // pointerup toggles the overlay and unmounts this button before onClick.
        onPointerDown={(e) => {
          e.stopPropagation()
        }}
        className="pointer-events-auto rounded-full bg-black/40 px-4 py-1.5 text-sm font-medium text-white/90 backdrop-blur-md transition hover:bg-black/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 motion-reduce:transition-none"
      >
        {strings.stop}
      </button>
    </div>
  )
}
