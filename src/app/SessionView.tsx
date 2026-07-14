import {
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type PointerEvent,
  type ReactElement,
  type RefObject,
  type SetStateAction,
} from 'react'

import { CompletionScreen } from './CompletionScreen'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { SessionOverlay } from '../components/SessionOverlay'
import { useSession, type SessionMedia, type SessionRequest } from '../hooks/useSession'
import { useUiStrings } from '../hooks/useUiStringsContext'
import { useVideoSound } from '../hooks/useVideoSound'

// Movement past this many pixels turns a press into a swipe, not a hold (FR-30).
const SLOP_PX = 10

export interface SessionViewProps {
  request: SessionRequest
  videoRef: RefObject<HTMLVideoElement | null>
  setVideoActive(this: void, active: boolean): void
  onExit(this: void): void
}

interface PointerHandlers {
  onPointerDown(this: void, e: PointerEvent<HTMLDivElement>): void
  onPointerMove(this: void, e: PointerEvent<HTMLDivElement>): void
  onPointerUp(this: void): void
  onPointerCancel(this: void): void
}

// Keyboard grammar (FR-32): Space held = hold (repeat filtered), ←/→ = prev/next,
// Esc = stop-with-confirm. Suspended while the confirm dialog owns focus.
function useSessionKeyboard(opts: {
  running: boolean
  confirmStop: boolean
  pressStart: () => void
  pressEnd: () => void
  next: () => void
  prev: () => void
  setConfirmStop: Dispatch<SetStateAction<boolean>>
}): void {
  const { running, confirmStop, pressStart, pressEnd, next, prev, setConfirmStop } = opts
  useEffect(() => {
    if (!running || confirmStop) return undefined
    const onKeyDown = (e: KeyboardEvent): void => {
      if (e.code === 'Space') {
        e.preventDefault()
        if (!e.repeat) pressStart()
        return
      }
      if (e.repeat) return
      switch (e.code) {
        case 'ArrowRight':
          next()
          break
        case 'ArrowLeft':
          prev()
          break
        case 'Escape':
          setConfirmStop(true)
          break
        default:
          break
      }
    }
    const onKeyUp = (e: KeyboardEvent): void => {
      if (e.code === 'Space') {
        e.preventDefault()
        pressEnd()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [running, confirmStop, pressStart, pressEnd, next, prev, setConfirmStop])
}

// Drive the shared App-level <video> (SPEC FR-35): swap src, apply the sound
// pref, show/hide as media/running change, and hand the element back hidden and
// source-less when the session ends. Returns whether the video layer is shown.
function useSessionVideo(opts: {
  videoRef: RefObject<HTMLVideoElement | null>
  setVideoActive: (active: boolean) => void
  media: SessionMedia | null
  running: boolean
  soundOn: boolean
}): boolean {
  const { videoRef, setVideoActive, media, running, soundOn } = opts
  const showVideo = running && media !== null && media.type === 'video'
  useEffect(() => {
    const v = videoRef.current
    if (v === null) return
    setVideoActive(showVideo)
    if (showVideo) {
      if (v.src !== media.url) v.src = media.url
      v.muted = !soundOn
      void v.play().catch(() => undefined)
    } else {
      v.pause()
    }
  }, [showVideo, media, soundOn, videoRef, setVideoActive])

  useEffect(() => {
    const v = videoRef.current
    return () => {
      setVideoActive(false)
      if (v === null) return
      v.pause()
      v.removeAttribute('src')
      v.load()
    }
  }, [videoRef, setVideoActive])

  return showVideo
}

// Pointer gesture grammar (FR-30): press = hold; movement past SLOP_PX becomes a
// swipe that cancels the press, and a mostly-horizontal swipe navigates
// (left = next, right = previous).
function usePointerGestures(opts: {
  pressStart: () => void
  pressEnd: () => void
  cancelPress: () => void
  next: () => void
  prev: () => void
}): PointerHandlers {
  const { pressStart, pressEnd, cancelPress, next, prev } = opts
  const gestureRef = useRef<{ x: number; y: number; swiped: boolean } | null>(null)
  return {
    onPointerDown: (e) => {
      if (typeof e.currentTarget.setPointerCapture === 'function') {
        e.currentTarget.setPointerCapture(e.pointerId)
      }
      gestureRef.current = { x: e.clientX, y: e.clientY, swiped: false }
      pressStart()
    },
    onPointerMove: (e) => {
      const g = gestureRef.current
      if (g === null || g.swiped) return
      const dx = e.clientX - g.x
      const dy = e.clientY - g.y
      if (Math.hypot(dx, dy) > SLOP_PX) {
        g.swiped = true
        cancelPress()
        if (Math.abs(dx) > Math.abs(dy)) {
          if (dx < 0) next()
          else prev()
        }
      }
    },
    onPointerUp: () => {
      const g = gestureRef.current
      gestureRef.current = null
      if (g !== null && !g.swiped) pressEnd()
    },
    onPointerCancel: () => {
      const g = gestureRef.current
      gestureRef.current = null
      if (g !== null && !g.swiped) cancelPress()
    },
  }
}

// While the black media takeover is on screen, paint the iOS Safari status-bar
// band black too (via theme-color), so it doesn't seam against the fill and the
// fullscreen illusion holds. Restored to the page's color on completion/exit.
function useBlackStatusBar(active: boolean): void {
  useEffect(() => {
    const meta = document.querySelector('meta[name="theme-color"]')
    if (!active || meta === null) return undefined
    const prev = meta.getAttribute('content')
    meta.setAttribute('content', '#000000')
    return () => {
      if (prev !== null) meta.setAttribute('content', prev)
    }
  }, [active])
}

export function SessionView({ request, videoRef, setVideoActive, onExit }: SessionViewProps): ReactElement {
  const strings = useUiStrings()
  const { soundOn, setSoundOn } = useVideoSound()
  const {
    state,
    frame,
    summary,
    media,
    pressStart,
    pressEnd,
    cancelPress,
    next,
    prev,
    stop,
  } = useSession(request)
  const [confirmStop, setConfirmStop] = useState(false)
  const running = state.status === 'running'

  const showVideo = useSessionVideo({ videoRef, setVideoActive, media, running, soundOn })
  useSessionKeyboard({
    running,
    confirmStop,
    pressStart,
    pressEnd,
    next,
    prev,
    setConfirmStop,
  })
  const pointer = usePointerGestures({ pressStart, pressEnd, cancelPress, next, prev })
  useBlackStatusBar(running)

  if (state.status === 'complete' && summary !== null) {
    return <CompletionScreen summary={summary} onDone={onExit} strings={strings.session.completion} />
  }

  return (
    <div
      // Transparent above the z-10 App <video> so it shows through while a
      // video plays; a black backdrop stands in for images and while loading.
      className="fixed inset-0 z-20 touch-none select-none"
      onPointerDown={confirmStop ? undefined : pointer.onPointerDown}
      onPointerMove={confirmStop ? undefined : pointer.onPointerMove}
      onPointerUp={confirmStop ? undefined : pointer.onPointerUp}
      onPointerCancel={confirmStop ? undefined : pointer.onPointerCancel}
    >
      {!showVideo && <div className="absolute inset-0 bg-black" />}
      {media !== null && media.type === 'image' && (
        <img
          src={media.url}
          alt=""
          draggable={false}
          className="pointer-events-none absolute inset-0 h-full w-full object-contain [-webkit-touch-callout:none]"
        />
      )}
      {frame !== null && (
        <SessionOverlay
          frame={frame}
          muted={!soundOn}
          onToggleSound={() => {
            setSoundOn(!soundOn)
          }}
          onStop={() => {
            setConfirmStop(true)
          }}
          strings={strings.session}
        />
      )}
      <ConfirmDialog
        open={confirmStop}
        title={strings.session.stopTitle}
        confirmLabel={strings.session.stopConfirm}
        cancelLabel={strings.session.stopCancel}
        onConfirm={() => {
          setConfirmStop(false)
          stop()
        }}
        onCancel={() => {
          setConfirmStop(false)
        }}
      />
    </div>
  )
}
