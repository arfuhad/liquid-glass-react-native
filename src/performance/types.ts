import type { DisplacementMode } from '../LiquidGlassView.types';

/** Quality tiers from best fidelity to least */
export type PerformanceTier = 'high' | 'medium' | 'low' | 'minimal';

/** Adaptation strategy */
export type AdaptiveMode = 'auto' | 'manual';

/** Props that the performance monitor can override to reduce rendering cost */
export interface PerformanceAdjustedProps {
  displacementScale?: number;
  blurAmount?: number;
  saturation?: number;
  aberrationIntensity?: number;
  mode?: DisplacementMode;
}

export interface PerformanceMonitorConfig {
  /** Adaptation mode. Default: 'auto' */
  mode?: AdaptiveMode;

  /** FPS below which we step DOWN one tier. Default: 24 */
  downgradeThreshold?: number;

  /** FPS above which we consider stepping UP one tier. Default: 50 */
  upgradeThreshold?: number;

  /**
   * Number of consecutive FPS samples below downgradeThreshold before downgrading.
   * At ~2s per FPS report, 3 means ~6 seconds of poor performance.
   * Default: 3
   */
  downgradeSampleCount?: number;

  /**
   * Number of consecutive FPS samples above upgradeThreshold before upgrading.
   * Higher than downgradeSampleCount to create hysteresis (bias toward lower tier).
   * Default: 5 (~10 seconds)
   */
  upgradeSampleCount?: number;

  /** Initial/maximum quality tier. Auto mode will never upgrade above this. Default: 'high' */
  initialTier?: PerformanceTier;

  /** Called when the quality tier changes */
  onTierChange?: (tier: PerformanceTier, fps: number) => void;
}

export interface PerformanceMonitorResult {
  /** Most recent FPS reading, or null before first report */
  currentFps: number | null;

  /** Rolling average FPS over the sample history */
  averageFps: number | null;

  /** Currently active quality tier */
  currentTier: PerformanceTier;

  /**
   * Props to spread onto LiquidGlassView AFTER user props.
   * In 'high' tier this is {}, so user's original values pass through.
   */
  adjustedProps: PerformanceAdjustedProps;

  /** Pass as onPerformanceReport to LiquidGlassView to feed FPS data into the monitor */
  handlePerformanceReport: (fps: number) => void;

  /**
   * Manually set a tier.
   * In auto mode, also sets the ceiling (auto won't upgrade above this).
   * In manual mode, directly controls the active tier.
   */
  setTier: (tier: PerformanceTier) => void;

  /** Whether auto-adaptation is currently active */
  isAutoMode: boolean;
}
