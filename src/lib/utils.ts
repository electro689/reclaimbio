/**
 * Tiny classname joiner. Filters falsy values so conditional classes read cleanly:
 *   cn('base', isActive && 'active', className)
 * Deliberately dependency-free — we don't have conflicting-utility problems
 * that would justify pulling in tailwind-merge.
 */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ')
}

/** Clamp n into [min, max]. */
export function clamp(n: number, min: number, max: number): number {
  return Math.min(Math.max(n, min), max)
}

/**
 * Linear interpolation. Used for frame-rate-independent easing of cursor
 * and (in Stage 2) particle state.
 */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

/**
 * Map x from [inMin, inMax] into [outMin, outMax], clamped at both ends.
 * The workhorse for turning scroll progress into visual parameters.
 */
export function mapRange(
  x: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number,
): number {
  if (inMax - inMin === 0) return outMin
  const t = clamp((x - inMin) / (inMax - inMin), 0, 1)
  return outMin + t * (outMax - outMin)
}
