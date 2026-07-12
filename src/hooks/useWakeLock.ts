// React hook wrapping the Screen Wake Lock API (navigator.wakeLock). Ported
// from HRV. Silently absorbs an absent API and any rejection — the wake lock is
// progressive enhancement (SPEC FR-39); the session must work without it.
//
// Two refs hold the state:
//   sentinelRef    — the live WakeLockSentinel (null when not held)
//   wasAcquiredRef — true between request() and release(); stays true through
//                    OS-initiated releases so the visibility path can re-acquire.

import { useCallback, useEffect, useRef } from 'react'

export interface UseWakeLock {
  request(this: void): Promise<void>
  release(this: void): Promise<void>
}

export function useWakeLock(): UseWakeLock {
  const sentinelRef = useRef<WakeLockSentinel | null>(null)
  const wasAcquiredRef = useRef<boolean>(false)
  const requestInFlightRef = useRef<boolean>(false)
  // Monotonic generation token: stamped before the await in request(), bumped in
  // release()/unmount. A post-await mismatch means a release/unmount/newer request
  // ran during the await, so the freshly-acquired sentinel is discarded.
  const requestGenerationRef = useRef<number>(0)

  const request = useCallback(async (): Promise<void> => {
    if (!('wakeLock' in navigator)) return
    if (sentinelRef.current !== null) return
    if (requestInFlightRef.current) return
    const gen = requestGenerationRef.current
    try {
      requestInFlightRef.current = true
      const sentinel = await navigator.wakeLock.request('screen')
      if (gen !== requestGenerationRef.current) {
        void sentinel.release().catch(() => undefined)
        return
      }
      sentinelRef.current = sentinel
      wasAcquiredRef.current = true
      sentinel.addEventListener(
        'release',
        () => {
          if (sentinelRef.current === sentinel) sentinelRef.current = null
        },
        { once: true },
      )
    } catch {
      // Absorb NotAllowedError / SecurityError / older-stub throws.
    } finally {
      requestInFlightRef.current = false
    }
  }, [])

  const release = useCallback(async (): Promise<void> => {
    requestGenerationRef.current += 1
    wasAcquiredRef.current = false
    const sentinel = sentinelRef.current
    sentinelRef.current = null
    if (sentinel !== null) {
      try {
        await sentinel.release()
      } catch {
        // Best-effort release.
      }
    }
  }, [])

  useEffect(() => {
    const onVisibility = (): void => {
      if (document.visibilityState !== 'visible') return
      if (!wasAcquiredRef.current) return
      if (sentinelRef.current !== null) return
      void request()
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      requestGenerationRef.current += 1
      const sentinel = sentinelRef.current
      sentinelRef.current = null
      wasAcquiredRef.current = false
      if (sentinel !== null) void sentinel.release().catch(() => {})
    }
  }, [request])

  return { request, release }
}
