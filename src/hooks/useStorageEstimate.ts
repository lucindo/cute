// Storage gauge data (SPEC FR-19): navigator.storage.estimate(), refreshed
// whenever the collection changes. Progressive — null (no gauge) where the
// API is missing or the estimate fails.

import { useEffect, useState } from 'react'

import { COLLECTION_CHANGED_EVENT } from './useCollection'

export interface StorageUsage {
  usage: number
  quota: number
}

export function useStorageEstimate(): StorageUsage | null {
  const [estimate, setEstimate] = useState<StorageUsage | null>(null)

  useEffect(() => {
    let cancelled = false
    const load = (): void => {
      // Reason: lib.dom types navigator.storage as always-present, but older
      // browsers and insecure contexts lack it.
      const manager = navigator.storage as StorageManager | undefined
      if (manager === undefined) return
      manager.estimate().then(
        ({ usage, quota }) => {
          if (!cancelled && usage !== undefined && quota !== undefined) {
            setEstimate({ usage, quota })
          }
        },
        () => {
          // A failed estimate only costs the gauge; the collection still works.
        },
      )
    }
    load()
    window.addEventListener(COLLECTION_CHANGED_EVENT, load)
    return () => {
      cancelled = true
      window.removeEventListener(COLLECTION_CHANGED_EVENT, load)
    }
  }, [])

  return estimate
}
