import { useEffect, useState } from "react";

/**
 * Trailing-edge debounce for filter/search inputs.
 *
 * Every admin list that fetches on a search term needs this: without it each
 * keystroke fires a request, and a list that flips to a spinner mid-typing
 * unmounts its own input and loses focus.
 */
export default function useDebounce(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}
