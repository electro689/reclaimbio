import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { ParticleField } from './ParticleField'
import { CameraRig } from './CameraRig'
import {
  useIsWeakDevice,
  useReducedMotion,
  useHasFinePointer,
} from '@/lib/hooks/useMediaQuery'

/** Full-fat particle count for desktop. */
const PARTICLE_COUNT_DESKTOP = 24000
/**
 * Mobile budget — vertex count is cheap, but every particle is a billboarded
 * sprite that costs fragment shading + additive overdraw, and phone GPUs are
 * fill-rate bound. ~3.2k keeps the cloud/helix/void readable on a small
 * screen while cutting both vertex and fill cost by a third versus 4.8k.
 * Applied at mount (not after) so we never allocate the large buffers on a
 * device that can't afford them.
 */
const PARTICLE_COUNT_MOBILE = 3200

/**
 * Fixed full-viewport WebGL layer that sits behind all HTML content.
 *
 * Why `position: fixed` + `-z-10`: the canvas must not scroll. The entire
 * scroll narrative is expressed through uniforms driven by scroll progress, so
 * the canvas stays pinned while content moves over it.
 *
 * `pointer-events-none` is essential — without it the canvas would swallow
 * every click and hover intended for the UI overlay above it.
 */
export function Scene3D() {
  const isWeak = useIsWeakDevice()
  const reducedMotion = useReducedMotion()
  const hasFinePointer = useHasFinePointer()

  const count = isWeak ? PARTICLE_COUNT_MOBILE : PARTICLE_COUNT_DESKTOP

  return (
    <div
      className="pointer-events-none fixed inset-0 -z-10"
      aria-hidden="true"
      // The canvas is decorative; its meaning is conveyed by the HTML overlay.
    >
      <Canvas
        // Phone GPUs are fill-rate bound: shading a fullscreen additive field
        // at DPR 1.25+ costs far more than it gains on a 6" screen, so weak
        // devices render at exactly 1x. Desktop keeps a modest 1.5 cap.
        dpr={isWeak ? 1 : [1, 1.5]}
        camera={{ position: [0, 0, 24], fov: 55, near: 0.1, far: 200 }}
        gl={{
          antialias: false, // pointless for round point sprites; costs fill rate
          alpha: true,
          powerPreference: isWeak ? 'low-power' : 'high-performance',
          stencil: false,
          depth: false, // additive, depth-write-off particles need no depth buffer
        }}
        // Transparent clear so the CSS void colour shows through.
        onCreated={({ gl }) => gl.setClearColor(0x000000, 0)}
      >
        <Suspense fallback={null}>
          <CameraRig reducedMotion={reducedMotion} enableParallax={hasFinePointer} />
          <ParticleField
            count={count}
            reducedMotion={reducedMotion}
            // Smaller sprites on weak GPUs: overdraw in the dense core is the
            // single biggest phone cost, and it scales with sprite area.
            sizeScale={isWeak ? 0.8 : 1}
          />
        </Suspense>
      </Canvas>
    </div>
  )
}
