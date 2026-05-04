import { useCallback, useRef, useState } from "react";
import { hapticLight, hapticMedium } from "../utils/haptics";

const THRESHOLD = 80;
const MAX_PULL = 120;
const RESISTANCE = 0.45;
const DEFAULT_ACTIVATION_Y = 96;

export function usePullToRefresh(onRefresh, enabled = true, options = {}) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const activationY = options.activationY ?? DEFAULT_ACTIVATION_Y;

  const startY = useRef(null);
  const pulling = useRef(false);
  const hapticFired = useRef(false);

  const resetPull = useCallback(() => {
    pulling.current = false;
    startY.current = null;
    hapticFired.current = false;
    setPullDistance(0);
  }, []);

  const onTouchStart = useCallback(
    (event) => {
      if (!enabled || isRefreshing) return;
      if (window.scrollY > 0) return;
      if (event.touches[0].clientY > activationY) return;

      startY.current = event.touches[0].clientY;
      pulling.current = true;
      hapticFired.current = false;
    },
    [activationY, enabled, isRefreshing],
  );

  const onTouchMove = useCallback(
    (event) => {
      if (!enabled || !pulling.current || startY.current === null || isRefreshing) {
        return;
      }

      const delta = event.touches[0].clientY - startY.current;
      if (delta <= 0) {
        setPullDistance(0);
        return;
      }

      event.preventDefault();

      const clamped = Math.min(delta * RESISTANCE, MAX_PULL);
      setPullDistance(clamped);

      if (clamped >= THRESHOLD * RESISTANCE && !hapticFired.current) {
        hapticLight();
        hapticFired.current = true;
      }
    },
    [enabled, isRefreshing],
  );

  const onTouchEnd = useCallback(async () => {
    if (!enabled || !pulling.current) return;

    pulling.current = false;
    startY.current = null;

    const threshold = THRESHOLD * RESISTANCE;
    if (pullDistance >= threshold && !isRefreshing) {
      hapticMedium();
      setIsRefreshing(true);
      setPullDistance(0);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
      }
      return;
    }

    setPullDistance(0);
  }, [enabled, isRefreshing, onRefresh, pullDistance]);

  const pullProgress = Math.min(pullDistance / (THRESHOLD * RESISTANCE), 1);

  return {
    pullProgress,
    pullDistance,
    isRefreshing,
    resetPull,
    containerProps: {
      onTouchStart,
      onTouchMove,
      onTouchEnd,
    },
  };
}
