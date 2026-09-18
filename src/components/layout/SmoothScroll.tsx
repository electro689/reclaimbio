import { useEffect, useRef, useState, type ReactNode } from 'react'
import Lenis from 'lenis'
import { ScrollContext, type ScrollState } from '@/lib/scroll-context'
import { useReducedMotion } from '@/lib/hooks/useMediaQuery'

interface SmoothScrollProps {
  children: ReactNode
}

/**
 * Lenis smooth-scroll provider.
 *
 * Runs Lenis on its own rAF loop and publishes scroll state into a ref that the
 * 3D scene reads per-frame. Deliberately renders no wrapper element — Lenis
 * drives `window` scroll, so an extra transformed div would create a containing
 * block and break `position: fixed` on the navbar, cursor and canvas.
 *
 * When `prefers-reduced-motion` is set, Lenis is not instantiated at all:
 * native scrolling stays intact and we fall back to a passive scroll listener
 * so scroll-driven visuals still track position, just without inertia.
 */
export function SmoothScroll({ children }: SmoothScrollProps) {
  const prefersReducedMotion = useReducedMotion()
  const [lenis, setLenis] = useState<Lenis | null>(null)

  const stateRef = useRef<ScrollState>({
    progress: 0,
    scroll: 0,
    velocity: 0,
    direction: 0,
  })

  useEffect(() => {
    // ---- Reduced motion: no Lenis, but keep scroll state flowing. ----
    if (prefersReducedMotion) {
      const onScroll = () => {
        const max = document.documentElement.scrollHeight - window.innerHeight
        const scroll = window.scrollY
        stateRef.current.scroll = scroll
        stateRef.current.progress = max > 0 ? scroll / max : 0
        stateRef.current.velocity = 0
        stateRef.current.direction = 0
      }
      onScroll()
      window.addEventListener('scroll', onScroll, { passive: true })
      window.addEventListener('resize', onScroll)
      return () => {
        window.removeEventListener('scroll', onScroll)
        window.removeEventListener('resize', onScroll)
      }
    }

    // ---- Full experience: Lenis inertial scrolling. ----
    // autoRaf lets Lenis drive itself on its own internal loop instead of us
    // running a second permanent requestAnimationFrame next to the WebGL one.
    const instance = new Lenis({
      autoRaf: true,
      duration: 1.2,
      // Exponential ease-out: fast pickup, long cinematic settle.
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 1.6,
      // Touch devices get native scroll — inertia-on-inertia feels broken.
      syncTouch: false,
    })

    instance.on(
      'scroll',
      ({ scroll, limit, velocity, direction }: Lenis) => {
        stateRef.current.scroll = scroll
        stateRef.current.progress = limit > 0 ? scroll / limit : 0
        stateRef.current.velocity = velocity
        stateRef.current.direction = direction
      },
    )

    setLenis(instance)

    return () => {
      instance.destroy()
      setLenis(null)
    }
  }, [prefersReducedMotion])

  return (
    <ScrollContext.Provider value={{ stateRef, lenis }}>
      {children}
    </ScrollContext.Provider>
  )
}
