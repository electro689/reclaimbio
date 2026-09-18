import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useScroll } from '@/lib/scroll-context'
import { lerp, clamp } from '@/lib/utils'
import {
  createRandom,
  generateCloud,
  generateHelix,
  generateVoid,
  generateAttributes,
} from './particle-formations'
import { particleVertexShader, particleFragmentShader } from './particle-shaders'

interface ParticleFieldProps {
  count: number
  reducedMotion: boolean
  /** Multiplier for sprite size — weak GPUs use <1 to cut overdraw. */
  sizeScale?: number
}

/**
 * The particle field.
 *
 * All three formations are baked into buffer attributes at mount and never
 * touched again. Per frame we write ~5 floats of uniforms; the GPU does the
 * morphing. That's what lets this run 24k particles without a CPU cost that
 * scales with particle count.
 */
export function ParticleField({ count, reducedMotion, sizeScale = 1 }: ParticleFieldProps) {
  const { stateRef } = useScroll()
  const dpr = useThree((s) => s.viewport.dpr)

  const pointsRef = useRef<THREE.Points>(null)
  const materialRef = useRef<THREE.ShaderMaterial>(null)

  // Smoothed scroll progress. Lenis already eases scroll, but we damp again
  // here so the morph never snaps on a scrollbar drag or anchor jump.
  const smoothed = useRef(0)
  const burst = useRef(0)

  // ---- Bake geometry once ----
  // The cloud pose doubles as the built-in `position` attribute (which three
  // requires for draw range anyway), so the vertex shader reads the waste
  // pose straight from `position` — one less 288KB buffer uploaded on desktop
  // and a faster mount on phones.
  const geometry = useMemo(() => {
    // Fresh seeded PRNG per pose keeps poses independent while staying
    // reproducible across reloads.
    const cloud = generateCloud(count, createRandom(0x1a2b))
    const helix = generateHelix(count, createRandom(0x3c4d))
    const voidPose = generateVoid(count, createRandom(0x5e6f))
    const { randoms, scales } = generateAttributes(count, createRandom(0x7a8b))

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(cloud, 3))
    geo.setAttribute('aHelix', new THREE.BufferAttribute(helix, 3))
    geo.setAttribute('aVoid', new THREE.BufferAttribute(voidPose, 3))
    geo.setAttribute('aRandom', new THREE.BufferAttribute(randoms, 1))
    geo.setAttribute('aScale', new THREE.BufferAttribute(scales, 1))

    // Particles travel far outside the cloud bounds during the void phase.
    // A generous manual sphere prevents three from culling the whole field.
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), 80)

    return geo
  }, [count])

  // Release GPU buffers if the field ever unmounts (e.g. HMR, or a
  // viewport crossing the weak-device breakpoint causing a remount).
  useEffect(() => () => geometry.dispose(), [geometry])

  // ---- Uniforms (stable identity; mutated in useFrame) ----
  // Stable across DPR changes: recreating the uniforms object would detach
  // the live material state, so uSize is refreshed in the frame loop instead.
  const uniforms = useMemo(
    () => ({
      uProgress: { value: 0 },
      uTime: { value: 0 },
      uSize: { value: 2.6 },
      uTurbulence: { value: 1 },
      uBurst: { value: 0 },
      uOpacity: { value: 0 }, // fades up on mount
      uColorWaste: { value: new THREE.Color('#39FF14') },
      uColorReclaimed: { value: new THREE.Color('#00F0FF') },
    }),
    [],
  )

  useFrame((_, delta) => {
    const mat = materialRef.current
    if (!mat) return

    // Guard against tab-switch delta spikes, which would otherwise teleport the
    // morph or blow out the burst.
    const dt = Math.min(delta, 0.05)
    const u = mat.uniforms

    // DPR can change at runtime (zoom, monitor move); refresh cheaply without
    // recreating the uniforms object. sizeScale lets weak devices shrink
    // sprites to cut additive overdraw.
    const targetSize = 2.6 * Math.min(dpr, 2) * sizeScale
    if (u.uSize.value !== targetSize) u.uSize.value = targetSize

    const { progress, velocity } = stateRef.current

    // ---- Scroll progress ----
    // Frame-rate independent damping: converges at the same wall-clock rate at
    // 60fps and 144fps.
    const damping = reducedMotion ? 1 : 1 - Math.exp(-6 * dt)
    smoothed.current = lerp(smoothed.current, progress, damping)
    u.uProgress.value = smoothed.current

    u.uTime.value += dt

    // ---- Turbulence ----
    // Chaotic while the field is waste, settled once it's a helix, with a touch
    // returning as it disperses into the void.
    const p = smoothed.current
    const chaos = 1 - Math.min(p / 0.5, 1) // 1 -> 0 across the first half
    const drift = clamp((p - 0.5) / 0.5, 0, 1) * 0.35
    u.uTurbulence.value = reducedMotion ? 0.15 : chaos * 1.15 + drift

    // ---- Velocity burst ----
    // Map |velocity| to a radial kick, then decay it. Gives fast scrolling a
    // sense of acceleration without any looping animation.
    const target = reducedMotion ? 0 : Math.min(Math.abs(velocity) * 0.024, 1.5)
    burst.current = lerp(burst.current, target, 1 - Math.exp(-9 * dt))
    u.uBurst.value = burst.current

    // ---- Mount fade-in ----
    u.uOpacity.value = lerp(u.uOpacity.value, 1, 1 - Math.exp(-2.2 * dt))

    // ---- Whole-field drift ----
    // A slow tilt that keeps the composition alive. Suppressed when the user
    // asked for reduced motion.
    if (pointsRef.current && !reducedMotion) {
      pointsRef.current.rotation.y = u.uTime.value * 0.014
      pointsRef.current.rotation.x = Math.sin(u.uTime.value * 0.09) * 0.05
    }
  })

  return (
    <points ref={pointsRef} geometry={geometry} frustumCulled={false}>
      <shaderMaterial
        ref={materialRef}
        vertexShader={particleVertexShader}
        fragmentShader={particleFragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        // Additive blending is what sells the bioluminescence: overlapping
        // particles accumulate into hot cores instead of flatly occluding.
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
}
