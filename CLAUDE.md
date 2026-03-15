# react-native-liquid-glass-view

## Package Identity

Cross-platform React Native package that brings Apple's liquid glass effect to both iOS and Android. Uses a WebView-based SVG filter pipeline (ported from [liquid-glass-react](https://github.com/rdev/liquid-glass-react)) to render the effect consistently across platforms.

**Key differentiator**: Works on Android and older iOS (not just iOS 26+) by running the SVG filter pipeline inside a WebView.

## Architecture

```
LiquidGlassView (orchestrator)
  ├── measures layout via onLayout
  ├── manages background capture (optional)
  └── delegates to renderer
        └── WebViewRenderer
              ├── generates HTML document (glassHTML.ts)
              │     ├── SVG filter pipeline (svgFilters.ts)
              │     ├── displacement maps (displacementMaps.ts)
              │     ├── CSS styles (glassCSS.ts)
              │     └── JS bridge (bridge.ts)
              ├── renders <WebView source={{html}} />
              └── communicates via injectJavaScript / onMessage
```

### Rendering Pipeline (inside WebView)

1. **SVG `feDisplacementMap`** — Warps backdrop content using displacement maps
2. **Chromatic aberration** — 3 separate displacement passes for R/G/B channels at different scales
3. **Edge masking** — Aberration only at edges, clean center via `feComposite`
4. **CSS `backdrop-filter`** — `blur()` + `saturate()` on the warp layer
5. **Specular borders** — Dual-layer borders with `mix-blend-mode: screen/overlay`

### Background Refraction

WebView `backdrop-filter` only sees content inside its DOM. To refract native RN content:
- `react-native-view-shot` captures a screenshot of the background view
- Base64 image is injected as the WebView body background via `injectJavaScript`
- Supports static (once), periodic (interval), realtime, and manual capture modes
- **Position offsetting**: Each glass view uses `measureInWindow` to determine its offset relative to `backgroundRef`, then sets CSS `background-position` so the WebView shows the correct region
- **Shared capture dedup**: Multiple instances sharing the same `backgroundRef` share a single capture loop via a module-level `WeakMap` registry — prevents concurrent `captureRef` calls and the "No view found with reactTag" error

## Tech Stack

| Layer | Choice |
|-------|--------|
| Language | TypeScript 5.x (strict) |
| Build | react-native-builder-bob |
| Rendering | WebView (react-native-webview) |
| Effects | SVG filters (feDisplacementMap, feColorMatrix, feBlend) |
| Capture | react-native-view-shot (optional peer dep) |

## File Structure

```
src/
├── index.ts                        # Public exports
├── LiquidGlassView.tsx             # Main orchestrator component
├── LiquidGlassView.types.ts        # All TypeScript interfaces
│
├── renderers/
│   └── WebViewRenderer.tsx          # WebView renderer with transparent bg
│
├── webview/
│   ├── glassHTML.ts                 # Assembles complete HTML document
│   ├── svgFilters.ts               # SVG filter pipeline (core visual effect)
│   ├── displacementMaps.ts          # SVG displacement maps + SDF shader code
│   ├── glassCSS.ts                  # CSS: backdrop blur, specular borders, shadows
│   └── bridge.ts                    # RN<->WebView JS communication bridge
│
├── capture/
│   ├── useBackgroundCapture.ts      # Screenshot hook for refraction (shared capture dedup)
│   └── captureThrottle.ts           # Throttle utility
│
├── performance/
│   ├── index.ts                     # Barrel re-exports
│   ├── types.ts                     # PerformanceTier, config, result interfaces
│   ├── qualityPresets.ts            # Quality tier → prop override mappings
│   └── usePerformanceMonitor.ts     # FPS-based adaptive quality hook
│
└── utils/
    ├── constants.ts                 # Default values
    └── platform.ts                  # iOS version detection
```

## Key Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `displacementScale` | number | 70 | Refraction intensity (0-200) |
| `blurAmount` | number | 0.0625 | Backdrop blur (0-1) |
| `saturation` | number | 140 | Backdrop color saturation (%) |
| `aberrationIntensity` | number | 2 | Chromatic aberration at edges (0-10) |
| `cornerRadius` | number | 20 | Glass shape corner radius (px) |
| `mode` | string | 'standard' | Displacement map: standard/polar/prominent/shader |
| `overLight` | boolean | false | Light background mode |
| `tintColor` | string | - | Solid color tint over the glass (any CSS color) |
| `tintGradient` | string | - | Gradient tint (any CSS gradient, overrides tintColor) |
| `backgroundRef` | RefObject | - | View to capture for refraction |
| `captureMode` | string | 'none' | static/periodic/manual/none |
| `fallbackBackground` | string | gradient | CSS background when no capture |
| `onReady` | function | - | Fires when WebView renders the effect |
| `onPerformanceReport` | function | - | Called with FPS data for performance monitoring |

## Dependencies

- **Required peer**: `react-native-webview` (>=13.0.0)
- **Optional peer**: `react-native-view-shot` (for refraction mode)

## Development Commands

```bash
npm run typecheck    # TypeScript verification
npm run build        # Build with react-native-builder-bob
```

## Critical Files (Read First)

1. `src/webview/svgFilters.ts` — Heart of the visual effect (SVG filter chain)
2. `src/webview/glassHTML.ts` — How all pieces assemble into a WebView document
3. `src/renderers/WebViewRenderer.tsx` — WebView lifecycle, prop injection, message handling
4. `src/LiquidGlassView.types.ts` — Full API surface
5. `src/capture/useBackgroundCapture.ts` — Background refraction mechanism

## Planned Phases

- **Phase 1** (done): Core WebView renderer with SVG filter pipeline
- **Phase 2** (done): Background capture with position offsetting, shared capture dedup, performance monitoring (`usePerformanceMonitor`)
- **Phase 3**: Native iOS 26+ UIGlassEffect renderer
- **Phase 4**: Gyroscope interaction, WebView pre-warming, npm publish
