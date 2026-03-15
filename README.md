# expo-rn-liquid-glass-view

Cross-platform liquid glass effect for React Native. Brings Apple's liquid glass aesthetic to **both iOS and Android** using a WebView-based SVG filter pipeline.

[![npm version](https://img.shields.io/npm/v/expo-rn-liquid-glass-view.svg)](https://www.npmjs.com/package/expo-rn-liquid-glass-view)
[![license](https://img.shields.io/npm/l/expo-rn-liquid-glass-view.svg)](https://github.com/arfuhad/expo-rn-liquid-glass-view/blob/main/LICENSE)
![platform](https://img.shields.io/badge/platform-iOS%20%7C%20Android-brightgreen)

## Preview

<p align="center">
  <img src="https://raw.githubusercontent.com/arfuhad/expo-rn-liquid-glass-view/main/ios-gif.gif" alt="iOS Demo" width="300" />
  <img src="https://raw.githubusercontent.com/arfuhad/expo-rn-liquid-glass-view/main/android-gif.gif" alt="Android Demo" width="300" />
</p>

> See the full [example app](./example/App.tsx) for interactive demos of all features.

## Features

- Works on **Android and older iOS** — not limited to iOS 26+
- SVG filter pipeline: displacement maps, chromatic aberration, backdrop blur, specular borders
- **Background refraction** — capture native RN content and refract it through the glass
- Multiple displacement modes: `standard`, `polar`, `prominent`, `shader`
- **Performance monitoring** — adaptive quality tiers with automatic FPS-based downgrade/upgrade
- **Automatic background positioning** — multiple glass views sharing one `backgroundRef` each show the correct region
- **Tint overlays** — apply solid colors or CSS gradients over the glass effect
- Fully customizable: blur, saturation, aberration, corner radius, and more
- Lightweight — no native module linking required

## Installation

```bash
npm install expo-rn-liquid-glass-view
```

### Peer dependencies

**Required:**

```bash
npm install react-native-webview
```

**Optional** (needed only for background refraction):

```bash
npm install react-native-view-shot
```

## Compatibility

| Requirement | Version |
|-------------|---------|
| React Native | >= 0.72.0 |
| React | >= 18.0.0 |
| Expo | SDK 49+ (with `react-native-webview` config plugin) |
| iOS | 13.0+ (WebView renderer) |
| Android | API 21+ (System WebView / Chromium) |
| react-native-webview | >= 13.0.0 |
| react-native-view-shot | >= 3.0.0 (optional, for background refraction) |

> **Note:** This package uses a WebView-based renderer and does not require native module linking. It works with both bare React Native and Expo managed workflows.

## Quick Start

```tsx
import { LiquidGlassView } from 'expo-rn-liquid-glass-view';

function MyScreen() {
  return (
    <LiquidGlassView
      style={{ width: 300, height: 200 }}
      cornerRadius={20}
      blurAmount={0.0625}
      onReady={() => console.log('Glass ready!')}
    >
      <Text style={{ color: '#fff', fontSize: 24 }}>Hello Glass</Text>
    </LiquidGlassView>
  );
}
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `displacementScale` | `number` | `70` | Refraction intensity (0–200) |
| `blurAmount` | `number` | `0.0625` | Backdrop blur strength (0–1) |
| `saturation` | `number` | `140` | Backdrop color saturation (%) |
| `aberrationIntensity` | `number` | `2` | Chromatic aberration at edges (0–10) |
| `cornerRadius` | `number` | `20` | Glass shape corner radius (px) |
| `overLight` | `boolean` | `false` | Light background mode with enhanced shadows |
| `tintColor` | `string` | — | Solid color tint over the glass (any CSS color) |
| `tintGradient` | `string` | — | Gradient tint over the glass (any CSS gradient, overrides `tintColor`) |
| `mode` | `DisplacementMode` | `'standard'` | Displacement map algorithm |
| `renderer` | `RendererType` | `'auto'` | Force a specific renderer |
| `backgroundRef` | `RefObject<View>` | — | View to capture for refraction |
| `captureMode` | `CaptureMode` | `'none'` | Background capture strategy |
| `captureInterval` | `number` | `500` | Interval in ms for periodic/realtime capture |
| `fallbackBackground` | `string` | gradient | CSS background when no capture |
| `style` | `ViewStyle` | — | Style for the outer container |
| `children` | `ReactNode` | — | Content rendered on top of the glass |
| `onReady` | `() => void` | — | Fires when the glass effect is fully rendered |
| `onPerformanceReport` | `(fps: number) => void` | — | FPS data for performance monitoring |

### Displacement Modes

| Mode | Description |
|------|-------------|
| `standard` | Pre-baked radial gradient displacement map |
| `polar` | Polar coordinate variant with different edge characteristics |
| `prominent` | Stronger edge displacement for a more dramatic effect |
| `shader` | Runtime-generated SDF-based displacement map via canvas |

### Capture Modes

| Mode | Description |
|------|-------------|
| `none` | No background capture; uses `fallbackBackground` instead |
| `static` | Capture once on mount and on layout changes |
| `periodic` | Capture at regular intervals (see `captureInterval`) |
| `realtime` | Capture as fast as the device allows (self-chaining loop) |
| `manual` | Only capture when imperatively triggered via ref |

## Background Refraction

To refract native RN content through the glass, provide a `backgroundRef` pointing to the view behind the glass and set a `captureMode`:

```tsx
import { useRef } from 'react';
import { View, Image } from 'react-native';
import { LiquidGlassView } from 'expo-rn-liquid-glass-view';

function RefractionExample() {
  const backgroundRef = useRef<View>(null);

  return (
    <View style={{ flex: 1 }}>
      {/* Background content to refract */}
      <View ref={backgroundRef} collapsable={false} style={{ flex: 1 }}>
        <Image source={require('./bg.jpg')} style={{ flex: 1 }} />
      </View>

      {/* Glass overlay */}
      <LiquidGlassView
        style={{ position: 'absolute', top: 100, left: 30, width: 300, height: 200 }}
        backgroundRef={backgroundRef}
        captureMode="static"
        displacementScale={70}
        blurAmount={0.0625}
        cornerRadius={20}
      >
        <Text style={{ color: '#fff' }}>Refracted content</Text>
      </LiquidGlassView>
    </View>
  );
}
```

> **Note:** Background refraction requires `react-native-view-shot` as an additional dependency. Set `collapsable={false}` on the background view for Android compatibility.

### Multiple Glass Views

When several `LiquidGlassView` instances share the same `backgroundRef`, each automatically shows the correct background region based on its screen position. Captures are also deduplicated — only one capture loop runs per `backgroundRef`, and the result is shared across all instances.

```tsx
import { useRef } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { LiquidGlassView } from 'expo-rn-liquid-glass-view';

function MultiGlassExample() {
  const backgroundRef = useRef<View>(null);

  return (
    <View style={{ flex: 1 }}>
      {/* Background content */}
      <View ref={backgroundRef} collapsable={false} style={StyleSheet.absoluteFill}>
        <ScrollView>{/* Your app content here */}</ScrollView>
      </View>

      {/* Multiple glass views sharing the same backgroundRef */}
      <LiquidGlassView
        style={{ position: 'absolute', top: 60, left: 20, right: 20, height: 200 }}
        backgroundRef={backgroundRef}
        captureMode="periodic"
        captureInterval={500}
        cornerRadius={24}
      >
        <Text style={{ color: '#fff', fontSize: 20 }}>Header Card</Text>
      </LiquidGlassView>

      <LiquidGlassView
        style={{ position: 'absolute', bottom: 40, left: 20, right: 20, height: 60 }}
        backgroundRef={backgroundRef}
        captureMode="periodic"
        captureInterval={500}
        cornerRadius={16}
      >
        <Text style={{ color: '#fff' }}>Bottom Bar</Text>
      </LiquidGlassView>
    </View>
  );
}
```

## Imperative API

Use a ref to manually trigger captures in `manual` mode:

```tsx
import { useRef } from 'react';
import { LiquidGlassView, type LiquidGlassViewRef } from 'expo-rn-liquid-glass-view';

function ManualCapture() {
  const glassRef = useRef<LiquidGlassViewRef>(null);

  const handleCapture = async () => {
    await glassRef.current?.capture();
  };

  return (
    <LiquidGlassView
      ref={glassRef}
      captureMode="manual"
      backgroundRef={backgroundRef}
      style={{ width: 300, height: 200 }}
    />
  );
}
```

## Performance Monitoring

The `usePerformanceMonitor` hook consumes FPS data from the WebView and provides quality tier management. In **auto** mode it automatically reduces effect quality on slower devices; in **manual** mode the user picks a tier directly.

### Auto mode

```tsx
import { LiquidGlassView, usePerformanceMonitor } from 'expo-rn-liquid-glass-view';

function AdaptiveGlass() {
  const { adjustedProps, handlePerformanceReport } = usePerformanceMonitor({ mode: 'auto' });

  return (
    <LiquidGlassView
      style={{ width: 300, height: 200 }}
      displacementScale={70}
      aberrationIntensity={2}
      onPerformanceReport={handlePerformanceReport}
      {...adjustedProps}
    />
  );
}
```

### Manual mode

```tsx
const { adjustedProps, handlePerformanceReport, setTier } = usePerformanceMonitor({ mode: 'manual' });

// Switch to low quality
<Button title="Low Quality" onPress={() => setTier('low')} />
```

### Quality tiers

| Tier | Effect |
|------|--------|
| `high` | No overrides — user's original values pass through |
| `medium` | Removes chromatic aberration (biggest perf lever) |
| `low` | Reduced displacement + blur, no aberration |
| `minimal` | Near-zero effects, force `standard` displacement mode |

### Config options

| Option | Default | Description |
|--------|---------|-------------|
| `mode` | `'auto'` | `'auto'` or `'manual'` |
| `downgradeThreshold` | `24` | FPS below which quality steps down |
| `upgradeThreshold` | `50` | FPS above which quality steps up |
| `downgradeSampleCount` | `3` | Consecutive bad samples before downgrade (~6s) |
| `upgradeSampleCount` | `5` | Consecutive good samples before upgrade (~10s) |
| `initialTier` | `'high'` | Starting quality tier (auto won't upgrade above this) |
| `onTierChange` | — | Callback when tier changes: `(tier, fps) => void` |

## How It Works

This package runs the entire glass effect inside a transparent WebView overlay. No native modules are required.

### Architecture

```
LiquidGlassView (React Native)
  |-- measures layout via onLayout
  |-- manages background capture (react-native-view-shot)
  |-- renders WebViewRenderer
        |-- generates HTML document with:
        |     |-- SVG filter pipeline (displacement + chromatic aberration)
        |     |-- CSS backdrop-filter (blur + saturate)
        |     |-- Specular border highlights (screen/overlay blend)
        |     |-- JS bridge for prop updates
        |-- renders <WebView source={{html}} />
        |-- communicates via injectJavaScript / onMessage
```

### Rendering Pipeline

1. **SVG `feDisplacementMap`** — Warps backdrop content using displacement maps (pre-baked SVG gradients or runtime SDF canvas)
2. **Chromatic aberration** — Separate displacement passes for R/G/B channels at different scales, masked to edges only
3. **CSS `backdrop-filter`** — `blur()` + `saturate()` applied to the warped layer
4. **Specular borders** — Dual-layer borders with `mix-blend-mode: screen/overlay` for realistic light refraction
5. **Background refraction** — `react-native-view-shot` captures native content as base64, injected as the WebView body background with position offsetting per glass instance

## Roadmap

- [x] **Phase 1**: Core WebView renderer with SVG filter pipeline
- [x] **Phase 2**: Background capture with position offsetting, shared capture dedup, performance monitoring
- [ ] **Phase 3**: Native iOS 26+ `UIGlassEffect` renderer (auto-selected when available)
- [ ] **Phase 4**: Gyroscope-based specular highlights, WebView pre-warming

## Troubleshooting

### Android: Glass shows a white/blank background

Set `collapsable={false}` on the `backgroundRef` view. Without this prop, React Native may optimize away the view's native backing, causing `react-native-view-shot` to fail silently.

```tsx
<View ref={backgroundRef} collapsable={false}>
```

### Background refraction shows the wrong region

Ensure the `backgroundRef` view covers the full area behind all glass views. Each `LiquidGlassView` uses `measureInWindow` to compute its offset from the background — if the background view doesn't start at the expected position, the offset will be wrong.

### WebView content flickers on mount

This is normal — the WebView needs a moment to render the SVG filter pipeline. Use the `onReady` callback to show a loading state or fade in the glass:

```tsx
const [ready, setReady] = useState(false);

<LiquidGlassView
  style={{ opacity: ready ? 1 : 0 }}
  onReady={() => setReady(true)}
/>
```

### Performance is poor on older devices

Use the `usePerformanceMonitor` hook in `auto` mode to automatically reduce effect quality on slower devices. The `minimal` tier removes nearly all GPU-intensive operations while keeping the glass shape visible.

### "No view found with reactTag" error

This error from `react-native-view-shot` means the view hasn't mounted yet or has unmounted. The package handles this automatically via shared capture deduplication — ensure all glass views sharing a background use the same `backgroundRef` object (not separate refs pointing to the same view).

## Exports

```ts
// Component
export { LiquidGlassView } from 'expo-rn-liquid-glass-view';

// Types
export type {
  LiquidGlassViewProps,
  LiquidGlassViewRef,
  DisplacementMode,
  RendererType,
  CaptureMode,
} from 'expo-rn-liquid-glass-view';

// Utilities
export { isNativeLiquidGlassAvailable } from 'expo-rn-liquid-glass-view';

// Performance monitoring
export { usePerformanceMonitor, QUALITY_PRESETS } from 'expo-rn-liquid-glass-view';
export type {
  PerformanceTier,
  AdaptiveMode,
  PerformanceAdjustedProps,
  PerformanceMonitorConfig,
  PerformanceMonitorResult,
} from 'expo-rn-liquid-glass-view';
```

## Example App

The repository includes a full Expo example app that demonstrates all features with interactive controls.

```bash
cd example
npm install
npx expo run:ios    # or npx expo run:android
```

The example app showcases:

- All displacement modes (standard, polar, prominent, shader)
- Background refraction with multiple glass views sharing one capture source
- Live parameter adjustment (displacement, blur, saturation, aberration, corner radius)
- Performance monitoring with auto/manual quality tier selection
- Tint gradients and overLight mode

See [`example/App.tsx`](./example/App.tsx) for the full source.

## Contributing

```bash
# Install dependencies
npm install

# Type check
npm run typecheck

# Build
npm run build
```

## Credits

SVG filter pipeline ported from [liquid-glass-react](https://github.com/rdev/liquid-glass-react).

## License

MIT
