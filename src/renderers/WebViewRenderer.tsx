/**
 * WebView-based renderer for the liquid glass effect.
 *
 * Renders the SVG filter pipeline inside a WebView with transparent background.
 * Works on both iOS (WKWebView) and Android (System WebView / Chromium).
 *
 * Communication with the WebView:
 * - Props → WebView: via injectJavaScript calling window.updateProps/updateBackground
 * - WebView → RN: via onMessage handling postMessage({type, value})
 */

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Platform,
  StyleSheet,
  View,
} from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { generateGlassHTML } from '../webview/glassHTML';
import { BRIDGE } from '../utils/constants';
import type { RendererProps } from '../LiquidGlassView.types';

export function WebViewRenderer({
  width,
  height,
  displacementScale,
  blurAmount,
  saturation,
  aberrationIntensity,
  cornerRadius,
  overLight,
  tintColor,
  tintGradient,
  mode,
  backgroundBase64,
  fallbackBackground,
  backgroundOffset,
  backgroundSize,
  onReady,
  onPerformanceReport,
  children,
}: RendererProps) {
  const webViewRef = useRef<WebView>(null);
  const [isWebViewReady, setIsWebViewReady] = useState(false);
  const prevBgRef = useRef<string | null>(null);

  // Generate HTML document (only on mount or when critical params change)
  const html = useMemo(
    () =>
      generateGlassHTML({
        width,
        height,
        displacementScale,
        blurAmount,
        saturation,
        aberrationIntensity,
        cornerRadius,
        overLight,
        tintColor,
        tintGradient,
        mode,
        backgroundBase64,
        fallbackBackground,
        backgroundOffset,
        backgroundSize,
      }),
    // Intentionally only regenerate on params that require full HTML rebuild
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [width, height, displacementScale, aberrationIntensity, mode, cornerRadius]
  );

  // Handle dynamic prop updates via injectJavaScript (avoids full re-render)
  useEffect(() => {
    if (!isWebViewReady || !webViewRef.current) return;

    const delta: Record<string, unknown> = {};
    delta.blurAmount = blurAmount;
    delta.saturation = saturation;
    delta.overLight = overLight;
    delta.tintColor = tintColor;
    delta.tintGradient = tintGradient;

    webViewRef.current.injectJavaScript(
      `window.updateProps(${JSON.stringify(delta)}); true;`
    );
  }, [blurAmount, saturation, overLight, tintColor, tintGradient, isWebViewReady]);

  // Handle background position updates
  useEffect(() => {
    if (!isWebViewReady || !webViewRef.current) return;
    if (!backgroundOffset || !backgroundSize) return;

    webViewRef.current.injectJavaScript(
      `window.updateBackgroundPosition(${backgroundOffset.x}, ${backgroundOffset.y}, ${backgroundSize.width}, ${backgroundSize.height}); true;`
    );
  }, [backgroundOffset, backgroundSize, isWebViewReady]);

  // Handle background image updates
  useEffect(() => {
    if (!isWebViewReady || !webViewRef.current) return;
    if (backgroundBase64 === prevBgRef.current) return;

    prevBgRef.current = backgroundBase64;

    if (backgroundBase64) {
      webViewRef.current.injectJavaScript(
        `window.updateBackground("${backgroundBase64}"); true;`
      );
    }
  }, [backgroundBase64, isWebViewReady]);

  // Handle messages from WebView
  const handleMessage = useCallback(
    (event: WebViewMessageEvent) => {
      try {
        const data = JSON.parse(event.nativeEvent.data);

        switch (data.type) {
          case BRIDGE.messageTypes.READY:
            setIsWebViewReady(true);
            onReady?.();
            break;
          case BRIDGE.messageTypes.FPS:
            onPerformanceReport?.(data.value);
            break;
          case BRIDGE.messageTypes.ERROR:
            console.warn('[LiquidGlass] WebView error:', data.message);
            break;
        }
      } catch {
        // Ignore non-JSON messages
      }
    },
    [onReady, onPerformanceReport]
  );

  return (
    <View style={[styles.container, { width, height, borderRadius: cornerRadius }]}>
      {/* WebView glass layer */}
      <WebView
        ref={webViewRef}
        source={{ html }}
        style={styles.webview}
        originWhitelist={['*']}
        javaScriptEnabled={true}
        domStorageEnabled={false}
        bounces={false}
        scrollEnabled={false}
        overScrollMode="never"
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        onMessage={handleMessage}
        // Transparent background so native content shows through
        {...(Platform.OS === 'android'
          ? {
              androidLayerType: 'hardware',
              setBuiltInZoomControls: false,
              setDisplayZoomControls: false,
            }
          : {
              allowsInlineMediaPlayback: true,
            })}
        // Make WebView background transparent
        containerStyle={styles.webviewContainer}
        allowFileAccess={false}
        allowUniversalAccessFromFileURLs={false}
        mediaPlaybackRequiresUserAction={true}
      />

      {/* Children rendered as normal RN views on top of the glass */}
      {children && (
        <View
          style={[
            styles.content,
            { borderRadius: cornerRadius },
          ]}
          pointerEvents="box-none"
        >
          {children}
        </View>
      )}

      {/* Loading placeholder: shows until WebView is ready */}
      {!isWebViewReady && (
        <View
          style={[
            styles.placeholder,
            {
              borderRadius: cornerRadius,
              backgroundColor: 'rgba(255,255,255,0.08)',
            },
          ]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    overflow: 'hidden',
  },
  webview: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },
  webviewContainer: {
    backgroundColor: 'transparent',
  },
  content: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  placeholder: {
    ...StyleSheet.absoluteFillObject,
  },
});
