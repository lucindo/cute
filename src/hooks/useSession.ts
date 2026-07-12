// Session orchestration: owns the pure machine's state, drives it with a
// wall-clock tick, loads the current source's media from IndexedDB, persists on
// completion, and holds a wake lock for the session's lifetime. All timing
// decisions live in the machine (domain/sessionMachine); this hook only injects
// Date.now() and the DOM.

import { useCallback, useEffect, useRef, useState } from 'react'

import { newId } from '../domain/id'
import {
  advance,
  back,
  cancelPress,
  currentSource,
  hide,
  pressEnd,
  pressStart,
  sessionFrame,
  startSession,
  stop,
  summarize,
  tick,
  type SessionFrame,
  type SessionState,
  type SessionSummary,
} from '../domain/sessionMachine'
import { getRecord, openDb, saveCompletedSession, type SourceType } from '../storage'
import { useWakeLock } from './useWakeLock'

const TICK_MS = 250

export interface SessionRequest {
  readonly sourceIds: readonly string[]
  readonly plannedMinutes: number
  readonly tagFilter: readonly string[]
}

export interface SessionMedia {
  readonly url: string
  readonly type: SourceType
}

export interface UseSession {
  readonly state: SessionState
  readonly frame: SessionFrame | null
  readonly summary: SessionSummary | null
  readonly media: SessionMedia | null
  readonly overlayVisible: boolean
  readonly pressStart: () => void
  readonly pressEnd: () => void
  readonly cancelPress: () => void
  readonly next: () => void
  readonly prev: () => void
  readonly stop: () => void
  readonly toggleOverlay: () => void
}

export function useSession(request: SessionRequest): UseSession {
  const [state, setState] = useState<SessionState>(() =>
    startSession(
      {
        id: newId(),
        sourceIds: request.sourceIds,
        plannedMinutes: request.plannedMinutes,
        tagFilter: [...request.tagFilter],
        startedAt: Date.now(),
      },
      Math.random,
    ),
  )
  const [now, setNow] = useState<number>(() => Date.now())
  const [overlayVisible, setOverlayVisible] = useState<boolean>(true)
  const [media, setMedia] = useState<SessionMedia | null>(null)

  // Latest state for the one gesture handler that branches on its result.
  const stateRef = useRef<SessionState>(state)
  useEffect(() => {
    stateRef.current = state
  }, [state])

  const { request: acquireWakeLock, release: releaseWakeLock } = useWakeLock()

  // Wall-clock tick while running; a tick may complete the session.
  useEffect(() => {
    if (state.status !== 'running') return undefined
    const id = setInterval(() => {
      const t = Date.now()
      setNow(t)
      setState((s) => (s.status === 'running' ? tick(s, t) : s))
    }, TICK_MS)
    return () => {
      clearInterval(id)
    }
  }, [state.status])

  // Wake lock for the session's lifetime (progressive; FR-39).
  useEffect(() => {
    void acquireWakeLock()
    return () => {
      void releaseWakeLock()
    }
  }, [acquireWakeLock, releaseWakeLock])

  // Backgrounding truncates any active hold (FR-38); the next tick resolves expiry.
  useEffect(() => {
    const onHidden = (): void => {
      if (document.visibilityState === 'visible') return
      setState((s) => (s.status === 'running' ? hide(s, Date.now()) : s))
    }
    document.addEventListener('visibilitychange', onHidden)
    return () => {
      document.removeEventListener('visibilitychange', onHidden)
    }
  }, [])

  // Persist once on completion (FR-43). Best-effort: v1 has no recovery path or
  // error surface, so a failed write loses the record.
  const persistedRef = useRef<boolean>(false)
  useEffect(() => {
    if (state.status !== 'complete' || persistedRef.current) return
    persistedRef.current = true
    const { record, holds } = state
    void (async () => {
      const opened = await openDb()
      if (!opened.ok) return
      await saveCompletedSession(opened.value, record, holds)
      opened.value.close()
    })()
  }, [state])

  // Load the current source's media; revoke the prior object URL on change.
  const currentSourceId = state.status === 'running' ? currentSource(state) : null
  useEffect(() => {
    if (currentSourceId === null) return undefined
    const active = { current: true }
    let objectUrl: string | null = null
    void (async () => {
      const opened = await openDb()
      if (!opened.ok) return
      const [src, blob] = await Promise.all([
        getRecord(opened.value, 'sources', currentSourceId),
        getRecord(opened.value, 'blobs', currentSourceId),
      ])
      opened.value.close()
      if (!active.current || !src.ok || !blob.ok || src.value === null || blob.value === null) return
      objectUrl = URL.createObjectURL(new Blob([blob.value.bytes], { type: blob.value.type }))
      setMedia({ url: objectUrl, type: src.value.type })
    })()
    return () => {
      active.current = false
      if (objectUrl !== null) URL.revokeObjectURL(objectUrl)
    }
  }, [currentSourceId])

  const doPressStart = useCallback(() => {
    setState((s) => (s.status === 'running' ? pressStart(s, Date.now()) : s))
  }, [])

  const doPressEnd = useCallback(() => {
    const s = stateRef.current
    if (s.status !== 'running') return
    const { session, wasHold } = pressEnd(s, Date.now())
    setState(session)
    if (!wasHold) setOverlayVisible((v) => !v) // tap toggles the overlay (FR-29)
  }, [])

  const doCancelPress = useCallback(() => {
    setState((s) => (s.status === 'running' ? cancelPress(s) : s))
  }, [])

  const next = useCallback(() => {
    setState((s) => (s.status === 'running' ? advance(s, Math.random) : s))
  }, [])

  const prev = useCallback(() => {
    setState((s) => (s.status === 'running' ? back(s) : s))
  }, [])

  const doStop = useCallback(() => {
    setState((s) => (s.status === 'running' ? stop(s, Date.now()) : s))
  }, [])

  const toggleOverlay = useCallback(() => {
    setOverlayVisible((v) => !v)
  }, [])

  return {
    state,
    frame: state.status === 'running' ? sessionFrame(state, now) : null,
    summary: state.status === 'complete' ? summarize(state.record, state.holds) : null,
    media,
    overlayVisible,
    pressStart: doPressStart,
    pressEnd: doPressEnd,
    cancelPress: doCancelPress,
    next,
    prev,
    stop: doStop,
    toggleOverlay,
  }
}
