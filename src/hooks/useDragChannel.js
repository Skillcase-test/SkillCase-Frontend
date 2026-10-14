import { useCallback, useEffect, useMemo, useRef } from "react";

const SNAP_BACK = "transform 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94)";

// Moves a dragged card by writing its transform straight to the DOM, once per
// frame, so following the finger never re-renders the deck or the page.
// Attach `bind` to an inner wrapper that React never styles, and the card's
// own transitions (swipe out, deck shuffle) keep working on the outer element.
export function useDragChannel({ tilt = 0.04, lift = 0.06, shrink = 0.0006, minScale = 0.92 } = {}) {
  const offsetRef = useRef(0);
  const elRef = useRef(null);
  const frameRef = useRef(0);

  const paint = useCallback(() => {
    frameRef.current = 0;
    const el = elRef.current;
    if (!el) return;
    const x = offsetRef.current;
    if (x === 0) {
      el.style.transition = SNAP_BACK;
      el.style.transform = "";
      el.style.willChange = "";
      return;
    }
    const scale = Math.max(minScale, 1 - Math.abs(x) * shrink);
    el.style.transition = "none";
    el.style.willChange = "transform";
    el.style.transform = `translateX(${x}px) translateY(${Math.abs(x) * lift}px) rotate(${x * tilt}deg) scale(${scale})`;
  }, [tilt, lift, shrink, minScale]);

  const set = useCallback(
    (offset) => {
      offsetRef.current = offset;
      if (!frameRef.current) frameRef.current = requestAnimationFrame(paint);
    },
    [paint],
  );

  const bind = useCallback((el) => {
    // A card that stops being the front one must not keep its drag pose
    const prev = elRef.current;
    if (prev && prev !== el) {
      prev.style.transition = "none";
      prev.style.transform = "";
      prev.style.willChange = "";
    }
    elRef.current = el;
  }, []);

  useEffect(() => () => cancelAnimationFrame(frameRef.current), []);

  return useMemo(() => ({ offsetRef, set, bind }), [set, bind]);
}
