import {
  useEffect,
  useRef,
  useState,
  type PointerEvent,
  type ReactElement,
  type RefObject,
} from 'react'

import { CompletionScreen } from './CompletionScreen'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { SessionOverlay } from '../components/SessionOverlay'
import { useSession, type SessionRequest } from '../hooks/useSession'
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

export function SessionView({ request, videoRef, setVideoActive, onExit }: SessionViewProps): ReactElement {
  const strings = useUiStrings()
  const { soundOn } = useVideoSound()
  const {
    state,
    frame,
    summary,
    media,
    overlayVisible,
    pressStart,
    pressEnd,
    cancelPress,
    next,
    prev,
    stop,
    toggleOverlay,
  } = useSession(request)
  const [confirmStop, setConfirmStop] = useState(false)
  const gestureRef = useRef<{ x: number; y: number; swiped: boolean } | null>(null)

  const running = state.status === 'running'

  // Keyboard grammar (FR-32): Space held = hold (repeat filtered), ←/→ =
  // prev/next, Esc = stop-with-confirm, O = toggle overlay. Suspended while the
  // confirm dialog owns focus.
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
        case 'KeyO':
          toggleOverlay()
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
  }, [running, confirmStop, pressStart, pressEnd, next, prev, toggleOverlay])

  // Drive the shared App-level <video> (SPEC FR-35): swap src, apply the sound
  // pref, and show/hide it as the current media and running state change.
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

  // Hand the shared element back hidden and source-less when the session ends.
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

  if (state.status === 'complete' && summary !== null) {
    return <CompletionScreen summary={summary} onDone={onExit} strings={strings.session.completion} />
  }

  const onPointerDown = (e: PointerEvent<HTMLDivElement>): void => {
    if (typeof e.currentTarget.setPointerCapture === 'function') {
      e.currentTarget.setPointerCapture(e.pointerId)
    }
    gestureRef.current = { x: e.clientX, y: e.clientY, swiped: false }
    pressStart()
  }
  const onPointerMove = (e: PointerEvent<HTMLDivElement>): void => {
    const g = gestureRef.current
    if (g === null || g.swiped) return
    const dx = e.clientX - g.x
    const dy = e.clientY - g.y
    if (Math.hypot(dx, dy) > SLOP_PX) {
      g.swiped = true
      cancelPress()
      // Horizontal swipe navigates (FR-30: left = next, right = previous);
      // a mostly-vertical drag just cancels the press.
      if (Math.abs(dx) > Math.abs(dy)) {
        if (dx < 0) next()
        else prev()
      }
    }
  }
  const onPointerUp = (): void => {
    const g = gestureRef.current
    gestureRef.current = null
    if (g !== null && !g.swiped) pressEnd()
  }
  const onPointerCancel = (): void => {
    const g = gestureRef.current
    gestureRef.current = null
    if (g !== null && !g.swiped) cancelPress()
  }

  const clockLabel = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  return (
    <div
      // Transparent above the z-10 App <video> so it shows through while a
      // video plays; a black backdrop stands in for images and while loading.
      className="fixed inset-0 z-20 touch-none select-none"
      onPointerDown={confirmStop ? undefined : onPointerDown}
      onPointerMove={confirmStop ? undefined : onPointerMove}
      onPointerUp={confirmStop ? undefined : onPointerUp}
      onPointerCancel={confirmStop ? undefined : onPointerCancel}
    >
      {!showVideo && <div className="absolute inset-0 bg-black" />}
      {media !== null && media.type === 'image' && (
        <img src={media.url} alt="" className="absolute inset-0 h-full w-full object-contain" />
      )}
      {overlayVisible && frame !== null && (
        <SessionOverlay
          frame={frame}
          clockLabel={clockLabel}
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
