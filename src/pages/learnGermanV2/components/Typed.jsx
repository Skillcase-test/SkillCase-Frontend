import { useEffect, useRef, useState } from "react";

const MS_PER_CHAR = 24;

// Maya arriving with her line already printed is easy to skip past — nothing
// moved, so nothing pulled the eye down to her. Typing it does, at exactly the
// moment attention needs to move off the title card. Ported from the
// reference app; tap-to-complete and prefers-reduced-motion retained.
export default function Typed({ text, className = "", onDone }) {
  const [n, setN] = useState(0);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  const reduced = typeof window !== "undefined" && window.matchMedia
    ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
    : false;
  const str = String(text || "");

  useEffect(() => {
    if (reduced || !str) { setN(str.length); doneRef.current?.(); return; }
    setN(0);
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setN(i);
      if (i >= str.length) { clearInterval(id); doneRef.current?.(); }
    }, MS_PER_CHAR);
    return () => clearInterval(id);
  }, [str, reduced]);

  const finished = n >= str.length;

  return (
    <span
      className={className}
      aria-label={str}
      onClick={finished ? undefined : () => { setN(str.length); doneRef.current?.(); }}
    >
      <span aria-hidden="true">{str.slice(0, n)}</span>
      {!finished && <span aria-hidden="true" className="inline-block w-px" />}
    </span>
  );
}
