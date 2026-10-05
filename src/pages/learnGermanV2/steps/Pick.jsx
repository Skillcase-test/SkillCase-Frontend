import { useState } from "react";
import { shuffle } from "../lib/curriculum";
import { speak, blip } from "../lib/audio";
import MistakeBadge, { HardBadge } from "../components/MistakeBadge";

const NOT_THAT = ["Not that one.", "Not quite. Try another.", "Close, but no."];

export default function Pick({ step, ctx }) {
  const [opts] = useState(() => shuffle((step.from || []).slice()));
  const [wrongIdx, setWrongIdx] = useState(new Set());
  const [selected, setSelected] = useState(null);
  const [hint, setHint] = useState(null);
  const correct = step.from?.[0] ?? 0;
  const word = (i) => (ctx.teaches && ctx.teaches[i]) || ["", "", ""];
  // "Which one IS Kaffee?" gives the German and asks for the meaning — tiles
  // show English. "Which one MEANS thank you?" gives English — tiles must
  // show German, or she'd solve it by matching glosses and never read German.
  const askForGerman = /\bmeans\b/i.test(step.q);

  const tap = (i) => {
    if (ctx.answered || selected !== null) return;
    const [de] = word(i);
    speak(de);
    if (i !== correct) {
      setWrongIdx((prev) => new Set(prev).add(i));
      blip(false);
      ctx.miss();
      const [cde, cen, cicon] = word(correct);
      ctx.onPushReview(cde, cen, cicon);
      setHint(NOT_THAT[Math.floor(Math.random() * NOT_THAT.length)]);
      return;
    }
    setSelected(i);
    blip(true);
    ctx.commit(true, `That's <b>${de}</b>.`);
  };

  return (
    <>
      <div className="mb-2 min-h-[24px]">
        {step.reviewWord ? <MistakeBadge /> : step.hard ? <HardBadge /> : null}
      </div>
      <div className="rounded-3xl bg-white p-5 ring-1 ring-slate-200">
        <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">Pick one</div>
        <div className="mt-1.5 text-lg font-bold leading-snug text-slate-800" dangerouslySetInnerHTML={{ __html: step.q }} />
        <div className="mt-4 grid grid-cols-2 gap-2.5">
          {opts.map((i) => {
            const [de, en] = word(i);
            const isWrong = wrongIdx.has(i);
            const isSel = selected === i;
            const revealed = isWrong || isSel;
            return (
              <button
                key={i}
                className={`min-h-[88px] rounded-2xl p-3 text-center transition ring-2 ${
                  isSel
                    ? "bg-emerald-50 ring-emerald-500"
                    : isWrong
                      ? "bg-rose-50 ring-rose-300 opacity-60"
                      : "bg-slate-50 ring-transparent hover:ring-slate-300 active:scale-[0.98]"
                }`}
                style={isWrong ? { pointerEvents: "none" } : undefined}
                onClick={() => tap(i)}
              >
                {askForGerman ? (
                  <>
                    <span className="block text-[17px] font-bold text-slate-800">{de}</span>
                    {revealed && <span className="mt-0.5 block text-xs text-slate-500">{en}</span>}
                  </>
                ) : (
                  <>
                    <span className="block text-[15px] font-semibold text-slate-800">{en}</span>
                    {revealed && <span className="mt-0.5 block text-xs font-bold text-indigo-700">{de}</span>}
                  </>
                )}
              </button>
            );
          })}
        </div>
        {hint && <div className="mt-3 text-center text-sm font-medium text-rose-600">{hint}</div>}
      </div>
    </>
  );
}
