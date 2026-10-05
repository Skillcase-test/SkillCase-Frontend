import { useState } from "react";
import { shuffle } from "../lib/curriculum";
import { speak, blip } from "../lib/audio";

// Tap-then-place instead of drag-and-drop — native drag is unreliable on
// mobile touch and doesn't exist anywhere else in the product.
export default function CategorySort({ step = {}, ctx = {} }) {
  const buckets = Array.isArray(step?.buckets) ? step.buckets : [];
  const allItems = Array.isArray(step?.items) ? step.items : [];
  const [order] = useState(() => shuffle(allItems.map((_, i) => i)));
  const [placed, setPlaced] = useState({}); // itemIdx -> bucketId
  const [selected, setSelected] = useState(null); // itemIdx
  const [wrongFlash, setWrongFlash] = useState(null); // bucketId briefly
  const [hint, setHint] = useState(null);

  const remaining = order.filter((i) => placed[i] === undefined);
  const done = remaining.length === 0 && allItems.length > 0;

  const pickItem = (i) => {
    if (ctx?.answered || placed[i] !== undefined) return;
    setSelected(i);
    speak(allItems[i]?.w || "");
  };

  const dropOn = (bucketId) => {
    if (ctx?.answered || selected === null) return;
    const item = allItems[selected];
    if (item.b !== bucketId) {
      blip(false);
      ctx?.miss?.();
      setWrongFlash(bucketId);
      setHint("Not that bucket. Try another.");
      setTimeout(() => setWrongFlash(null), 400);
      setSelected(null);
      return;
    }
    blip(true);
    setHint(null);
    const next = { ...placed, [selected]: bucketId };
    setPlaced(next);
    setSelected(null);
    if (Object.keys(next).length === allItems.length) {
      ctx?.commit?.(true, "Sorted. That's the whole set.");
    }
  };

  return (
    <div className="rounded-3xl bg-white p-5 ring-1 ring-slate-200">
      <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">Sort them</div>
      <div className="mt-1.5 text-[19px] font-bold text-slate-800">{step?.q || "Which one is it?"}</div>
      <div className="mt-4 grid grid-cols-2 gap-2.5">
        {buckets.map((b) => (
          <div
            key={b.id}
            role="button"
            tabIndex={0}
            className={`min-h-[88px] rounded-2xl border-2 border-dashed p-3 transition ${
              wrongFlash === b.id
                ? "border-rose-400 bg-rose-50"
                : selected !== null
                  ? "border-indigo-300 bg-indigo-50/50"
                  : "border-slate-300 bg-slate-50/60"
            }`}
            onClick={() => dropOn(b.id)}
            onKeyDown={(e) => e.key === "Enter" && dropOn(b.id)}
          >
            <div className="text-sm font-bold text-slate-700">{b.icon} {b.label}</div>
            <div className="mt-1.5 flex flex-wrap gap-1">
              {allItems.map(
                (it, i) =>
                  placed[i] === b.id && (
                    <span key={i} className="rounded-lg bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800">
                      {it.w}
                    </span>
                  ),
              )}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 flex min-h-[44px] flex-wrap justify-center gap-2">
        {remaining.map((i) => (
          <button
            key={i}
            className={`rounded-xl px-3 py-2 text-[15px] font-semibold ring-1 transition ${
              selected === i
                ? "bg-indigo-600 text-white ring-indigo-600 scale-105"
                : "bg-white text-slate-800 ring-slate-300 shadow-sm active:scale-95"
            }`}
            onClick={() => pickItem(i)}
          >
            {allItems[i].w}
          </button>
        ))}
      </div>
      {!done && (
        <div className="mt-2 text-center text-xs text-slate-400">
          {selected !== null ? "Now tap the right bucket." : "Tap a word, then its bucket."}
        </div>
      )}
      {hint && <div className="mt-2 text-center text-sm font-medium text-rose-600">{hint}</div>}
    </div>
  );
}
