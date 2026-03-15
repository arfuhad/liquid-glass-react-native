import type { ViewStyle } from 'react-native';
import type { ReactNode, RefObject } from 'react';
import type { View } from 'react-native';

/**
 * Displacement map mode for the liquid glass effect.
 * - standard: Pre-baked radial gradient displacement map
 * - polar: Polar coordinate variant with different edge characteristics
 * - prominent: Stronger edge displacement for more dramatic effect
 * - shader: Runtime-generated SDF-based displacement map via canvas
 */
export type DisplacementMode = 'standard' | 'polar' | 'prominent' | 'shader';

/**
 * Renderer selection strategy.
 * - auto: Automatically selects the best renderer for the platform
 *         (native on iOS 26+, WebView elsewhere)
 * - webview: Force WebView-based rendering (works everywhere)
 * - native: Force native UIGlassEffect (iOS 26+ only, falls back to webview)
 */
export type RendererType = 'auto' | 'webview' | 'native';

/**
 * Background capture strategy for refracting native content.
 * - static: Capture once on mount and on layout changes
 * - periodic: Capture at regular intervals (see captureInterval)
 * - realtime: Capture as fast as the device allows (self-chaining loop)
 * - manual: Only capture when imperatively triggered via ref
 * - none: No background capture; use fallbackBackground instead
 */
export type CaptureMode = 'static' | 'periodic' | 'realtime' | 'manual' | 'none';

export interface LiquidGlassViewProps {
  // ── Visual Props ──

  /** Displacement/refraction intensity. Range: 0-200, default: 70 */
  displacementScale?: number;

  /**
   * Blur amount behind the glass.
   * Range: 0-1 where 0 is minimal and 1 is maximum blur.
   * Default: 0.0625 (subtle blur). Maps to blur(4 + value*32 px).
   */
  blurAmount?: number;

  /** Color saturation of the backdrop. Percentage value, default: 140 */
  saturation?: number;

  /**
   * Chromatic aberration intensity at glass edges.
   * Range: 0-10, default: 2. Higher = more color fringing at edges.
   */
  aberrationIntensity?: number;

  /** Corner radius of the glass shape in pixels. Default: 20 */
  cornerRadius?: number;

  /**
   * Enable light background mode with enhanced shadows and darker overlay.
   * Default: false
   */
  overLight?: boolean;

  /**
   * Tint color applied over the glass effect.
   * Accepts any CSS color value (e.g. 'rgba(255,0,0,0.2)', '#FF000033').
   * The tint sits above the blurred backdrop but below specular highlights.
   */
  tintColor?: string;

  /**
   * Gradient tint applied over the glass effect.
   * Accepts any CSS gradient value (e.g. 'linear-gradient(135deg, rgba(255,0,0,0.3), rgba(0,0,255,0.3))').
   * Takes priority over `tintColor` when both are set.
   */
  tintGradient?: string;

  // ── Rendering ──

  /** Displacement map algorithm. Default: 'standard' */
  mode?: DisplacementMode;

  /** Force a specific renderer. Default: 'auto' */
  renderer?: RendererType;

  // ── Background Capture ──

  /** Ref to the View whose content should appear refracted through the glass */
  backgroundRef?: RefObject<View>;

  /** Background capture strategy. Default: 'none' */
  captureMode?: CaptureMode;

  /**
   * Interval in ms for periodic capture (default: 500).
   * In realtime mode, sets the minimum interval between captures (default: 32ms, minimum: 32ms).
   */
  captureInterval?: number;

  /**
   * Fallback background when captureMode='none' or while capture is loading.
   * Accepts any CSS background value (color, gradient, image url).
   * Default: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
   */
  fallbackBackground?: string;

  // ── Layout & Events ──

  /** Style applied to the outer container */
  style?: ViewStyle;

  /** Content rendered on top of the glass effect */
  children?: ReactNode;

  /** Called when the glass effect is fully rendered and visible */
  onReady?: () => void;

  /** Called with FPS data for performance monitoring */
  onPerformanceReport?: (fps: number) => void;
}

export interface LiquidGlassViewRef {
  /** Manually trigger a background capture (for captureMode='manual') */
  capture: () => Promise<void>;
}

/** Internal props passed to renderers */
export interface RendererProps {
  width: number;
  height: number;
  displacementScale: number;
  blurAmount: number;
  saturation: number;
  aberrationIntensity: number;
  cornerRadius: number;
  overLight: boolean;
  tintColor?: string;
  tintGradient?: string;
  mode: DisplacementMode;
  backgroundBase64: string | null;
  fallbackBackground: string;
  backgroundOffset?: { x: number; y: number };
  backgroundSize?: { width: number; height: number };
  onReady?: () => void;
  onPerformanceReport?: (fps: number) => void;
  children?: ReactNode;
}
