import type { PerformanceTier, PerformanceAdjustedProps } from './types';

/**
 * Quality presets mapping each tier to prop overrides.
 *
 * Reduction strategy (ordered by performance impact):
 * 1. aberrationIntensity → 0 removes 3 separate R/G/B displacement passes
 * 2. displacementScale reduction lowers feDisplacementMap computation
 * 3. blurAmount reduction lowers GPU backdrop-filter cost
 * 4. saturation → 100% removes saturate() from backdrop-filter
 * 5. mode → 'standard' prevents runtime canvas SDF generation
 */
export const QUALITY_PRESETS: Record<PerformanceTier, PerformanceAdjustedProps> = {
  /** No overrides — user's original values pass through */
  high: {},

  /** Remove chromatic aberration (biggest single perf lever) */
  medium: {
    aberrationIntensity: 0,
  },

  /** Reduced displacement + blur, no aberration */
  low: {
    displacementScale: 30,
    aberrationIntensity: 0,
    blurAmount: 0.03,
  },

  /** Near-zero effects, force cheapest displacement mode */
  minimal: {
    displacementScale: 10,
    aberrationIntensity: 0,
    blurAmount: 0.01,
    saturation: 100,
    mode: 'standard',
  },
};
