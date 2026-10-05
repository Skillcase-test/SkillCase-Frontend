// The small marks the interface itself needs — a lock on a module you have
// not reached, the fallback where a portrait is missing. Ported from the
// reference app so v2 chrome never depends on OS emoji rendering.
const P = {
  lock: "M7 10V7a5 5 0 0 1 10 0v3M5.5 10h13v10.5h-13zM12 14.5v2.5",
  chat: "M4 5.5h16v11H9l-5 4v-4H4z",
  help: "M8.5 9.2a3.5 3.5 0 1 1 4.7 3.3c-.8.3-1.2 1-1.2 1.9v.6M12 18.4h.01",
  stetho: "M6 3v5a4 4 0 0 0 8 0V3M10 12v3a4 4 0 0 0 8 0v-1M18 11a2 2 0 1 0 0 4 2 2 0 0 0 0-4z",
  bulb: "M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.5.4.8 1 .9 1.6h5.2c.1-.6.4-1.2.9-1.6A6 6 0 0 0 12 3z",
  shield: "M12 3l7.5 3v6c0 4.4-3 8.2-7.5 9.5C7.5 20.2 4.5 16.4 4.5 12V6z",
  broken: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM8.5 9.5h.01M15.5 9.5h.01M8.5 16c1-1.3 2.1-2 3.5-2s2.5.7 3.5 2",
  flame: "M12 3c2.5 3 4 5 4 7.5a4 4 0 0 1-8 0C8 8 9.5 6 12 3zM12 21a6 6 0 0 0 6-6",
  stamp: "M9 3h6v3.5a3 3 0 0 0 1 2.2l1.5 1.4a3 3 0 0 1 1 2.2V15H5.5v-2.7a3 3 0 0 1 1-2.2L8 8.7A3 3 0 0 0 9 6.5zM4 18h16v3H4z",
  book: "M4 4h6a3 3 0 0 1 2 1 3 3 0 0 1 2-1h6v14h-6a3 3 0 0 0-2 1 3 3 0 0 0-2-1H4zM12 5v14",
  signal: "M4 20v-4M9 20V12M14 20V8M19 20V4",
};

export default function Glyph({ name = "lock", size = 20, className = "" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width={size} height={size}
      aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round">
      <path d={P[name] || P.lock} />
    </svg>
  );
}
