import { useState } from "react";
import { shuffle } from "../lib/curriculum";
import { speak, blip } from "../lib/audio";

const NOT_THAT = ["Not that one.", "That one fits. Look again.", "Close, but no."];

// Category reasoning instead of matching — three words share something, one
// doesn't. Cross-module by design: a recall check on everything she owns.
export default function OddOneOut({ step = {}, ctx = {} }) {
  const items = Array.isArray(step?.items) ? step.items : [];
  const [opts] = useState(() => shuffle(items.map((_, i) => i)));
  const [wrongIdx, setWrongIdx] = useState(new Set());
  const [selected, setSelected] = useState(null);
  const [hint, setHint] = useState(null);

  const tap = (i) => {
    if (ctx?.answered || selected !== null) return;
    const item = items[i] || [];
    const de = item[0] || "";
    if (de) speak(de);
    if (i !== step?.oddIdx) {
      setWrongIdx((prev) => new Set(prev).add(i));
      blip(false);
      ctx?.miss?.();
      setHint(NOT_THAT[Math.floor(Math.random() * NOT_THAT.length)]);
      return;
    }
    setSelected(i);
    blip(true);
    ctx?.commit?.(true, `<b>${de}</b> doesn't belong with the others.`);
  };

  return (
    <div className="rounded-3xl bg-white p-5 ring-1 ring-slate-200">
      <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">Odd one out</div>
      <div className="mt-1.5 text-lg font-bold text-slate-800" dangerouslySetInnerHTML={{ __html: step?.q || "Which one is different?" }} />
      <div className="mt-4 grid grid-cols-2 gap-2.5">
        {opts.map((i) => {
          const item = items[i] || [];
          const de = item[0] || "";
          const en = item[1] || "";
          const isWrong = wrongIdx.has(i);
          const isSel = selected === i;
          return (
            <button
              key={i}
              className={`min-h-[72px] rounded-2xl p-3 text-center transition ring-2 ${
                isSel
                  ? "bg-emerald-50 ring-emerald-500"
                  : isWrong
                    ? "bg-rose-50 ring-rose-300 opacity-60"
                    : "bg-slate-50 ring-transparent hover:ring-slate-300 active:scale-[0.98]"
              }`}
              style={isWrong ? { pointerEvents: "none" } : undefined}
              onClick={() => tap(i)}
            >
              <span className="block text-[16px] font-bold text-slate-800">{de}</span>
              <span className="block text-xs text-slate-500">{en}</span>
            </button>
          );
        })}
      </div>
      {hint && <div className="mt-3 text-center text-sm font-medium text-rose-600">{hint}</div>}
    </div>
  );
}
