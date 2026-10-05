import { useState } from "react";
import { speak, blip } from "../lib/audio";

const NOT_THAT = ["Not that one.", "Look again.", "Close, but no."];

// She evaluates someone else's sentence instead of producing her own — lower
// stakes than it sounds: she's grading a line, not herself.
export default function SpotMistake({ step = {}, ctx = {} }) {
  const [wrongIdx, setWrongIdx] = useState(new Set());
  const [selected, setSelected] = useState(null);
  const [hint, setHint] = useState(null);
  const tokens = Array.isArray(step?.tokens) ? step.tokens : [];

  const tap = (i) => {
    if (ctx?.answered || selected !== null) return;
    if (i !== step?.wrongIdx) {
      setWrongIdx((prev) => new Set(prev).add(i));
      blip(false);
      ctx?.miss?.();
      setHint(NOT_THAT[Math.floor(Math.random() * NOT_THAT.length)]);
      return;
    }
    setSelected(i);
    blip(true);
    if (step?.shouldBe) speak(step.shouldBe);
    ctx?.commit?.(true, `It should be <b>${step?.shouldBe || ""}</b>, not <b>${tokens[i] || ""}</b>.`);
  };

  return (
    <div className="rounded-3xl bg-white p-5 ring-1 ring-slate-200">
      <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">Spot the mistake</div>
      <div className="mt-1.5 text-sm text-slate-500">{step?.context || ""}</div>
      <div className="mt-4 flex flex-wrap items-center justify-center gap-1.5 rounded-2xl bg-slate-50 p-4 text-lg">
        <span className="text-2xl text-slate-300">“</span>
        {tokens.map((tok, i) => {
          const isWrong = wrongIdx.has(i);
          const isSel = selected === i;
          return (
            <button
              key={i}
              className={`rounded-lg px-2 py-1 font-bold transition ring-1 ${
                isSel
                  ? "bg-emerald-100 text-emerald-800 ring-emerald-400"
                  : isWrong
                    ? "bg-rose-100 text-rose-700 ring-rose-300 opacity-60"
                    : "bg-white text-slate-800 ring-slate-200 hover:ring-indigo-300 active:scale-95"
              }`}
              style={isWrong ? { pointerEvents: "none" } : undefined}
              onClick={() => tap(i)}
            >
              {tok}
            </button>
          );
        })}
        <span className="text-2xl text-slate-300">.”</span>
      </div>
      <div className="mt-3 text-center text-[17px] font-semibold text-slate-800">One word here is wrong. Tap it.</div>
      {hint && <div className="mt-2 text-center text-sm font-medium text-rose-600">{hint}</div>}
    </div>
  );
}
