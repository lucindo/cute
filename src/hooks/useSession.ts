// Session orchestration: owns the pure machine's state, drives it with a
// wall-clock tick, loads the current source's media from IndexedDB, persists on
// completion, and holds a wake lock for the session's lifetime. All timing
// decisions live in the machine (domain/sessionMachine); this hook only injects
// Date.now() and the DOM.

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react'

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
  readonly pressStart: () => void
  readonly pressEnd: () => void
  readonly cancelPress: () => void
  readonly next: () => void
  readonly prev: () => void
  readonly stop: () => void
}

type SessionSetState = Dispatch<SetStateAction<SessionState>>

type SessionControls = Pick<
  UseSession,
  'pressStart' | 'pressEnd' | 'cancelPress' | 'next' | 'prev' | 'stop'
>

// Wall-clock drivers for a running session: the tick that advances the machine
// (and may complete it), the lifetime wake lock (progressive; FR-39), and the
// visibility listener that truncates an active hold on backgrounding (FR-38).
function useSessionRuntime(
  status: SessionState['status'],
  setState: SessionSetState,
  setNow: Dispatch<SetStateAction<number>>,
): void {
  const { request: acquireWakeLock, release: releaseWakeLock } = useWakeLock()

  useEffect(() => {
    if (status !== 'running') return undefined
    const id = setInterval(() => {
      const t = Date.now()
      setNow(t)
      setState((s) => (s.status === 'running' ? tick(s, t) : s))
    }, TICK_MS)
    return () => {
      clearInterval(id)
    }
  }, [status, setState, setNow])

  useEffect(() => {
    void acquireWakeLock()
    return () => {
      void releaseWakeLock()
    }
  }, [acquireWakeLock, releaseWakeLock])

  useEffect(() => {
    const onHidden = (): void => {
      if (document.visibilityState === 'visible') return
      setState((s) => (s.status === 'running' ? hide(s, Date.now()) : s))
    }
    document.addEventListener('visibilitychange', onHidden)
    return () => {
      document.removeEventListener('visibilitychange', onHidden)
    }
  }, [setState])
}

// Persist once on completion (FR-43). Best-effort: v1 has no recovery path or
// error surface, so a failed write loses the record.
function useSessionPersistence(state: SessionState): void {
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
}

// Load the current source's media; revoke the prior object URL on change.
function useSessionMedia(currentSourceId: string | null): SessionMedia | null {
  const [media, setMedia] = useState<SessionMedia | null>(null)
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
  return media
}

// Gesture/navigation commands. All memoized on the stable setters; pressEnd
// reads the latest state via a ref since it branches on the machine's result.
function useSessionControls(state: SessionState, setState: SessionSetState): SessionControls {
  const stateRef = useRef<SessionState>(state)
  useEffect(() => {
    stateRef.current = state
  }, [state])

  const doPressStart = useCallback(() => {
    setState((s) => (s.status === 'running' ? pressStart(s, Date.now()) : s))
  }, [setState])

  const doPressEnd = useCallback(() => {
    const s = stateRef.current
    if (s.status !== 'running') return
    setState(pressEnd(s, Date.now()).session)
  }, [setState])

  const doCancelPress = useCallback(() => {
    setState((s) => (s.status === 'running' ? cancelPress(s) : s))
  }, [setState])

  const next = useCallback(() => {
    setState((s) => (s.status === 'running' ? advance(s, Math.random) : s))
  }, [setState])

  const prev = useCallback(() => {
    setState((s) => (s.status === 'running' ? back(s) : s))
  }, [setState])

  const doStop = useCallback(() => {
    setState((s) => (s.status === 'running' ? stop(s, Date.now()) : s))
  }, [setState])

  return {
    pressStart: doPressStart,
    pressEnd: doPressEnd,
    cancelPress: doCancelPress,
    next,
    prev,
    stop: doStop,
  }
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

  useSessionRuntime(state.status, setState, setNow)
  useSessionPersistence(state)
  const currentSourceId = state.status === 'running' ? currentSource(state) : null
  const media = useSessionMedia(currentSourceId)
  const controls = useSessionControls(state, setState)

  return {
    state,
    frame: state.status === 'running' ? sessionFrame(state, now) : null,
    summary: state.status === 'complete' ? summarize(state.record, state.holds) : null,
    media,
    ...controls,
  }
}
