/**
 * Throttle utility for background captures.
 * Ensures captures don't fire more frequently than the minimum interval.
 */

export function createCaptureThrottle(minInterval: number) {
  let lastCaptureTime = 0;
  let pendingCapture: ReturnType<typeof setTimeout> | null = null;

  return {
    /**
     * Schedule a capture, throttled to minInterval.
     * Returns true if the capture was executed immediately.
     */
    throttle(fn: () => void): boolean {
      const now = Date.now();
      const elapsed = now - lastCaptureTime;

      if (elapsed >= minInterval) {
        lastCaptureTime = now;
        fn();
        return true;
      }

      // Schedule for later if not already pending
      if (!pendingCapture) {
        const delay = minInterval - elapsed;
        pendingCapture = setTimeout(() => {
          lastCaptureTime = Date.now();
          pendingCapture = null;
          fn();
        }, delay);
      }

      return false;
    },

    /** Cancel any pending throttled capture */
    cancel() {
      if (pendingCapture) {
        clearTimeout(pendingCapture);
        pendingCapture = null;
      }
    },
  };
}
