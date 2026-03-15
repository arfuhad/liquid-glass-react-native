/**
 * SVG filter pipeline for the liquid glass effect.
 *
 * Ported from liquid-glass-react (rdev/liquid-glass-react).
 *
 * The filter chain creates edge-only chromatic aberration by:
 * 1. Loading a displacement map via feImage
 * 2. Creating an edge mask (center = transparent, edges = opaque)
 * 3. Displacing R, G, B channels separately with slightly different scales
 * 4. Recombining channels with screen blending
 * 5. Applying the edge mask so only edges are aberrated
 * 6. Compositing aberrated edges over clean center
 */

interface SVGFilterParams {
  filterId: string;
  displacementScale: number;
  aberrationIntensity: number;
  mode: 'standard' | 'polar' | 'prominent' | 'shader';
  displacementMapHref: string;
}

/**
 * Generate the SVG filter pipeline as an XML string.
 * This is injected into the WebView's HTML document.
 */
export function generateSVGFilter(params: SVGFilterParams): string {
  const {
    filterId,
    displacementScale,
    aberrationIntensity,
    mode,
    displacementMapHref,
  } = params;

  // Edge mask: radial gradient that masks out the center
  const edgeMaskStop = Math.max(30, 80 - aberrationIntensity * 2);

  // Scale sign differs between pre-baked maps and shader-generated maps
  const scaleSign = mode === 'shader' ? 1 : -1;
  const baseScale = displacementScale * scaleSign;
  const greenScale = displacementScale * (scaleSign - aberrationIntensity * 0.05);
  const blueScale = displacementScale * (scaleSign - aberrationIntensity * 0.1);

  // Blur softening for aberration
  const aberrationBlur = Math.max(0.1, 0.5 - aberrationIntensity * 0.1);

  return `
<svg style="position:absolute;width:0;height:0;overflow:hidden" aria-hidden="true">
  <defs>
    <radialGradient id="${filterId}-edge-mask" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="black" stop-opacity="0" />
      <stop offset="${edgeMaskStop}%" stop-color="black" stop-opacity="0" />
      <stop offset="100%" stop-color="white" stop-opacity="1" />
    </radialGradient>

    <filter id="${filterId}" x="-35%" y="-35%" width="170%" height="170%" color-interpolation-filters="sRGB">
      <!-- Load displacement map -->
      <feImage id="${filterId}-feimage" x="0" y="0" width="100%" height="100%"
        result="DISPLACEMENT_MAP"
        href="${displacementMapHref}"
        preserveAspectRatio="xMidYMid slice" />

      <!-- Extract edge intensity from displacement map -->
      <feColorMatrix in="DISPLACEMENT_MAP" type="matrix"
        values="0.3 0.3 0.3 0 0 0.3 0.3 0.3 0 0 0.3 0.3 0.3 0 0 0 0 0 1 0"
        result="EDGE_INTENSITY" />

      <!-- Create edge mask via threshold -->
      <feComponentTransfer in="EDGE_INTENSITY" result="EDGE_MASK">
        <feFuncA type="discrete" tableValues="0 ${aberrationIntensity * 0.05} 1" />
      </feComponentTransfer>

      <!-- Keep original for clean center -->
      <feOffset in="SourceGraphic" dx="0" dy="0" result="CENTER_ORIGINAL" />

      <!-- Red channel displacement -->
      <feDisplacementMap in="SourceGraphic" in2="DISPLACEMENT_MAP"
        scale="${baseScale}"
        xChannelSelector="R" yChannelSelector="B"
        result="RED_DISPLACED" />
      <feColorMatrix in="RED_DISPLACED" type="matrix"
        values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0"
        result="RED_CHANNEL" />

      <!-- Green channel displacement (slightly different scale for aberration) -->
      <feDisplacementMap in="SourceGraphic" in2="DISPLACEMENT_MAP"
        scale="${greenScale}"
        xChannelSelector="R" yChannelSelector="B"
        result="GREEN_DISPLACED" />
      <feColorMatrix in="GREEN_DISPLACED" type="matrix"
        values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0"
        result="GREEN_CHANNEL" />

      <!-- Blue channel displacement (even more offset for stronger aberration) -->
      <feDisplacementMap in="SourceGraphic" in2="DISPLACEMENT_MAP"
        scale="${blueScale}"
        xChannelSelector="R" yChannelSelector="B"
        result="BLUE_DISPLACED" />
      <feColorMatrix in="BLUE_DISPLACED" type="matrix"
        values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0"
        result="BLUE_CHANNEL" />

      <!-- Recombine channels with screen blending -->
      <feBlend in="GREEN_CHANNEL" in2="BLUE_CHANNEL" mode="screen" result="GB_COMBINED" />
      <feBlend in="RED_CHANNEL" in2="GB_COMBINED" mode="screen" result="RGB_COMBINED" />

      <!-- Soften aberration edges -->
      <feGaussianBlur in="RGB_COMBINED" stdDeviation="${aberrationBlur}" result="ABERRATED_BLURRED" />

      <!-- Apply edge mask: aberration only at edges -->
      <feComposite in="ABERRATED_BLURRED" in2="EDGE_MASK" operator="in" result="EDGE_ABERRATION" />

      <!-- Invert mask for clean center -->
      <feComponentTransfer in="EDGE_MASK" result="INVERTED_MASK">
        <feFuncA type="table" tableValues="1 0" />
      </feComponentTransfer>
      <feComposite in="CENTER_ORIGINAL" in2="INVERTED_MASK" operator="in" result="CENTER_CLEAN" />

      <!-- Final composite: aberrated edges over clean center -->
      <feComposite in="EDGE_ABERRATION" in2="CENTER_CLEAN" operator="over" />
    </filter>
  </defs>
</svg>`;
}
