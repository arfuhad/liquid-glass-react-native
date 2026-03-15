/**
 * HTML document generator for the liquid glass WebView.
 *
 * Assembles a complete HTML document from:
 * - SVG filter pipeline (svgFilters.ts)
 * - CSS styles (glassCSS.ts)
 * - Displacement maps (displacementMaps.ts)
 * - JS bridge code (bridge.ts)
 *
 * The resulting HTML string is injected into a WebView via source={{ html }}.
 */

import { generateSVGFilter } from './svgFilters';
import { generateGlassCSS, generateBorderGradientVar } from './glassCSS';
import { getDisplacementMap, shaderGeneratorJS } from './displacementMaps';
import { generateBridgeJS } from './bridge';
import type { DisplacementMode } from '../LiquidGlassView.types';

interface GlassHTMLParams {
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
}

/**
 * Generate a complete HTML document for the liquid glass effect.
 */
export function generateGlassHTML(params: GlassHTMLParams): string {
  const {
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
  } = params;

  const filterId = 'liquid-glass-filter';

  // Get displacement map href
  const displacementMapHref = getDisplacementMap(mode);

  // Generate components
  const svgFilter = generateSVGFilter({
    filterId,
    displacementScale,
    aberrationIntensity,
    mode,
    displacementMapHref: mode === 'shader' ? '' : displacementMapHref,
  });

  const css = generateGlassCSS({
    filterId,
    blurAmount,
    saturation,
    cornerRadius,
    overLight,
    tintColor,
    tintGradient,
    backgroundOffset,
    backgroundSize,
  });

  const borderGradient = generateBorderGradientVar(0, 0, 0);
  const bridgeJS = generateBridgeJS();

  // Background style
  const bgStyle = backgroundBase64
    ? `background-image: url(${backgroundBase64});`
    : `background: ${fallbackBackground};`;

  // Shader mode: include canvas-based displacement map generator
  const shaderScript = mode === 'shader'
    ? `
<script>
${shaderGeneratorJS}

(function() {
  var mapUrl = generateShaderDisplacementMap(${Math.min(width, 256)}, ${Math.min(height, 256)});
  if (mapUrl) {
    var feImg = document.getElementById('${filterId}-feimage');
    if (feImg) {
      feImg.setAttribute('href', mapUrl);
    }
  }
})();
</script>`
    : '';

  return `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<style>
:root {
  --border-gradient: ${borderGradient};
}
${css}
</style>
</head>
<body style="${bgStyle}">

${svgFilter}

<div class="glass-container">
  <!-- Backdrop warp layer with SVG displacement filter -->
  <div class="glass-warp"></div>

  <!-- Tint color overlay -->
  <div class="glass-tint"></div>

  <!-- Outer shadow -->
  <div class="glass-shadow"></div>

  <!-- Specular border layer 1 (screen blend) -->
  <div class="glass-border glass-border--screen"></div>

  <!-- Specular border layer 2 (overlay blend) -->
  <div class="glass-border glass-border--overlay"></div>

  <!-- OverLight mode overlays -->
  <div class="glass-overlight">
    <div class="glass-overlight-dim"></div>
    <div class="glass-overlight-blend"></div>
  </div>
</div>

${shaderScript}
<script>
${bridgeJS}
</script>
</body>
</html>`;
}
