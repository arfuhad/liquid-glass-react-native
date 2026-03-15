/**
 * LiquidGlassView — Main orchestrator component.
 *
 * Measures its own dimensions, selects the appropriate renderer,
 * manages background capture, and forwards props.
 *
 * Usage:
 * ```tsx
 * <LiquidGlassView
 *   style={{ width: 300, height: 200 }}
 *   displacementScale={70}
 *   aberrationIntensity={2}
 *   cornerRadius={24}
 * >
 *   <Text>Content on glass</Text>
 * </LiquidGlassView>
 * ```
 */

import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { View, type LayoutChangeEvent } from 'react-native';

import { WebViewRenderer } from './renderers/WebViewRenderer';
import { useBackgroundCapture } from './capture/useBackgroundCapture';
import { DEFAULTS } from './utils/constants';
import type {
  LiquidGlassViewProps,
  LiquidGlassViewRef,
} from './LiquidGlassView.types';

export const LiquidGlassView = forwardRef<
  LiquidGlassViewRef,
  LiquidGlassViewProps
>(function LiquidGlassView(props, ref) {
  const {
    displacementScale = DEFAULTS.displacementScale,
    blurAmount = DEFAULTS.blurAmount,
    saturation = DEFAULTS.saturation,
    aberrationIntensity = DEFAULTS.aberrationIntensity,
    cornerRadius = DEFAULTS.cornerRadius,
    overLight = DEFAULTS.overLight,
    tintColor,
    tintGradient,
    mode = DEFAULTS.mode,
    renderer = DEFAULTS.renderer,
    backgroundRef,
    captureMode = DEFAULTS.captureMode,
    captureInterval,
    fallbackBackground = DEFAULTS.fallbackBackground,
    style,
    children,
    onReady,
    onPerformanceReport,
  } = props;

  // Layout measurement
  const viewRef = useRef<View>(null);
  const [dimensions, setDimensions] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const [backgroundOffset, setBackgroundOffset] = useState<{ x: number; y: number } | undefined>();
  const [backgroundSize, setBackgroundSize] = useState<{ width: number; height: number } | undefined>();

  const measurePositions = useCallback(() => {
    if (!backgroundRef?.current || !viewRef.current) return;

    viewRef.current.measureInWindow((glassX, glassY) => {
      if (glassX === undefined || glassY === undefined) return;
      backgroundRef.current?.measureInWindow((bgX, bgY, bgW, bgH) => {
        if (bgX === undefined || bgY === undefined) return;
        setBackgroundOffset((prev) => {
          const x = Math.round(glassX - bgX);
          const y = Math.round(glassY - bgY);
          if (prev && prev.x === x && prev.y === y) return prev;
          return { x, y };
        });
        setBackgroundSize((prev) => {
          const w = Math.round(bgW);
          const h = Math.round(bgH);
          if (prev && prev.width === w && prev.height === h) return prev;
          return { width: w, height: h };
        });
      });
    });
  }, [backgroundRef]);

  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setDimensions((prev) => {
      if (prev && prev.width === width && prev.height === height) return prev;
      return { width, height };
    });
    // Measure position after layout settles
    requestAnimationFrame(() => measurePositions());
  }, [measurePositions]);

  // Background capture
  const { backgroundBase64, capture } = useBackgroundCapture({
    backgroundRef,
    captureMode,
    captureInterval,
    enabled: captureMode !== 'none' && !!backgroundRef,
  });

  // Expose imperative methods
  useImperativeHandle(
    ref,
    () => ({
      capture,
    }),
    [capture]
  );

  // Determine renderer
  // Phase 1: Always use WebView renderer
  // Phase 3 will add: if (renderer === 'auto' && isNativeLiquidGlassAvailable()) → NativeRenderer
  const SelectedRenderer = WebViewRenderer;

  return (
    <View ref={viewRef} style={style} onLayout={handleLayout}>
      {dimensions && (
        <SelectedRenderer
          width={dimensions.width}
          height={dimensions.height}
          displacementScale={displacementScale}
          blurAmount={blurAmount}
          saturation={saturation}
          aberrationIntensity={aberrationIntensity}
          cornerRadius={cornerRadius}
          overLight={overLight}
          tintColor={tintColor}
          tintGradient={tintGradient}
          mode={mode}
          backgroundBase64={backgroundBase64}
          fallbackBackground={fallbackBackground}
          backgroundOffset={backgroundOffset}
          backgroundSize={backgroundSize}
          onReady={onReady}
          onPerformanceReport={onPerformanceReport}
        >
          {children}
        </SelectedRenderer>
      )}
    </View>
  );
});
