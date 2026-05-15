import { useRef, useState, useCallback } from "react";

interface SwipeRightOptions {
  onSwipe?: () => void;
  threshold?: number;
  maxVerticalDrift?: number;
}

export function useSwipeRight({ onSwipe, threshold = 72, maxVerticalDrift = 40 }: SwipeRightOptions) {
  const startX = useRef<number | null>(null);
  const startY = useRef<number | null>(null);
  const multitouch = useRef(false);
  const [progress, setProgress] = useState(0);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length > 1) { multitouch.current = true; return; }
    multitouch.current = false;
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!onSwipe || multitouch.current || startX.current === null || startY.current === null) return;
    if (e.touches.length > 1) { multitouch.current = true; setProgress(0); return; }

    const dx = e.touches[0].clientX - startX.current;
    const dy = Math.abs(e.touches[0].clientY - startY.current);

    if (dy > maxVerticalDrift) { setProgress(0); return; }
    if (dx > 0) setProgress(Math.min(dx / threshold, 1));
    else setProgress(0);
  }, [onSwipe, threshold, maxVerticalDrift]);

  const handleTouchEnd = useCallback(() => {
    if (!onSwipe || multitouch.current) { startX.current = null; startY.current = null; setProgress(0); return; }
    if (progress >= 1) {
      onSwipe();
      try { navigator.vibrate(12); } catch { /* unsupported */ }
    }
    startX.current = null;
    startY.current = null;
    setProgress(0);
  }, [onSwipe, progress]);

  return {
    swipeProgress: progress,
    swipeHandlers: { onTouchStart: handleTouchStart, onTouchMove: handleTouchMove, onTouchEnd: handleTouchEnd },
  };
}
