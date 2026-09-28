// Engraved line-art marks for the passport stamps — one 24x24 stroke set so
// every stamp reads as one hand. Inherits ink via currentColor.
const P = {
  cup: "M4 8h11v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5zM15 9h2.5a2.5 2.5 0 0 1 0 5H15M4 21h12",
  wave: "M9 11V5.5a1.5 1.5 0 0 1 3 0V11m0-1.5V4.5a1.5 1.5 0 0 1 3 0V11m0-1a1.5 1.5 0 0 1 3 0v6a5 5 0 0 1-5 5h-1.6a5 5 0 0 1-3.9-1.9L5 15.5a1.6 1.6 0 0 1 2.4-2.1L9 15",
  person: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4.5 21a7.5 7.5 0 0 1 15 0",
  people: "M8.5 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM2 20a6.5 6.5 0 0 1 13 0M16 5.2a3.5 3.5 0 0 1 0 6.6M17.5 14.4A6.5 6.5 0 0 1 22 20",
  hands: "M3 13l3.5-3.5a2 2 0 0 1 2.8 0L12 12M21 13l-3.5-3.5a2 2 0 0 0-2.8 0L12 12M12 12v8M6 20h12",
  coin: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v10M14.5 9.5a2.5 2.5 0 0 0-5 .5c0 2.5 5 1.5 5 4a2.5 2.5 0 0 1-5 .5",
  receipt: "M6 3h12v18l-2.5-1.7L13 21l-2.5-1.7L8 21l-2-1.4zM9 8h6M9 12h6",
  plate: "M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
  bread: "M4 11a4 4 0 0 1 4-4h8a4 4 0 0 1 0 8v4a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1v-4a4 4 0 0 1-4-4zM9 11h6",
  meat: "M7.5 16.5a6 6 0 1 1 8.5-8.5l3.5 3.5-2 2 1 1-2 2-1-1-2 2z",
  apple: "M12 7c-3 0-5 2.2-5 5.5S9 21 12 21s5-5.2 5-8.5S15 7 12 7zM12 7c0-2 1-3.5 3-4",
  bag: "M6 8h12l1 13H5zM9 8V6a3 3 0 0 1 6 0v2",
  clock: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3.5 2",
  calendar: "M4 6h16v15H4zM4 11h16M8 3v5M16 3v5",
  phone: "M8 2h8a1 1 0 0 1 1 1v18a1 1 0 0 1-1-1H8a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1zM10 5h4M12 18.5h.01",
  pill: "M9 3.5h6a5.5 5.5 0 0 1 0 11H9a5.5 5.5 0 0 1 0-11zM12 3.5v11M4 20h16",
  bandage: "M6 10.5l4.5-4.5a5 5 0 0 1 7 7L13 17.5a5 5 0 0 1-7-7zM10 12h.01M13 10h.01M13 14h.01",
  stetho: "M6 3v5a4 4 0 0 0 8 0V3M10 12v3a4 4 0 0 0 8 0v-1M18 11a2 2 0 1 0 0 4 2 2 0 0 0 0-4z",
  bed: "M3 6v14M3 12h18v8M8 12V9h5a4 4 0 0 1 4 3",
  door: "M6 3h12v18H6zM15 12h.01",
  compass: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM15.5 8.5l-2 5-5 2 2-5z",
  house: "M4 11l8-7 8 7M6.5 9.5V20h11V9.5M10.5 20v-5h3v5",
  shirt: "M8 3l4 2.5L16 3l4 3-2.5 3.5L16 8v13H8V8l-1.5 1.5L4 6z",
  train: "M6 3h12v12H6zM6 9h12M8 19l-2 2M16 19l2 2M6 15h12v3H6zM9.5 12h.01M14.5 12h.01",
  ticket: "M3 8a2 2 0 0 0 0 8v3h18v-3a2 2 0 0 1 0-8V5H3zM12 6v2M12 11v2M12 16v2",
  book: "M4 4h6a3 3 0 0 1 2 1 3 3 0 0 1 2-1h6v14h-6a3 3 0 0 0-2 1 3 3 0 0 0-2-1H4zM12 5v14",
  trophy: "M7 4h10v4a5 5 0 0 1-10 0zM7 6H4v2a3 3 0 0 0 3 3M17 6h3v2a3 3 0 0 1-3 3M10 17h4l1 4H9z",
  check: "M4 12.5l5.5 5.5L20 7",
  cross: "M6 6l12 12M18 6L6 18",
  question: "M8.5 9a3.5 3.5 0 1 1 4.7 3.3c-.8.3-1.2 1-1.2 1.9v.8M12 18.5h.01",
  cloud: "M7.5 18a4.5 4.5 0 0 1-.4-9 6 6 0 0 1 11.4 1.6A4 4 0 0 1 17.5 18z",
  key: "M15.5 3a5.5 5.5 0 1 1-4.4 8.8L4 19l1.5 1.5L7 19l1.5 1.5L11 18l2.2-2.2A5.5 5.5 0 0 1 15.5 3zM17 8h.01",
};

// Every module, by what it actually gets you through — the reference map is
// kept verbatim; topics uploaded without a stamp_hint fall back to `check`.
const BY_TOPIC = {
  a1l1: "cup", a1l2: "wave", a1l3: "person", a1l4: "coin", a1l5: "plate",
  a1l6: "book", a1l7: "hands", a1l8: "book", a1l9: "phone", a1l10: "book",
  a1l11: "bread", a1l12: "question", a1l13: "meat", a1l14: "coin", a1l15: "apple",
  a1l16: "question", a1l17: "plate", a1l18: "receipt", a1l19: "bag", a1l20: "trophy",
  a1l21: "clock", a1l22: "calendar", a1l23: "calendar", a1l24: "stetho", a1l25: "calendar",
  a1l26: "calendar", a1l27: "clock", a1l28: "clock", a1l29: "train", a1l30: "check",
  a1l31: "stetho", a1l32: "pill", a1l33: "hands", a1l34: "stetho", a1l35: "compass",
  a1l36: "compass", a1l37: "house", a1l38: "cloud", a1l39: "phone", a1l40: "trophy",
  a1l41: "people", a1l42: "people", a1l43: "person", a1l44: "bandage", a1l45: "bandage",
  a1l46: "check", a1l47: "bed", a1l48: "hands", a1l49: "trophy", a1l50: "trophy",
  a1l51: "hands", a1l52: "cup", a1l53: "shirt", a1l54: "shirt", a1l55: "shirt",
  a1l56: "cloud", a1l57: "trophy", a1l58: "check", a1l59: "compass", a1l60: "book",
  a1l61: "bed", a1l62: "hands", a1l63: "calendar", a1l64: "coin", a1l65: "key",
  a1l66: "cross", a1l67: "train", a1l68: "ticket", a1l69: "trophy",
};

const glyphFor = (topic) =>
  topic?.stamp_hint || BY_TOPIC[topic?.id] || "check";

export default function StampGlyph({ topic = {}, x = 100, y = 62, size = 42 }) {
  const d = P[glyphFor(topic)] || P.check;
  const s = size / 24;
  return (
    <g transform={`translate(${x - size / 2} ${y - size / 2}) scale(${s})`}
      fill="none" stroke="currentColor" strokeWidth="1.7"
      strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </g>
  );
}
