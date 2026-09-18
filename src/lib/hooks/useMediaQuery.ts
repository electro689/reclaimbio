import { useEffect, useState } from 'react'

/**
 * Subscribes to a CSS media query and re-renders on change.
 *
 * Initialised from a function so the very first paint already has the correct
 * value — important for the 3D scene, which must not mount a 20k-particle
 * system and then tear it down once we discover we're on mobile.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia(query).matches
  })

  useEffect(() => {
    const mql = window.matchMedia(query)
    const onChange = (e: MediaQueryListEvent) => setMatches(e.matches)

    // Re-sync in case the query changed between render and effect.
    setMatches(mql.matches)
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [query])

  return matches
}

/** True when the user has asked the OS to minimise animation. */
export function useReducedMotion(): boolean {
  return useMediaQuery('(prefers-reduced-motion: reduce)')
}

/** True on phones/tablets by viewport width. */
export function useIsMobile(): boolean {
  return useMediaQuery('(max-width: 768px)')
}

/**
 * True on devices that need the reduced GPU budget: small screens, coarse
 * pointers on narrow viewports (large phones in landscape), or hardware that
 * reports very few cores / little memory.
 *
 * Evaluated once per mount — deliberately not reactive to core counts (they
 * never change at runtime), so the 3D scene never tears down mid-session.
 */
export function useIsWeakDevice(): boolean {
  const isMobile = useIsMobile()
  const isCoarseNarrow = useMediaQuery('(pointer: coarse) and (max-width: 1024px)')
  const [isWeakHardware] = useState(() => {
    if (typeof navigator === 'undefined') return false
    const cores = (navigator as Navigator & { hardwareConcurrency?: number })
      .hardwareConcurrency
    const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory
    return (typeof cores === 'number' && cores <= 4) || (typeof mem === 'number' && mem <= 4)
  })
  return isMobile || isCoarseNarrow || isWeakHardware
}

/**
 * True only for devices with a precise pointer that can hover — i.e. a real
 * mouse or trackpad. Gates the custom cursor and (Stage 4) 3D card tilt, both
 * of which are meaningless or actively harmful on touch.
 */
export function useHasFinePointer(): boolean {
  return useMediaQuery('(hover: hover) and (pointer: fine)')
}
