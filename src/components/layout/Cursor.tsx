import { useEffect, useRef } from 'react'
import { lerp } from '@/lib/utils'
import { useHasFinePointer, useReducedMotion } from '@/lib/hooks/useMediaQuery'

/**
 * Custom cursor: a hard bioluminescent dot that tracks the pointer 1:1, plus a
 * lerped outer ring that trails behind and swells over interactive targets.
 *
 * Performance notes:
 *  - Position is written straight to `style.transform` inside a single rAF loop.
 *    No React state is involved, so pointer movement costs zero re-renders.
 *  - `translate3d` keeps both layers on the compositor.
 *  - Hover detection uses `closest()` against a selector list so nested markup
 *    (an icon inside a button) still reports as interactive.
 */
export function Cursor() {
  const hasFinePointer = useHasFinePointer()
  const prefersReducedMotion = useReducedMotion()

  const dotRef = useRef<HTMLDivElement>(null)
  const ringRef = useRef<HTMLDivElement>(null)

  // Mutable pointer state, deliberately outside React.
  const target = useRef({ x: -100, y: -100 })
  const ring = useRef({ x: -100, y: -100 })
  const scale = useRef({ current: 1, target: 1 })
  const visible = useRef(false)

  const enabled = hasFinePointer

  useEffect(() => {
    if (!enabled) return

    // Mark the body so CSS can hide the native cursor. Scoped to a class so
    // touch devices never lose their default behaviour.
    document.body.classList.add('has-custom-cursor')

    const INTERACTIVE = 'a, button, [role="button"], input, textarea, select, [data-cursor-hover]'

    const onPointerMove = (e: PointerEvent) => {
      target.current.x = e.clientX
      target.current.y = e.clientY

      if (!visible.current) {
        // First sighting: snap the ring so it doesn't fly in from origin.
        ring.current.x = e.clientX
        ring.current.y = e.clientY
        visible.current = true
        if (dotRef.current) dotRef.current.style.opacity = '1'
        if (ringRef.current) ringRef.current.style.opacity = '1'
      }

      const el = e.target as Element | null
      const isInteractive = !!el?.closest?.(INTERACTIVE)
      scale.current.target = isInteractive ? 2.4 : 1
    }

    const onPointerDown = () => {
      scale.current.target *= 0.7
    }
    const onPointerUp = () => {
      scale.current.target = scale.current.target > 1.5 ? 2.4 : 1
    }

    const onPointerLeave = () => {
      visible.current = false
      if (dotRef.current) dotRef.current.style.opacity = '0'
      if (ringRef.current) ringRef.current.style.opacity = '0'
    }

    window.addEventListener('pointermove', onPointerMove, { passive: true })
    window.addEventListener('pointerdown', onPointerDown, { passive: true })
    window.addEventListener('pointerup', onPointerUp, { passive: true })
    document.addEventListener('pointerleave', onPointerLeave)

    let rafId = 0
    // Last painted values — when the mouse sits still and the scale has
    // settled, there is nothing new to paint, so skip the DOM writes instead
    // of churning the compositor at 60fps for a static cursor.
    let paintedX = -1
    let paintedY = -1
    let paintedRingX = -1
    let paintedRingY = -1
    let paintedScale = -1
    const render = () => {
      // Reduced motion: no trailing lag, ring locks to the pointer.
      const follow = prefersReducedMotion ? 1 : 0.18
      ring.current.x = lerp(ring.current.x, target.current.x, follow)
      ring.current.y = lerp(ring.current.y, target.current.y, follow)
      scale.current.current = lerp(
        scale.current.current,
        scale.current.target,
        prefersReducedMotion ? 1 : 0.2,
      )

      if (
        dotRef.current &&
        (target.current.x !== paintedX || target.current.y !== paintedY)
      ) {
        paintedX = target.current.x
        paintedY = target.current.y
        dotRef.current.style.transform =
          `translate3d(${target.current.x}px, ${target.current.y}px, 0) translate(-50%, -50%)`
      }
      if (
        ringRef.current &&
        (ring.current.x !== paintedRingX ||
          ring.current.y !== paintedRingY ||
          scale.current.current !== paintedScale)
      ) {
        paintedRingX = ring.current.x
        paintedRingY = ring.current.y
        paintedScale = scale.current.current
        ringRef.current.style.transform =
          `translate3d(${ring.current.x}px, ${ring.current.y}px, 0) translate(-50%, -50%) scale(${scale.current.current})`
      }

      rafId = requestAnimationFrame(render)
    }
    rafId = requestAnimationFrame(render)

    return () => {
      cancelAnimationFrame(rafId)
      document.body.classList.remove('has-custom-cursor')
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('pointerup', onPointerUp)
      document.removeEventListener('pointerleave', onPointerLeave)
    }
  }, [enabled, prefersReducedMotion])

  // Touch / coarse pointer: render nothing and keep the native cursor.
  if (!enabled) return null

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-100 select-none">
      {/* Trailing ring */}
      <div
        ref={ringRef}
        className="fixed top-0 left-0 h-8 w-8 rounded-full opacity-0 transition-opacity duration-300 will-change-transform"
        style={{
          border: '1px solid color-mix(in oklab, var(--color-biolum) 45%, transparent)',
          boxShadow:
            '0 0 12px -2px color-mix(in oklab, var(--color-biolum) 35%, transparent), inset 0 0 8px -4px color-mix(in oklab, var(--color-biolum) 30%, transparent)',
        }}
      />
      {/* Core dot */}
      <div
        ref={dotRef}
        className="fixed top-0 left-0 h-1.5 w-1.5 rounded-full opacity-0 transition-opacity duration-300 will-change-transform"
        style={{
          backgroundColor: 'var(--color-biolum)',
          boxShadow:
            '0 0 10px color-mix(in oklab, var(--color-biolum) 90%, transparent), 0 0 28px color-mix(in oklab, var(--color-biolum) 55%, transparent)',
        }}
      />
    </div>
  )
}
