/**
 * Background capture hook for refracting native RN content through the glass.
 *
 * Uses react-native-view-shot (optional peer dep) to capture a screenshot
 * of a referenced View and return it as a base64 data URI.
 *
 * Supports four capture modes:
 * - static: Capture once on mount + on layout changes
 * - periodic: Capture at regular intervals
 * - realtime: Self-chaining loop — captures as fast as the device allows
 * - manual: Only capture when imperatively triggered
 *
 * Multiple hooks sharing the same backgroundRef automatically deduplicate
 * captures — only one capture runs at a time per ref, and the result is
 * broadcast to all subscribers.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { View } from 'react-native';
import type { RefObject } from 'react';
import type { CaptureMode } from '../LiquidGlassView.types';
import { CAPTURE, DEFAULTS, REALTIME_CAPTURE } from '../utils/constants';
import { createCaptureThrottle } from './captureThrottle';

interface UseBackgroundCaptureOptions {
  backgroundRef?: RefObject<View>;
  captureMode: CaptureMode;
  captureInterval?: number;
  enabled: boolean;
}

interface UseBackgroundCaptureResult {
  backgroundBase64: string | null;
  capture: () => Promise<void>;
}

// Lazy import of react-native-view-shot to keep it optional
let captureRef: ((
  ref: number | View,
  options?: {
    format?: string;
    quality?: number;
    result?: string;
    width?: number;
    height?: number;
  }
) => Promise<string>) | null = null;

function loadViewShot(): boolean {
  if (captureRef) return true;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const viewShot = require('react-native-view-shot');
    captureRef = viewShot.captureRef;
    return true;
  } catch {
    console.warn(
      '[LiquidGlass] react-native-view-shot is not installed. ' +
        'Background capture is disabled. Install it for refraction mode: ' +
        'npm install react-native-view-shot'
    );
    return false;
  }
}

// ── Shared capture deduplication ──
// When multiple LiquidGlassView instances share the same backgroundRef,
// only one capture runs at a time and the result is broadcast to all.

type CaptureCallback = (dataUri: string) => void;

interface SharedCaptureState {
  capturing: boolean;
  callbacks: Set<CaptureCallback>;
  quality: number;
  maxWidth: number;
}

const sharedCaptures = new WeakMap<object, SharedCaptureState>();

function getShared(ref: RefObject<View>): SharedCaptureState {
  let state = sharedCaptures.get(ref);
  if (!state) {
    state = {
      capturing: false,
      callbacks: new Set(),
      quality: CAPTURE.jpegQuality,
      maxWidth: CAPTURE.maxWidth,
    };
    sharedCaptures.set(ref, state);
  }
  return state;
}

/**
 * Hook that captures screenshots of a referenced View for use as the
 * glass refraction background.
 */
export function useBackgroundCapture({
  backgroundRef,
  captureMode,
  captureInterval,
  enabled,
}: UseBackgroundCaptureOptions): UseBackgroundCaptureResult {
  const [backgroundBase64, setBackgroundBase64] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Register as a subscriber for shared capture results
  useEffect(() => {
    if (!backgroundRef || !enabled) return;
    const shared = getShared(backgroundRef);
    shared.callbacks.add(setBackgroundBase64);
    return () => {
      shared.callbacks.delete(setBackgroundBase64);
    };
  }, [backgroundRef, enabled]);

  const doCapture = useCallback(async () => {
    if (!enabled || !backgroundRef?.current) return;
    if (!loadViewShot() || !captureRef) return;

    const shared = getShared(backgroundRef);

    // Skip if another instance is already capturing this view
    if (shared.capturing) return;
    shared.capturing = true;

    const startTime = Date.now();

    try {
      const uri = await captureRef(backgroundRef.current, {
        format: 'jpg',
        quality: shared.quality,
        result: 'base64',
        width: shared.maxWidth,
      });

      const dataUri = `data:image/jpeg;base64,${uri}`;

      // Broadcast to all subscribers sharing this backgroundRef
      shared.callbacks.forEach(cb => cb(dataUri));

      // Adaptive quality: reduce quality if capture is slow
      const elapsed = Date.now() - startTime;
      if (elapsed > CAPTURE.verySlowCaptureThreshold) {
        shared.maxWidth = Math.max(200, shared.maxWidth * 0.5);
        shared.quality = Math.max(
          CAPTURE.minJpegQuality,
          shared.quality - 0.1
        );
      } else if (elapsed > CAPTURE.slowCaptureThreshold) {
        shared.quality = Math.max(
          CAPTURE.minJpegQuality,
          shared.quality - 0.05
        );
      }
    } catch (error) {
      console.warn('[LiquidGlass] Background capture failed:', error);
    } finally {
      shared.capturing = false;
    }
  }, [enabled, backgroundRef]);

  // Static mode: capture on mount
  useEffect(() => {
    if (!enabled || captureMode !== 'static') return;

    // Small delay to ensure the view is laid out
    const timer = setTimeout(doCapture, 100);
    return () => clearTimeout(timer);
  }, [enabled, captureMode, doCapture]);

  // Periodic mode: capture at intervals
  useEffect(() => {
    if (!enabled || captureMode !== 'periodic') return;

    // Initial capture
    doCapture();

    intervalRef.current = setInterval(doCapture, captureInterval ?? DEFAULTS.captureInterval);
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, captureMode, captureInterval, doCapture]);

  // Realtime mode: self-chaining capture loop
  useEffect(() => {
    if (!enabled || captureMode !== 'realtime') return;

    // Use aggressive defaults for realtime
    if (backgroundRef) {
      const shared = getShared(backgroundRef);
      shared.quality = REALTIME_CAPTURE.jpegQuality;
      shared.maxWidth = REALTIME_CAPTURE.maxWidth;
    }

    const minInterval = Math.max(
      REALTIME_CAPTURE.minInterval,
      captureInterval ?? REALTIME_CAPTURE.minInterval
    );

    let cancelled = false;
    let rafId: ReturnType<typeof requestAnimationFrame> | null = null;
    const throttle = createCaptureThrottle(minInterval);

    const scheduleNext = () => {
      if (cancelled) return;
      rafId = requestAnimationFrame(() => {
        if (cancelled) return;
        throttle.throttle(() => {
          doCapture().then(scheduleNext);
        });
      });
    };

    // Kick off the loop
    doCapture().then(scheduleNext);

    return () => {
      cancelled = true;
      throttle.cancel();
      if (rafId != null) {
        cancelAnimationFrame(rafId);
      }
    };
  }, [enabled, captureMode, captureInterval, doCapture, backgroundRef]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    backgroundBase64,
    capture: doCapture,
  };
}
