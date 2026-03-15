/**
 * Displacement map generation for liquid glass effect.
 *
 * Provides two strategies:
 * 1. Pre-baked displacement maps generated as SVG data URIs (standard/polar/prominent)
 * 2. Runtime canvas-based SDF shader generation (shader mode)
 *
 * The displacement maps encode direction as color channels:
 * - Red channel: X displacement (0.5 = neutral, <0.5 = left, >0.5 = right)
 * - Blue/Green channel: Y displacement (0.5 = neutral)
 *
 * These are consumed by SVG feDisplacementMap with xChannelSelector="R" yChannelSelector="B"
 */

/**
 * Generate an SVG-based displacement map as a data URI.
 * This replaces the pre-baked JPEG approach with procedurally generated SVGs
 * that work identically across all platforms without needing large base64 blobs.
 */
function generateSVGDisplacementMap(
  variant: 'standard' | 'polar' | 'prominent'
): string {
  // All variants use radial gradients that encode displacement direction.
  // Neutral = rgb(128,128,128), edges push outward from center.
  const configs = {
    standard: {
      // Gentle radial displacement - edges push slightly outward
      innerStop: 65,
      outerStop: 100,
      innerColor: '128,128,128', // neutral center
      outerColor: '200,128,60',  // push right (R>128) and up (B<128) at edges
    },
    polar: {
      // Polar coordinate variant - more circular distortion
      innerStop: 50,
      outerStop: 95,
      innerColor: '128,128,128',
      outerColor: '190,128,70',
    },
    prominent: {
      // Stronger edge displacement for dramatic effect
      innerStop: 40,
      outerStop: 100,
      innerColor: '128,128,128',
      outerColor: '220,128,40',
    },
  };

  const c = configs[variant];

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
  <defs>
    <radialGradient id="d" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="rgb(${c.innerColor})" />
      <stop offset="${c.innerStop}%" stop-color="rgb(${c.innerColor})" />
      <stop offset="${c.outerStop}%" stop-color="rgb(${c.outerColor})" />
    </radialGradient>
  </defs>
  <rect width="256" height="256" fill="url(#d)" />
</svg>`;

  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

/**
 * JavaScript code for the canvas-based SDF shader displacement map generator.
 * This runs inside the WebView to generate a displacement map dynamically.
 * Ported from liquid-glass-react's ShaderDisplacementGenerator.
 */
export const shaderGeneratorJS = `
function generateShaderDisplacementMap(width, height) {
  var canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  var ctx = canvas.getContext('2d');
  if (!ctx) return null;

  var w = width;
  var h = height;

  function smoothStep(a, b, t) {
    t = Math.max(0, Math.min(1, (t - a) / (b - a)));
    return t * t * (3 - 2 * t);
  }

  function lengthVec(x, y) {
    return Math.sqrt(x * x + y * y);
  }

  function roundedRectSDF(x, y, rw, rh, radius) {
    var qx = Math.abs(x) - rw + radius;
    var qy = Math.abs(y) - rh + radius;
    return Math.min(Math.max(qx, qy), 0) + lengthVec(Math.max(qx, 0), Math.max(qy, 0)) - radius;
  }

  var maxScale = 0;
  var rawValues = [];

  for (var y = 0; y < h; y++) {
    for (var x = 0; x < w; x++) {
      var uvX = x / w;
      var uvY = y / h;
      var ix = uvX - 0.5;
      var iy = uvY - 0.5;
      var distanceToEdge = roundedRectSDF(ix, iy, 0.3, 0.2, 0.6);
      var displacement = smoothStep(0.8, 0, distanceToEdge - 0.15);
      var scaled = smoothStep(0, 1, displacement);
      var posX = ix * scaled + 0.5;
      var posY = iy * scaled + 0.5;
      var dx = posX * w - x;
      var dy = posY * h - y;
      maxScale = Math.max(maxScale, Math.abs(dx), Math.abs(dy));
      rawValues.push(dx, dy);
    }
  }

  if (maxScale > 0) {
    maxScale = Math.max(maxScale, 1);
  } else {
    maxScale = 1;
  }

  var imageData = ctx.createImageData(w, h);
  var data = imageData.data;
  var rawIndex = 0;

  for (var y = 0; y < h; y++) {
    for (var x = 0; x < w; x++) {
      var dx = rawValues[rawIndex++];
      var dy = rawValues[rawIndex++];
      var edgeDistance = Math.min(x, y, w - x - 1, h - y - 1);
      var edgeFactor = Math.min(1, edgeDistance / 2);
      var smoothedDx = dx * edgeFactor;
      var smoothedDy = dy * edgeFactor;
      var r = smoothedDx / maxScale + 0.5;
      var g = smoothedDy / maxScale + 0.5;
      var pixelIndex = (y * w + x) * 4;
      data[pixelIndex] = Math.max(0, Math.min(255, r * 255));
      data[pixelIndex + 1] = Math.max(0, Math.min(255, g * 255));
      data[pixelIndex + 2] = Math.max(0, Math.min(255, g * 255));
      data[pixelIndex + 3] = 255;
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL();
}
`;

/** Cache for generated SVG displacement maps */
const mapCache: Record<string, string> = {};

/**
 * Get the displacement map data URI for a given mode.
 * For standard/polar/prominent: returns an SVG data URI.
 * For shader: returns empty string (generated at runtime in WebView).
 */
export function getDisplacementMap(
  mode: 'standard' | 'polar' | 'prominent' | 'shader'
): string {
  if (mode === 'shader') return '';

  if (!mapCache[mode]) {
    mapCache[mode] = generateSVGDisplacementMap(mode);
  }
  return mapCache[mode];
}
