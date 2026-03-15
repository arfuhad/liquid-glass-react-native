/**
 * JavaScript bridge code injected into the WebView.
 *
 * Provides:
 * - window.updateProps(delta): Update glass effect properties without full re-render
 * - window.updateBackground(base64): Update the background image for refraction
 * - window.updateBorderGradient(angle, x, y): Update specular border angle
 * - FPS monitoring and reporting via postMessage
 */

/**
 * Generate the bridge JavaScript code as a string.
 * This is embedded in the HTML document's <script> tag.
 */
export function generateBridgeJS(): string {
  return `
(function() {
  'use strict';

  // ── State ──
  var isReady = false;
  var fpsFrames = 0;
  var fpsLastTime = performance.now();

  // ── DOM References (cached after DOMContentLoaded) ──
  var glassWarp = null;
  var glassTint = null;
  var borderScreen = null;
  var borderOverlay = null;
  var feImage = null;

  function init() {
    glassWarp = document.querySelector('.glass-warp');
    glassTint = document.querySelector('.glass-tint');
    borderScreen = document.querySelector('.glass-border--screen');
    borderOverlay = document.querySelector('.glass-border--overlay');
    feImage = document.querySelector('[id$="-feimage"]');

    if (!isReady) {
      isReady = true;
      postMessage({ type: 'ready' });
    }

    // Start FPS monitoring
    requestAnimationFrame(measureFPS);
  }

  // ── FPS Monitoring ──
  function measureFPS(now) {
    fpsFrames++;
    var elapsed = now - fpsLastTime;
    if (elapsed >= 2000) {
      var fps = Math.round((fpsFrames * 1000) / elapsed);
      postMessage({ type: 'fps', value: fps });
      fpsFrames = 0;
      fpsLastTime = now;
    }
    requestAnimationFrame(measureFPS);
  }

  // ── Message Sending ──
  function postMessage(data) {
    try {
      if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
        window.ReactNativeWebView.postMessage(JSON.stringify(data));
      }
    } catch (e) {
      // Silently fail if bridge not available
    }
  }

  // ── Public API ──

  /**
   * Update glass properties dynamically.
   * Accepts a partial props object with any of:
   * - blurAmount, saturation, displacementScale, aberrationIntensity, cornerRadius, overLight
   */
  window.updateProps = function(delta) {
    if (!glassWarp) return;

    if (delta.blurAmount !== undefined || delta.saturation !== undefined) {
      var blur = delta.blurAmount !== undefined ? delta.blurAmount : null;
      var sat = delta.saturation !== undefined ? delta.saturation : null;

      if (blur !== null || sat !== null) {
        var currentFilter = getComputedStyle(glassWarp).backdropFilter || '';
        var currentBlur = blur !== null
          ? ((delta.overLight ? 12 : 4) + blur * 32)
          : parseFloat(currentFilter.match(/blur\\(([\\d.]+)px\\)/)?.[1] || '4');
        var currentSat = sat !== null
          ? sat
          : parseFloat(currentFilter.match(/saturate\\(([\\d.]+)%\\)/)?.[1] || '140');

        var newBackdrop = 'blur(' + currentBlur + 'px) saturate(' + currentSat + '%)';
        glassWarp.style.backdropFilter = newBackdrop;
        glassWarp.style.webkitBackdropFilter = newBackdrop;
      }
    }

    if (delta.cornerRadius !== undefined) {
      var r = delta.cornerRadius + 'px';
      document.querySelectorAll('.glass-container, .glass-warp, .glass-tint, .glass-border, .glass-shadow, .glass-overlight-dim, .glass-overlight-blend').forEach(function(el) {
        el.style.borderRadius = r;
      });
    }

    if ((delta.tintColor !== undefined || delta.tintGradient !== undefined) && glassTint) {
      glassTint.style.background = delta.tintGradient || delta.tintColor || 'transparent';
    }

    if (delta.displacementScale !== undefined || delta.aberrationIntensity !== undefined) {
      // For displacement/aberration changes, we need to update SVG filter attributes
      // This requires regenerating the filter - send message to trigger HTML rebuild
      postMessage({ type: 'needs-rebuild', delta: delta });
    }
  };

  /**
   * Update the background image for refraction.
   * @param {string} dataUri - Full data URI (data:image/jpeg;base64,...)
   */
  window.updateBackground = function(dataUri) {
    document.body.style.backgroundImage = 'url(' + dataUri + ')';
  };

  /**
   * Update the background position to show the correct region behind this glass view.
   * @param {number} offsetX - Horizontal offset from background view origin
   * @param {number} offsetY - Vertical offset from background view origin
   * @param {number} bgWidth - Background view width
   * @param {number} bgHeight - Background view height
   */
  window.updateBackgroundPosition = function(offsetX, offsetY, bgWidth, bgHeight) {
    document.body.style.backgroundSize = bgWidth + 'px ' + bgHeight + 'px';
    document.body.style.backgroundPosition = '-' + offsetX + 'px -' + offsetY + 'px';
  };

  /**
   * Update the specular border gradient based on device orientation or touch.
   * @param {number} angle - Gradient angle offset
   * @param {number} x - X intensity
   * @param {number} y - Y intensity
   */
  window.updateBorderGradient = function(angle, x, y) {
    var grad = generateGradient(angle, x, y);
    document.documentElement.style.setProperty('--border-gradient', grad);
  };

  function generateGradient(angleOffset, intensityX, intensityY) {
    var angle = 135 + angleOffset * 1.2;
    var midOpacity1 = 0.12 + Math.abs(intensityX) * 0.008;
    var midOpacity2 = 0.4 + Math.abs(intensityX) * 0.012;
    var midStop1 = Math.max(10, 33 + intensityY * 0.3);
    var midStop2 = Math.min(90, 66 + intensityY * 0.4);
    return 'linear-gradient(' + angle + 'deg, rgba(255,255,255,0) 0%, rgba(255,255,255,' + midOpacity1 + ') ' + midStop1 + '%, rgba(255,255,255,' + midOpacity2 + ') ' + midStop2 + '%, rgba(255,255,255,0) 100%)';
  }

  // ── Init ──
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    init();
  } else {
    document.addEventListener('DOMContentLoaded', init);
  }
})();
`;
}
