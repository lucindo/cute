import { useEffect, useRef, type RefObject } from 'react'

// Focus an element once on mount, so keyboard/screen-reader users land on a
// known affordance (the back button) instead of stranded at the page top.
export function useFocusOnMount<T extends HTMLElement>(): RefObject<T | null> {
  const ref = useRef<T>(null)
  useEffect(() => {
    ref.current?.focus()
  }, [])
  return ref
}
