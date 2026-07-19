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

// The last frame holds and fades to black for this long before the completion
// summary takes over (FR-36). Mirrors the .session-settle animation in theme.css.
const SETTLE_MS = 800

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
// pref, show/hide as media/visibility change, and hand the element back hidden
// and source-less when the session ends. Stays visible through the settle fade,
// so the last frame is what fades out. Returns whether the video layer is shown.
function useSessionVideo(opts: {
  videoRef: RefObject<HTMLVideoElement | null>
  setVideoActive: (active: boolean) => void
  media: SessionMedia | null
  visible: boolean
  soundOn: boolean
}): boolean {
  const { videoRef, setVideoActive, media, visible, soundOn } = opts
  const showVideo = visible && media !== null && media.type === 'video'
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

// While the black media takeover is on screen, force the iOS status bar black.
// The installed standalone strip paints with the document background and its text
// follows color-scheme (the status-bar metas are read at launch — runtime writes
// are ignored on iOS), so blacken <html> and pin a dark scheme (white text) for
// the session. theme-color covers Safari's browser chrome. All restored on exit.
function useBlackStatusBar(active: boolean): void {
  useEffect(() => {
    if (!active) return undefined
    const root = document.documentElement
    const prevBg = root.style.backgroundColor
    const prevScheme = root.style.colorScheme
    root.style.backgroundColor = '#000000'
    root.style.colorScheme = 'dark'

    const themeColor = document.querySelector('meta[name="theme-color"]')
    const prevThemeColor = themeColor === null ? null : themeColor.getAttribute('content')
    if (themeColor !== null) themeColor.setAttribute('content', '#000000')

    return () => {
      root.style.backgroundColor = prevBg
      root.style.colorScheme = prevScheme
      if (themeColor !== null && prevThemeColor !== null) {
        themeColor.setAttribute('content', prevThemeColor)
      }
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
  const [settled, setSettled] = useState(false)
  const running = state.status === 'running'
  const ending = state.status === 'complete' && !settled

  useEffect(() => {
    if (state.status !== 'complete') return undefined
    const id = setTimeout(() => {
      setSettled(true)
    }, SETTLE_MS)
    return () => {
      clearTimeout(id)
    }
  }, [state.status])

  const showVideo = useSessionVideo({
    videoRef,
    setVideoActive,
    media,
    visible: running || ending,
    soundOn,
  })
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
  useBlackStatusBar(running || ending)

  if (state.status === 'complete' && settled && summary !== null) {
    return <CompletionScreen summary={summary} onDone={onExit} strings={strings.session.completion} />
  }

  const gesturesLive = running && !confirmStop

  return (
    <div
      // Transparent above the z-10 App <video> so it shows through while a
      // video plays; a black backdrop stands in for images and while loading.
      className="fixed inset-0 z-20 touch-none select-none"
      onPointerDown={gesturesLive ? pointer.onPointerDown : undefined}
      onPointerMove={gesturesLive ? pointer.onPointerMove : undefined}
      onPointerUp={gesturesLive ? pointer.onPointerUp : undefined}
      onPointerCancel={gesturesLive ? pointer.onPointerCancel : undefined}
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
      {ending && <div className="session-settle pointer-events-none absolute inset-0 z-30 bg-black" />}
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
