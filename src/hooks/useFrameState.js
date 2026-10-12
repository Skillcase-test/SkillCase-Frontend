import { useCallback, useEffect, useRef, useState } from "react";

// useState for values driven by touchmove: renders at most once per frame,
// while the ref always holds the latest value for gesture decisions.
export function useFrameState(initial) {
  const [value, setValue] = useState(initial);
  const ref = useRef(initial);
  const frame = useRef(0);

  const set = useCallback((next) => {
    ref.current = next;
    if (frame.current) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = 0;
      setValue(ref.current);
    });
  }, []);

  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  return [value, set, ref];
}
