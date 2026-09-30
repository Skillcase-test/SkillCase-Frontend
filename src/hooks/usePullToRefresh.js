import { useCallback, useMemo, useRef, useState } from "react";
import { hapticLight, hapticMedium } from "../utils/haptics";

const THRESHOLD = 150;
const MAX_PULL = 180;
const RESISTANCE = 0.40;
const SNAP_BACK = "transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)";

export function usePullToRefresh(onRefresh, enabled = true) {
  // pullProgress feeds the indicator only, and is quantised to 1/20 steps so a
  // gesture costs ~20 renders instead of one per touchmove. The pull transform
  // itself is written straight to contentRef below, so following the finger
  // never re-renders the route tree.
  const [pullProgress, setPullProgress] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const contentRef = useRef(null);
  const pullDistance = useRef(0);
  const startY = useRef(null);
  const pulling = useRef(false);
  const hapticFired = useRef(false);
  const scrollerRef = useRef(null); // nearest scrollable ancestor, set at touchstart

  const setPull = useCallback((distance) => {
    pullDistance.current = distance;

    const el = contentRef.current;
    if (el) {
      if (distance > 0) {
        el.style.transition = "none";
        el.style.transform = `translateY(${distance}px)`;
      } else {
        el.style.transition = SNAP_BACK;
        // One forced flush per release (not per frame) so the transition is
        // definitely in effect before the transform clears and the snap-back
        // animates instead of jumping.
        void el.offsetHeight;
        el.style.transform = "";
      }
    }

    const next = Math.min(distance / (THRESHOLD * RESISTANCE), 1);
    const stepped = Math.round(next * 20) / 20;
    setPullProgress((prev) => (prev === stepped ? prev : stepped));
  }, []);

  const resetPull = useCallback(() => {
    pulling.current = false;
    startY.current = null;
    hapticFired.current = false;
    scrollerRef.current = null;
    setPull(0);
  }, [setPull]);

  const onTouchStart = useCallback(
    (event) => {
      if (!enabled || isRefreshing) return;
      if (window.scrollY > 0) return;
      // Swipeable card decks (flashcard/speaking) mark themselves so a
      // horizontal swipe's incidental vertical drift never arms the pull
      // gesture — see A1/A2/B1FlashcardDeck and SpeakingCardDeck.
      if (event.target.closest?.("[data-no-pull-refresh]")) return;

      // A nested scroller that is already scrolled down owns the gesture —
      // nested pages keep window.scrollY at 0, so the window check alone
      // can't tell a mid-scroll swipe from a top-of-page pull.
      let scroller = null;
      for (
        let el = event.target;
        el && el !== document.body && el !== document.documentElement;
        el = el.parentElement
      ) {
        if (el.scrollTop > 0) return;
        if (!scroller && el.scrollHeight - el.clientHeight > 1) scroller = el;
      }
      scrollerRef.current = scroller;

      startY.current = event.touches[0].clientY;
      pulling.current = true;
      hapticFired.current = false;
    },
    [enabled, isRefreshing],
  );

  const onTouchMove = useCallback(
    (event) => {
      if (!enabled || !pulling.current || startY.current === null || isRefreshing) {
        return;
      }

      // The scroller claimed the gesture mid-swipe — disarm.
      if (window.scrollY > 0 || scrollerRef.current?.scrollTop > 0) {
        pulling.current = false;
        setPull(0);
        return;
      }

      const delta = event.touches[0].clientY - startY.current;
      if (delta <= 0) {
        setPull(0);
        return;
      }

      event.preventDefault();

      const clamped = Math.min(delta * RESISTANCE, MAX_PULL);
      setPull(clamped);

      if (clamped >= THRESHOLD * RESISTANCE && !hapticFired.current) {
        hapticLight();
        hapticFired.current = true;
      }
    },
    [enabled, isRefreshing, setPull],
  );

  const onTouchEnd = useCallback(async () => {
    if (!enabled || !pulling.current) return;

    pulling.current = false;
    startY.current = null;

    const threshold = THRESHOLD * RESISTANCE;
    if (pullDistance.current >= threshold && !isRefreshing) {
      hapticMedium();
      setIsRefreshing(true);
      setPull(0);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
      }
      return;
    }

    setPull(0);
  }, [enabled, isRefreshing, onRefresh, setPull]);

  // App.jsx attaches these with addEventListener in an effect keyed on this
  // object, so it has to be memoised — a fresh literal each render made that
  // effect tear down and re-register all three touch listeners on every render.
  const containerProps = useMemo(
    () => ({ onTouchStart, onTouchMove, onTouchEnd }),
    [onTouchStart, onTouchMove, onTouchEnd],
  );

  return {
    pullProgress,
    isRefreshing,
    resetPull,
    contentRef,
    containerProps,
  };
}
