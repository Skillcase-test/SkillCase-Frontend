import { useState } from "react";
import { blip } from "../lib/audio";

const NOT_THAT = ["Not that ending.", "Close, but no.", "Try another."];

// Tests the grammar rule itself, not vocabulary recognition — and needs no
// audio: reading the sentence and picking the ending is the whole task.
export default function GapFill({ step = {}, ctx = {} }) {
  const options = Array.isArray(step?.options) ? step.options : [];
  const [wrongIdx, setWrongIdx] = useState(new Set());
  const [selected, setSelected] = useState(null);
  const [hint, setHint] = useState(null);
  const correct = step?.correct ?? 0;
  const [before = "", after = ""] = String(step?.sentence || "").split("__");

  const tap = (i) => {
    if (ctx?.answered || selected !== null) return;
    if (i !== correct) {
      setWrongIdx((prev) => new Set(prev).add(i));
      blip(false);
      ctx?.miss?.();
      setHint(NOT_THAT[Math.floor(Math.random() * NOT_THAT.length)]);
      return;
    }
    setSelected(i);
    blip(true);
    const whole = before.trim().split(/\s+/).pop() + options[correct];
    const msg = `<b>${whole}</b>.${step?.why ? ` ${step.why}` : ""}`;
    ctx?.commit?.(true, msg);
  };

  return (
    <div className="rounded-3xl bg-white p-5 ring-1 ring-slate-200">
      <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">Fill the gap</div>
      <div className="mt-3 text-xl font-bold leading-snug text-slate-800">
        {before}
        <span className={`inline-block min-w-[3ch] border-b-2 px-1 ${selected !== null ? "border-emerald-500 text-emerald-700" : "border-slate-300 text-slate-400"}`}>
          {selected !== null ? options[correct] : "___"}
        </span>
        {after}
      </div>
      {step?.en && <div className="mt-2 text-sm text-slate-500">{step.en}</div>}
      <div className="mt-4 grid grid-cols-2 gap-2.5">
        {options.map((opt, i) => {
          const isWrong = wrongIdx.has(i);
          const isSel = selected === i;
          return (
            <button
              key={i}
              className={`min-h-[56px] rounded-2xl p-3 text-center text-[17px] font-bold transition ring-2 ${
                isSel
                  ? "bg-emerald-50 text-emerald-800 ring-emerald-500"
                  : isWrong
                    ? "bg-rose-50 text-rose-600 ring-rose-300 opacity-60"
                    : "bg-slate-50 text-slate-800 ring-transparent hover:ring-slate-300 active:scale-[0.98]"
              }`}
              style={isWrong ? { pointerEvents: "none" } : undefined}
              onClick={() => tap(i)}
            >
              {opt}
            </button>
          );
        })}
      </div>
      {hint && <div className="mt-3 text-center text-sm font-medium text-rose-600">{hint}</div>}
    </div>
  );
}
