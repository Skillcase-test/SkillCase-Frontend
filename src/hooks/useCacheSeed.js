import { useState } from "react";

// First-render state from the GET cache so a revisit paints without a skeleton.
// The screen still fetches as usual; this only replaces the empty first frame.
export function useCacheSeed(read, toState, ...args) {
  const [seed] = useState(() => {
    try {
      const hit = read?.peek?.(...args);
      return hit ? toState(hit.data) : undefined;
    } catch {
      return undefined;
    }
  });
  return seed;
}

export const asArray = (data) => (Array.isArray(data) ? data : undefined);
