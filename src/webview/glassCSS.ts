/**
 * CSS generation for the liquid glass effect.
 *
 * Generates styles for:
 * - Backdrop blur + saturate filter
 * - Specular border highlights (dual-layer with mix-blend-mode)
 * - OverLight dark overlay mode
 * - Glass edge shadows
 */

interface GlassCSSParams {
  filterId: string;
  blurAmount: number;
  saturation: number;
  cornerRadius: number;
  overLight: boolean;
  tintColor?: string;
  tintGradient?: string;
  backgroundOffset?: { x: number; y: number };
  backgroundSize?: { width: number; height: number };
}

/**
 * Generate the complete CSS stylesheet for the glass effect.
 */
export function generateGlassCSS(params: GlassCSSParams): string {
  const { filterId, blurAmount, saturation, cornerRadius, overLight, tintColor, tintGradient, backgroundOffset, backgroundSize } = params;

  const blurPx = (overLight ? 12 : 4) + blurAmount * 32;
  const shadowBlur = overLight ? 70 : 40;
  const shadowOffset = overLight ? 16 : 12;
  const shadowOpacity = overLight ? 0.75 : 0.25;

  return `
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body {
  width: 100%;
  height: 100%;
  overflow: hidden;
  background-size: ${backgroundSize ? `${backgroundSize.width}px ${backgroundSize.height}px` : 'cover'};
  background-position: ${backgroundOffset ? `-${backgroundOffset.x}px -${backgroundOffset.y}px` : 'center'};
  background-repeat: no-repeat;
}

.glass-container {
  position: absolute;
  inset: 0;
  border-radius: ${cornerRadius}px;
  overflow: hidden;
}

/* Layer 1: Backdrop warp with SVG displacement filter */
.glass-warp {
  position: absolute;
  inset: 0;
  border-radius: ${cornerRadius}px;
  backdrop-filter: blur(${blurPx}px) saturate(${saturation}%);
  -webkit-backdrop-filter: blur(${blurPx}px) saturate(${saturation}%);
  filter: url(#${filterId});
}

/* Tint color overlay */
.glass-tint {
  position: absolute;
  inset: 0;
  border-radius: ${cornerRadius}px;
  background: ${tintGradient || tintColor || 'transparent'};
  pointer-events: none;
}

/* Layer 2 & 3: Specular border highlights */
.glass-border {
  position: absolute;
  inset: 0;
  border-radius: ${cornerRadius}px;
  padding: 1.5px;
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  -webkit-mask-composite: xor;
  mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  mask-composite: exclude;
  pointer-events: none;
}

.glass-border--screen {
  mix-blend-mode: screen;
  opacity: 0.2;
  background: var(--border-gradient);
  box-shadow:
    0 0 0 0.5px rgba(255, 255, 255, 0.5) inset,
    0 1px 3px rgba(255, 255, 255, 0.25) inset,
    0 1px 4px rgba(0, 0, 0, 0.35);
}

.glass-border--overlay {
  mix-blend-mode: overlay;
  background: var(--border-gradient);
  box-shadow:
    0 0 0 0.5px rgba(255, 255, 255, 0.5) inset,
    0 1px 3px rgba(255, 255, 255, 0.25) inset,
    0 1px 4px rgba(0, 0, 0, 0.35);
}

/* Outer shadow */
.glass-shadow {
  position: absolute;
  inset: 0;
  border-radius: ${cornerRadius}px;
  box-shadow: 0px ${shadowOffset}px ${shadowBlur}px rgba(0, 0, 0, ${shadowOpacity});
  pointer-events: none;
}

/* OverLight mode overlays */
.glass-overlight {
  display: ${overLight ? 'block' : 'none'};
}

.glass-overlight-dim {
  position: absolute;
  inset: 0;
  border-radius: ${cornerRadius}px;
  opacity: 0.2;
  background: black;
}

.glass-overlight-blend {
  position: absolute;
  inset: 0;
  border-radius: ${cornerRadius}px;
  background: black;
  mix-blend-mode: overlay;
}
`;
}

/**
 * Generate the initial CSS custom property for the specular border gradient.
 * This can be updated dynamically via JS for gyroscope/touch interaction.
 */
export function generateBorderGradientVar(
  angleOffset: number = 0,
  intensityX: number = 0,
  intensityY: number = 0
): string {
  const angle = 135 + angleOffset * 1.2;
  const midOpacity1 = 0.12 + Math.abs(intensityX) * 0.008;
  const midOpacity2 = 0.4 + Math.abs(intensityX) * 0.012;
  const midStop1 = Math.max(10, 33 + intensityY * 0.3);
  const midStop2 = Math.min(90, 66 + intensityY * 0.4);

  return `linear-gradient(${angle}deg, rgba(255,255,255,0) 0%, rgba(255,255,255,${midOpacity1}) ${midStop1}%, rgba(255,255,255,${midOpacity2}) ${midStop2}%, rgba(255,255,255,0) 100%)`;
}
