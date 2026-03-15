/**
 * liquid-glass-react-native
 *
 * Cross-platform liquid glass effect for React Native.
 * Uses WebView-based SVG filter pipeline for iOS & Android support.
 */

// Main component
export { LiquidGlassView } from './LiquidGlassView';

// Types
export type {
  LiquidGlassViewProps,
  LiquidGlassViewRef,
  DisplacementMode,
  RendererType,
  CaptureMode,
} from './LiquidGlassView.types';

// Utilities
export { isNativeLiquidGlassAvailable } from './utils/platform';

// Performance monitoring
export { usePerformanceMonitor, QUALITY_PRESETS } from './performance';
export type {
  PerformanceTier,
  AdaptiveMode,
  PerformanceAdjustedProps,
  PerformanceMonitorConfig,
  PerformanceMonitorResult,
} from './performance';
