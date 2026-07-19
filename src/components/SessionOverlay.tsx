import type { ReactElement } from 'react'

import { SpeakerIcon } from './icons/SpeakerIcon'
import { SpeakerMutedIcon } from './icons/SpeakerMutedIcon'
import type { UiStrings } from '../content/strings'
import { formatDuration } from '../domain/format'
import type { SessionFrame } from '../domain/sessionMachine'

export interface SessionOverlayProps {
  frame: SessionFrame
  muted: boolean
  onToggleSound(this: void): void
  onStop(this: void): void
  strings: UiStrings['session']
}

// Discrete session overlay (SPEC FR-33): remaining/overtime countdown flanked by
// a mute toggle and a stop control on translucent blurred pills so it stays
// legible over any media. No time-of-day clock — it duplicated the OS status bar
// on mobile. The container is click-through except the buttons, so presses on the
// media still reach the surface to record a hold. A breathing pip inside the time
// pill signals a hold in progress.
export function SessionOverlay({
  frame,
  muted,
  onToggleSound,
  onStop,
  strings,
}: SessionOverlayProps): ReactElement {
  const overtime = frame.overtimeMs > 0
  const time = overtime ? `+${formatDuration(frame.overtimeMs)}` : formatDuration(frame.remainingMs)
  const soundLabel = muted ? strings.unmute : strings.mute

  return (
    <div
      className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between gap-3 p-4"
      style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}
    >
      <button
        type="button"
        aria-pressed={muted}
        aria-label={soundLabel}
        title={soundLabel}
        onClick={onToggleSound}
        // Keep the press off the takeover's gesture handler (D-84).
        onPointerDown={(e) => {
          e.stopPropagation()
        }}
        className="pointer-events-auto grid place-items-center rounded-full bg-black/40 p-2 text-white/90 backdrop-blur-md transition hover:bg-black/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 motion-reduce:transition-none"
      >
        {muted ? <SpeakerMutedIcon width={20} height={20} /> : <SpeakerIcon width={20} height={20} />}
      </button>
      <span
        className="inline-flex items-center gap-2 rounded-full bg-black/40 px-4 py-1.5 text-lg font-semibold tabular-nums backdrop-blur-md"
        style={{ color: overtime ? '#e8b84b' : '#ffffff' }}
      >
        {/* Always rendered so starting a hold can't jog the pill's width.
            bg-current keeps it on the countdown's colour through overtime. */}
        <span
          aria-hidden="true"
          className={`size-2 shrink-0 rounded-full bg-current ${frame.holdActive ? 'hold-pulse' : 'opacity-0'}`}
        />
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
