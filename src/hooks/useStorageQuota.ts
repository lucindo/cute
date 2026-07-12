// Origin storage quota for the gauge (SPEC FR-19). Usage is NOT read from
// navigator.storage.estimate() — its accounting lags IndexedDB blob writes by
// a lot (Safari especially); the collection sums its own records instead.
// Progressive — null (no quota shown) where the API is missing or fails.

import { useEffect, useState } from 'react'

export function useStorageQuota(): number | null {
  const [quota, setQuota] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    // Reason: lib.dom types navigator.storage as always-present, but older
    // browsers and insecure contexts lack it.
    const manager = navigator.storage as StorageManager | undefined
    if (manager === undefined) return
    manager.estimate().then(
      ({ quota: reported }) => {
        if (!cancelled && reported !== undefined) setQuota(reported)
      },
      () => {
        // A failed estimate only costs the quota half of the gauge.
      },
    )
    return () => {
      cancelled = true
    }
  }, [])

  return quota
}
