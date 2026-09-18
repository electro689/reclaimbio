import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useScroll } from '@/lib/scroll-context'
import { lerp, mapRange } from '@/lib/utils'

interface CameraRigProps {
  /** Disables parallax + dolly when the user prefers reduced motion. */
  reducedMotion: boolean
  /** Pointer parallax is meaningless on touch. */
  enableParallax: boolean
}

/**
 * Scroll-driven camera dolly with subtle pointer parallax.
 *
 * Pulling the camera back as the field disperses is what makes scroll 100% feel
 * like standing in open space rather than watching a cloud shrink. The dolly is
 * deliberately non-linear: it holds close through the helix (so the structure
 * fills frame) then retreats hard into the void.
 */
export function CameraRig({ reducedMotion, enableParallax }: CameraRigProps) {
  const { stateRef } = useScroll()
  const camera = useThree((s) => s.camera)

  const pointer = useRef({ x: 0, y: 0 })
  const current = useRef({ x: 0, y: 0, z: 24 })

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05)
    const p = stateRef.current.progress

    // --- Dolly ---
    // 0.0 → 0.5  : 24 → 17   (push in as chaos organises into the helix)
    // 0.5 → 1.0  : 17 → 32   (retreat into the void)
    // The end stop is 32 rather than a wider pull-back: paired with the void
    // shell's 10–30 radius, this keeps the camera inside the starfield instead
    // of retreating until the frame reads as empty.
    const targetZ =
      p < 0.5 ? mapRange(p, 0, 0.5, 24, 17) : mapRange(p, 0.5, 1, 17, 32)

    // --- Pointer parallax ---
    // Read R3F's normalised pointer (-1..1) rather than attaching our own
    // listener; it already accounts for canvas bounds.
    if (enableParallax && !reducedMotion) {
      pointer.current.x = state.pointer.x
      pointer.current.y = state.pointer.y
    }

    // Parallax attenuates as we pull back, so the void stays composed.
    const parallaxStrength = reducedMotion ? 0 : mapRange(p, 0.5, 1, 1.5, 0.4)
    const targetX = pointer.current.x * parallaxStrength
    const targetY = pointer.current.y * parallaxStrength * 0.7

    const k = 1 - Math.exp(-3.2 * dt)
    current.current.x = lerp(current.current.x, targetX, k)
    current.current.y = lerp(current.current.y, targetY, k)
    current.current.z = lerp(current.current.z, targetZ, 1 - Math.exp(-4 * dt))

    camera.position.set(current.current.x, current.current.y, current.current.z)
    camera.lookAt(0, 0, 0)
  })

  return null
}
