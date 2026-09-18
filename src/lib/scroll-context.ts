import { createContext, useContext } from 'react'
import type Lenis from 'lenis'
import type { RefObject } from 'react'

export interface ScrollState {
  /** Normalised document scroll progress, 0 → 1. */
  progress: number
  /** Raw scroll offset in px. */
  scroll: number
  /** Instantaneous scroll velocity (px/frame, signed). */
  velocity: number
  /** Scroll direction: 1 down, -1 up, 0 idle. */
  direction: number
}

export interface ScrollContextValue {
  /**
   * Live scroll state as a ref.
   *
   * Intentionally a ref rather than React state: the 3D scene samples this
   * inside its requestAnimationFrame loop. Putting it in state would trigger a
   * React re-render on every scroll event and destroy frame budget.
   *
   * For components that genuinely need to *render* on scroll change, subscribe
   * via `useScrollProgress()` which throttles into state.
   */
  stateRef: RefObject<ScrollState>
  /** The Lenis instance, once mounted. Null during first render. */
  lenis: Lenis | null
}

export const ScrollContext = createContext<ScrollContextValue | null>(null)

/**
 * Access the live scroll ref. Safe to call anywhere inside <SmoothScroll>.
 * Returns a stable object; read `.stateRef.current` inside animation frames.
 */
export function useScroll(): ScrollContextValue {
  const ctx = useContext(ScrollContext)
  if (!ctx) {
    throw new Error('useScroll must be used within <SmoothScroll>')
  }
  return ctx
}
