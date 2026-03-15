import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { QUALITY_PRESETS } from './qualityPresets';
import type {
  PerformanceTier,
  PerformanceMonitorConfig,
  PerformanceMonitorResult,
} from './types';

const TIER_ORDER: PerformanceTier[] = ['high', 'medium', 'low', 'minimal'];

const MAX_HISTORY = 30; // ~60 seconds of FPS history at 2s intervals

const DEFAULT_DOWNGRADE_THRESHOLD = 24;
const DEFAULT_UPGRADE_THRESHOLD = 50;
const DEFAULT_DOWNGRADE_SAMPLE_COUNT = 3;
const DEFAULT_UPGRADE_SAMPLE_COUNT = 5;

function tierIndex(tier: PerformanceTier): number {
  return TIER_ORDER.indexOf(tier);
}

function stepDown(current: PerformanceTier): PerformanceTier {
  const idx = tierIndex(current);
  return idx < TIER_ORDER.length - 1 ? TIER_ORDER[idx + 1]! : current;
}

function stepUp(
  current: PerformanceTier,
  ceiling: PerformanceTier
): PerformanceTier {
  const idx = tierIndex(current);
  const ceilIdx = tierIndex(ceiling);
  if (idx <= ceilIdx) return current;
  return TIER_ORDER[idx - 1]!;
}

/**
 * Performance monitor hook for LiquidGlassView.
 *
 * Consumes FPS data from the WebView bridge and provides quality tier management
 * with automatic adaptation (auto mode) or manual control (manual mode).
 *
 * @example
 * ```tsx
 * // Auto mode — automatically reduces effects on slow devices
 * const { adjustedProps, handlePerformanceReport } = usePerformanceMonitor({ mode: 'auto' });
 *
 * <LiquidGlassView
 *   displacementScale={70}
 *   onPerformanceReport={handlePerformanceReport}
 *   {...adjustedProps}
 * />
 * ```
 *
 * @example
 * ```tsx
 * // Manual mode — user controls quality tier
 * const { adjustedProps, handlePerformanceReport, setTier } = usePerformanceMonitor({ mode: 'manual' });
 *
 * <Button title="Low Quality" onPress={() => setTier('low')} />
 * ```
 */
export function usePerformanceMonitor(
  config?: PerformanceMonitorConfig
): PerformanceMonitorResult {
  const mode = config?.mode ?? 'auto';
  const downgradeThreshold =
    config?.downgradeThreshold ?? DEFAULT_DOWNGRADE_THRESHOLD;
  const upgradeThreshold =
    config?.upgradeThreshold ?? DEFAULT_UPGRADE_THRESHOLD;
  const downgradeSampleCount =
    config?.downgradeSampleCount ?? DEFAULT_DOWNGRADE_SAMPLE_COUNT;
  const upgradeSampleCount =
    config?.upgradeSampleCount ?? DEFAULT_UPGRADE_SAMPLE_COUNT;
  const initialTier = config?.initialTier ?? 'high';
  const onTierChange = config?.onTierChange;

  const [currentTier, setCurrentTier] = useState<PerformanceTier>(initialTier);
  const [currentFps, setCurrentFps] = useState<number | null>(null);

  // Mutable refs to avoid re-renders on every FPS tick
  const consecutiveBadRef = useRef(0);
  const consecutiveGoodRef = useRef(0);
  const ceilingTierRef = useRef<PerformanceTier>(initialTier);
  const fpsHistoryRef = useRef<number[]>([]);
  const modeRef = useRef(mode);
  const onTierChangeRef = useRef(onTierChange);

  // Sync refs when config changes
  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  useEffect(() => {
    onTierChangeRef.current = onTierChange;
  }, [onTierChange]);

  const handlePerformanceReport = useCallback(
    (fps: number) => {
      setCurrentFps(fps);

      // Track history for averageFps
      const history = fpsHistoryRef.current;
      history.push(fps);
      if (history.length > MAX_HISTORY) {
        history.shift();
      }

      // Skip auto-adaptation in manual mode
      if (modeRef.current !== 'auto') return;

      // Downgrade tracking
      if (fps < downgradeThreshold) {
        consecutiveBadRef.current++;
        consecutiveGoodRef.current = 0;
      } else {
        consecutiveBadRef.current = 0;
      }

      // Upgrade tracking
      if (fps > upgradeThreshold) {
        consecutiveGoodRef.current++;
      } else {
        consecutiveGoodRef.current = 0;
      }

      // Attempt downgrade
      if (consecutiveBadRef.current >= downgradeSampleCount) {
        setCurrentTier((prev) => {
          const next = stepDown(prev);
          if (next !== prev) {
            consecutiveBadRef.current = 0;
            consecutiveGoodRef.current = 0;
            onTierChangeRef.current?.(next, fps);
          }
          return next;
        });
      }

      // Attempt upgrade
      if (consecutiveGoodRef.current >= upgradeSampleCount) {
        setCurrentTier((prev) => {
          const next = stepUp(prev, ceilingTierRef.current);
          if (next !== prev) {
            consecutiveBadRef.current = 0;
            consecutiveGoodRef.current = 0;
            onTierChangeRef.current?.(next, fps);
          }
          return next;
        });
      }
    },
    [downgradeThreshold, upgradeThreshold, downgradeSampleCount, upgradeSampleCount]
  );

  const setTier = useCallback((tier: PerformanceTier) => {
    setCurrentTier(tier);
    ceilingTierRef.current = tier;
    consecutiveBadRef.current = 0;
    consecutiveGoodRef.current = 0;
  }, []);

  const adjustedProps = useMemo(
    () => QUALITY_PRESETS[currentTier],
    [currentTier]
  );

  const averageFps = useMemo(() => {
    const history = fpsHistoryRef.current;
    if (history.length === 0) return null;
    return Math.round(
      history.reduce((a, b) => a + b, 0) / history.length
    );
    // Recalculate when currentFps changes (which happens on every report)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentFps]);

  return {
    currentFps,
    averageFps,
    currentTier,
    adjustedProps,
    handlePerformanceReport,
    setTier,
    isAutoMode: mode === 'auto',
  };
}
