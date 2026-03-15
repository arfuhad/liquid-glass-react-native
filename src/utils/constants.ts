/** Default prop values for LiquidGlassView */
export const DEFAULTS = {
  displacementScale: 70,
  blurAmount: 0.0625,
  saturation: 140,
  aberrationIntensity: 2,
  cornerRadius: 20,
  overLight: false,
  mode: 'standard' as const,
  renderer: 'auto' as const,
  captureMode: 'none' as const,
  captureInterval: 500,
  fallbackBackground: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
} as const;

/** Capture system constants */
export const CAPTURE = {
  /** Max width for captured background images (px) */
  maxWidth: 400,
  /** Default JPEG quality for captures */
  jpegQuality: 0.6,
  /** Min JPEG quality before stopping adaptation */
  minJpegQuality: 0.3,
  /** Capture duration threshold before quality reduction (ms) */
  slowCaptureThreshold: 100,
  /** Capture duration threshold before resolution reduction (ms) */
  verySlowCaptureThreshold: 200,
} as const;

/** Capture constants for realtime mode (more aggressive for speed) */
export const REALTIME_CAPTURE = {
  /** Max width for realtime captured images (px) */
  maxWidth: 200,
  /** Default JPEG quality for realtime captures */
  jpegQuality: 0.4,
  /** Min JPEG quality before stopping adaptation */
  minJpegQuality: 0.2,
  /** Minimum interval between captures to prevent CPU saturation (ms, ~30fps) */
  minInterval: 32,
} as const;

/** WebView communication constants */
export const BRIDGE = {
  /** Message types from WebView to RN */
  messageTypes: {
    READY: 'ready',
    FPS: 'fps',
    ERROR: 'error',
  },
} as const;
