/**
 * Particle formation generators.
 *
 * Each function fills a Float32Array with xyz triples describing one "pose" of
 * the particle field. All three poses are uploaded to the GPU once as separate
 * buffer attributes; the vertex shader then interpolates between them based on
 * scroll progress. Nothing here runs per-frame.
 *
 * Poses are index-stable: particle `i` occupies index `i` in every pose, so the
 * morph reads as the same speck of matter travelling between states rather than
 * a crossfade between two unrelated clouds.
 */

const TAU = Math.PI * 2

/**
 * Deterministic PRNG (mulberry32).
 *
 * Seeded on purpose: Math.random() would reshuffle the field on every hot
 * reload, making it impossible to judge whether a visual change came from the
 * code or the dice.
 */
export function createRandom(seed = 0x5eed) {
  let a = seed >>> 0
  return function random(): number {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * POSE 1 — WASTE (scroll 0).
 *
 * A dense, chaotic blob. Radius uses a cube-root-biased distribution pulled
 * toward the centre (pow 0.45 rather than the uniform 1/3) so the core reads as
 * compacted refuse rather than an evenly-filled ball. Per-axis jitter breaks up
 * any lingering sphericity — this should feel like a mass, not a planet.
 */
export function generateCloud(count: number, random: () => number): Float32Array {
  const positions = new Float32Array(count * 3)
  const RADIUS = 8.6

  for (let i = 0; i < count; i++) {
    const i3 = i * 3

    // Uniform direction on the unit sphere.
    const theta = random() * TAU
    const phi = Math.acos(2 * random() - 1)

    // Radius distribution. Exponent 0.72 (vs. a uniform 1/3) still favours the
    // centre but no longer crushes particles into a core so dense that additive
    // blending clips it to white and loses the toxic green.
    const r = Math.pow(random(), 0.72) * RADIUS

    const sinPhi = Math.sin(phi)
    positions[i3] = r * sinPhi * Math.cos(theta)
    positions[i3 + 1] = r * Math.cos(phi) * 0.82 // slight vertical squash
    positions[i3 + 2] = r * sinPhi * Math.sin(theta)

    // Turbulent displacement — the "chaos" of the brief.
    positions[i3] += (random() - 0.5) * 2.4
    positions[i3 + 1] += (random() - 0.5) * 2.4
    positions[i3 + 2] += (random() - 0.5) * 2.4
  }

  return positions
}

/**
 * POSE 2 — RECLAIMED (scroll 50%).
 *
 * A double helix: the structured counterpart to the cloud, and the obvious
 * visual language for an enzyme company. Two antiparallel strands (offset by
 * PI) plus base-pair rungs bridging them.
 *
 * ~16% of particles become rungs, distributed by index rather than randomly so
 * the ladder spacing stays regular.
 */
export function generateHelix(count: number, random: () => number): Float32Array {
  const positions = new Float32Array(count * 3)
  const RADIUS = 3.6
  // Tuned against CameraRig's z=17 hold and a 55° fov, where the visible frame
  // is ~17.7 units tall. 12.5 leaves headroom for the shader's breathing
  // offset and drift so the helix never clips the top or bottom of frame.
  const HEIGHT = 12.5
  // Pitch (HEIGHT / TURNS) ≈ 5.7 units per turn — wide enough that the two
  // strands stay visually distinct instead of merging into a single coil.
  const TURNS = 2.2

  for (let i = 0; i < count; i++) {
    const i3 = i * 3
    const t = i / count

    const y = (t - 0.5) * HEIGHT
    const angle = t * TURNS * TAU

    // Every 6th particle bridges the strands as a base pair.
    const isRung = i % 6 === 0

    if (isRung) {
      // Interpolate across the ladder rung, strand A → strand B.
      const across = random() * 2 - 1
      positions[i3] = Math.cos(angle) * RADIUS * across
      positions[i3 + 1] = y
      positions[i3 + 2] = Math.sin(angle) * RADIUS * across
    } else {
      // Alternate strands so both are evenly populated. Offsetting the second
      // strand's radius slightly (RADIUS vs RADIUS * 0.88) keeps the two
      // ribbons readable as separate strands where they cross in projection.
      const isStrandA = i % 2 === 0
      const a = angle + (isStrandA ? 0 : Math.PI)
      const r = isStrandA ? RADIUS : RADIUS * 0.88
      positions[i3] = Math.cos(a) * r
      positions[i3 + 1] = y
      positions[i3 + 2] = Math.sin(a) * r
    }

    // Thin jitter: enough to give the strands body, not enough to blur the two
    // ribbons into one tube (0.22 did exactly that).
    const j = isRung ? 0.07 : 0.13
    positions[i3] += (random() - 0.5) * j
    positions[i3 + 1] += (random() - 0.5) * j * 1.4
    positions[i3 + 2] += (random() - 0.5) * j
  }

  return positions
}

/**
 * POSE 3 — FUTURE (scroll 100%).
 *
 * A calm, wide starfield shell. Particles sit on a thick spherical shell at
 * large radius so the camera ends up inside a quiet void rather than staring at
 * a receding ball. Vertical spread is stretched to fill a widescreen frame.
 */
export function generateVoid(count: number, random: () => number): Float32Array {
  const positions = new Float32Array(count * 3)
  // Tightened from the original 16–46: at the camera's final z=40 the wider
  // shell scattered particles so far off-axis that the frame read as empty
  // rather than calm. This keeps a populated starfield in view.
  const INNER = 10
  const OUTER = 30

  for (let i = 0; i < count; i++) {
    const i3 = i * 3

    const theta = random() * TAU
    const phi = Math.acos(2 * random() - 1)
    // Shell, not solid: bias radius outward.
    const r = INNER + Math.pow(random(), 0.7) * (OUTER - INNER)

    const sinPhi = Math.sin(phi)
    positions[i3] = r * sinPhi * Math.cos(theta)
    positions[i3 + 1] = r * Math.cos(phi) * 1.15
    positions[i3 + 2] = r * sinPhi * Math.sin(theta)
  }

  return positions
}

/**
 * Per-particle static randomness.
 *
 * `random`  — phase offset, so turbulence and twinkle desynchronise.
 * `scale`   — point size multiplier, pow-biased so most specks are small and a
 *             few read as bright foreground motes (depth cue).
 */
export function generateAttributes(count: number, random: () => number) {
  const randoms = new Float32Array(count)
  const scales = new Float32Array(count)

  for (let i = 0; i < count; i++) {
    randoms[i] = random()
    scales[i] = 0.35 + Math.pow(random(), 2.4) * 2.1
  }

  return { randoms, scales }
}
