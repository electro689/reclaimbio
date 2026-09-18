/**
 * Particle shader pair.
 *
 * The whole scroll narrative lives in the vertex shader. The waste pose rides
 * the built-in `position` attribute and the other two poses are uploaded once
 * as attributes; `uProgress` (0 → 1, driven by scroll) morphs
 * between them. The CPU sets a handful of uniforms per frame and nothing else —
 * no position array is ever rewritten or re-uploaded.
 *
 * Timeline:
 *   0.00 → 0.50   cloud  → helix   (chaos organises; green → cyan)
 *   0.50 → 1.00   helix  → void    (structure disperses; calm cyan starfield)
 */

export const particleVertexShader = /* glsl */ `
  precision highp float;

  // --- Baked poses ---
  // Pose 1 (chaotic waste) arrives via the built-in position attribute —
  // the geometry points it at the cloud buffer, so no duplicate attribute
  // needs uploading.
  attribute vec3 aHelix;   // pose 2: structured polymer
  attribute vec3 aVoid;    // pose 3: dispersed starfield
  attribute float aRandom; // per-particle phase [0,1)
  attribute float aScale;  // per-particle size multiplier

  // --- Per-frame uniforms ---
  uniform float uProgress;    // scroll 0 → 1
  uniform float uTime;        // seconds
  uniform float uSize;        // base point size (DPR-scaled)
  uniform float uTurbulence;  // chaos amount, faded out by progress
  uniform float uBurst;       // radial kick from scroll velocity

  // --- To fragment ---
  varying float vMix;      // 0 = waste, 1 = reclaimed (drives colour)
  varying float vFade;     // per-particle alpha
  varying float vRandom;

  // Cheap 3D hash-noise. Good enough for organic drift and far cheaper than
  // simplex at this particle count.
  vec3 hash3(vec3 p) {
    p = vec3(
      dot(p, vec3(127.1, 311.7, 74.7)),
      dot(p, vec3(269.5, 183.3, 246.1)),
      dot(p, vec3(113.5, 271.9, 124.6))
    );
    return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
  }

  // Smootherstep — C2 continuous, so the morph has no velocity discontinuity
  // at the midpoint where the two halves of the timeline meet.
  float ease(float t) {
    return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
  }

  void main() {
    // ---------------------------------------------------------------
    // 1. POSE MORPH
    // ---------------------------------------------------------------
    // Split the timeline at 0.5. Each particle gets a slightly different
    // stagger window (via aRandom) so the field transitions as a travelling
    // wave rather than every speck arriving in lockstep.
    float stagger = aRandom * 0.18;

    // First half: cloud -> helix
    float t1 = ease(clamp((uProgress - stagger) / (0.5 - stagger * 0.5), 0.0, 1.0));
    // Second half: helix -> void
    float t2 = ease(clamp((uProgress - 0.5 - stagger * 0.5) / (0.5 - stagger * 0.5), 0.0, 1.0));

    vec3 pos = mix(position, aHelix, t1);
    pos = mix(pos, aVoid, t2);

    // ---------------------------------------------------------------
    // 2. TURBULENCE
    // ---------------------------------------------------------------
    // Strong in the waste phase, gone by the helix. This is what makes the
    // opening read as "chaotic" and the helix as "structured".
    vec3 noise = hash3(position * 0.35 + aRandom * 12.0);
    float wobble = sin(uTime * 0.55 + aRandom * 6.283) * 0.5 + 0.5;
    pos += noise * uTurbulence * (0.55 + wobble * 0.45);

    // Slow organic breathing that persists across all phases so the field is
    // never fully static, even at rest.
    pos.x += sin(uTime * 0.22 + aRandom * 9.0) * 0.14;
    pos.y += cos(uTime * 0.19 + aRandom * 7.0) * 0.14;

    // ---------------------------------------------------------------
    // 3. HELIX SPIN + VELOCITY BURST
    // ---------------------------------------------------------------
    // Rotate about Y, weighted toward the helix phase so the polymer visibly
    // spools. Peaks at t1 and unwinds as the field disperses.
    // The progress term is kept small (0.9 rad over the whole scroll) so the
    // helix presents side-on at its hero moment rather than at an arbitrary
    // angle; the time term supplies the continuous spool.
    float spinAmount = t1 * (1.0 - t2 * 0.65);
    float spin = uTime * 0.16 * spinAmount + uProgress * 0.9;
    float s = sin(spin);
    float c = cos(spin);
    pos.xz = mat2(c, -s, s, c) * pos.xz;

    // Fast scrolling kicks particles radially outward — the "acceleration" beat
    // in the brief. Driven by scroll velocity, so it's a response, not a loop.
    pos += normalize(pos + 0.0001) * uBurst * (0.4 + aRandom * 0.6);

    // ---------------------------------------------------------------
    // 4. PROJECT
    // ---------------------------------------------------------------
    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPosition;

    // Perspective-correct point size, clamped so nothing becomes a screen-
    // filling blob when it drifts past the near plane. The 12px cap (not 14)
    // trims the worst additive overdraw in the dense core; individual sprites
    // rarely read above ~8px anyway.
    float dist = -mvPosition.z;
    gl_PointSize = uSize * aScale * (30.0 / max(dist, 1.0));
    gl_PointSize = clamp(gl_PointSize, 0.5, 12.0);

    // ---------------------------------------------------------------
    // 5. VARYINGS
    // ---------------------------------------------------------------
    // Colour tracks the *first* transition only: matter turns cyan when it is
    // reclaimed, and stays reclaimed as it disperses.
    vMix = t1;
    vRandom = aRandom;

    // Depth fade + twinkle. In the void phase, dim slightly and let particles
    // shimmer so it reads as starlight rather than dust.
    float depthFade = smoothstep(90.0, 8.0, dist);
    float twinkle = 0.75 + 0.25 * sin(uTime * 1.6 + aRandom * 25.0);
    vFade = depthFade * mix(1.0, twinkle * 0.82, t2);
  }
`

export const particleFragmentShader = /* glsl */ `
  precision highp float;

  uniform vec3 uColorWaste;      // #39FF14 toxic green
  uniform vec3 uColorReclaimed;  // #00F0FF bioluminescent cyan
  uniform float uOpacity;

  varying float vMix;
  varying float vFade;
  varying float vRandom;

  void main() {
    // Skip shading fully-faded sprites (mount fade-in, depth-culled specks):
    // with additive blending they contribute nothing but still cost fill.
    if (vFade * uOpacity < 0.004) discard;

    // Round the square point sprite and give it a soft falloff. Two-stop glow:
    // a tight bright core plus a wide halo, which is what makes the particles
    // read as emissive rather than as flat dots.
    vec2 uv = gl_PointCoord - 0.5;
    float d = length(uv);
    if (d > 0.5) discard;

    float core = 1.0 - smoothstep(0.0, 0.18, d);
    float halo = 1.0 - smoothstep(0.06, 0.5, d);
    // Softened from 0.85/0.5: with additive blending across a dense core,
    // higher alpha stacked to pure white and destroyed the brand hue.
    float alpha = core * 0.55 + halo * 0.34;

    // Waste -> reclaimed. Slightly eased so the green doesn't linger as a muddy
    // teal through the middle of the transition.
    vec3 color = mix(uColorWaste, uColorReclaimed, smoothstep(0.0, 0.85, vMix));

    // Gentle hot centre. Kept low (was 0.45) so overlapping particles bloom
    // toward a tinted white rather than clipping to flat #ffffff.
    color += vec3(core * 0.16);

    // A few particles run hotter than the rest — breaks up uniformity.
    color *= 0.82 + vRandom * 0.36;

    gl_FragColor = vec4(color, alpha * vFade * uOpacity);

    #include <colorspace_fragment>
  }
`
