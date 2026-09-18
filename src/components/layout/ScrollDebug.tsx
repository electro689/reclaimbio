import { useEffect, useRef } from 'react'
import { useScroll } from '@/lib/scroll-context'
import { useIsMobile, useReducedMotion } from '@/lib/hooks/useMediaQuery'

/**
 * TEMPORARY — Stage 2 verification HUD.
 *
 * Displays live scroll progress, the active formation phase and measured FPS so
 * the scroll-driven morph can be checked against the brief's timeline rather
 * than eyeballed. Delete this component (and its mount in App.tsx) before
 * Stage 3.
 *
 * Writes to the DOM directly from a rAF loop — no state, no re-renders, so the
 * HUD itself doesn't distort the FPS it's reporting.
 */
export function ScrollDebug() {
  const { stateRef } = useScroll()
  const isMobile = useIsMobile()
  const reducedMotion = useReducedMotion()

  const progressRef = useRef<HTMLSpanElement>(null)
  const phaseRef = useRef<HTMLSpanElement>(null)
  const velocityRef = useRef<HTMLSpanElement>(null)
  const fpsRef = useRef<HTMLSpanElement>(null)
  const barRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let rafId = 0
    let frames = 0
    let lastFpsUpdate = performance.now()
    let lastProgress = -1
    let lastVelocity = Number.NaN
    let lastPhase = ''

    const tick = () => {
      const { progress, velocity } = stateRef.current

      // Text + bar writes are throttled to when values actually change — the
      // HUD previously touched the DOM every frame, which is pure overhead on
      // the phones it's meant to help diagnose.
      if (progress !== lastProgress) {
        lastProgress = progress
        if (progressRef.current) {
          progressRef.current.textContent = `${(progress * 100).toFixed(1)}%`
        }
        if (barRef.current) {
          barRef.current.style.transform = `scaleX(${progress})`
        }
        let phase: string
        let color: string
        if (progress < 0.16) {
          phase = 'CHAOTIC CLOUD'
          color = 'var(--color-toxic)'
        } else if (progress < 0.42) {
          phase = 'ORGANISING →'
          color = '#9dff6b'
        } else if (progress < 0.62) {
          phase = 'POLYMER HELIX'
          color = 'var(--color-biolum)'
        } else if (progress < 0.9) {
          phase = 'DISPERSING →'
          color = 'var(--color-biolum)'
        } else {
          phase = 'STARLIT VOID'
          color = '#8fd8e0'
        }
        if (phase !== lastPhase) {
          lastPhase = phase
          if (phaseRef.current) {
            phaseRef.current.textContent = phase
            phaseRef.current.style.color = color
          }
        }
      }
      const roundedVelocity = Math.round(velocity * 10) / 10
      if (roundedVelocity !== lastVelocity) {
        lastVelocity = roundedVelocity
        if (velocityRef.current) {
          velocityRef.current.textContent = roundedVelocity.toFixed(1).padStart(6, ' ')
        }
      }

      frames++
      const now = performance.now()
      if (now - lastFpsUpdate >= 500) {
        const fps = Math.round((frames * 1000) / (now - lastFpsUpdate))
        if (fpsRef.current) {
          fpsRef.current.textContent = String(fps).padStart(3, ' ')
          fpsRef.current.style.color =
            fps >= 55 ? 'var(--color-toxic)' : fps >= 35 ? '#ffcc00' : '#ff4444'
        }
        frames = 0
        lastFpsUpdate = now
      }

      rafId = requestAnimationFrame(tick)
    }
    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  }, [stateRef])

  return (
    <div
      className="pointer-events-none fixed bottom-6 left-6 z-50 w-60 rounded-lg border border-ash-100/10 p-4 font-mono text-[11px] leading-relaxed"
      style={{
        fontVariantNumeric: 'tabular-nums',
        // Solid (not `glass`): backdrop-blur over a fullscreen animated canvas
        // forces the compositor to re-sample the WebGL layer every frame —
        // brutal on phones, for a temporary debug panel.
        backgroundColor: 'color-mix(in oklab, var(--color-void) 88%, transparent)',
      }}
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="tracking-[0.2em] text-ash-500 uppercase">Scroll Engine</span>
        <span ref={fpsRef} className="text-ash-300">
          --
        </span>
      </div>

      <div className="mb-3 h-px w-full overflow-hidden bg-ash-100/10">
        <div
          ref={barRef}
          className="h-full w-full origin-left"
          style={{ backgroundColor: 'var(--color-biolum)', transform: 'scaleX(0)' }}
        />
      </div>

      <div className="flex justify-between text-ash-500">
        <span>progress</span>
        <span ref={progressRef} className="text-ash-100">
          0.0%
        </span>
      </div>
      <div className="flex justify-between text-ash-500">
        <span>velocity</span>
        <span ref={velocityRef} className="text-ash-300">
          0.0
        </span>
      </div>
      <div className="mt-2 flex justify-between border-t border-ash-100/10 pt-2 text-ash-500">
        <span>phase</span>
        <span ref={phaseRef} className="font-semibold">
          --
        </span>
      </div>
      <div className="mt-2 flex justify-between text-[10px] text-ash-700">
        <span>{isMobile ? 'MOBILE 3.2k' : 'DESKTOP 24k'}</span>
        <span>{reducedMotion ? 'RM: ON' : 'RM: OFF'}</span>
      </div>
    </div>
  )
}
