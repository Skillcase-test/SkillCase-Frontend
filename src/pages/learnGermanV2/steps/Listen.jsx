import { useEffect, useState } from "react";
import { shuffle } from "../lib/curriculum";
import { speak, blip } from "../lib/audio";
import MistakeBadge from "../components/MistakeBadge";

const NOT_THAT = ["Not that one.", "Not quite. Try another.", "Close, but no."];

export default function Listen({ step, ctx }) {
  const [opts] = useState(() => shuffle((step.from || []).slice()));
  const [wrongIdx, setWrongIdx] = useState(new Set());
  const [selected, setSelected] = useState(null);
  const [hint, setHint] = useState(null);
  const [playing, setPlaying] = useState(false);
  const correct = step.w;
  const word = (i) => (ctx.teaches && ctx.teaches[i]) || ["", "", ""];

  const play = () => {
    setPlaying(true);
    speak(word(correct)[0]);
    setTimeout(() => setPlaying(false), 1400);
  };
  useEffect(() => {
    play();
    ctx.setFootSkip({ label: "Can't listen right now", onSkip: () => { ctx.onCooldown("listen"); ctx.advance(); } });
    // eslint-disable-next-line
  }, [step]);

  const tap = (i) => {
    if (ctx.answered || selected !== null) return;
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
    const [de] = word(correct);
    ctx.commit(true, `That's <b>${de}</b>.`);
  };

  return (
    <>
      <div className="mb-2 min-h-[24px]">{step.reviewWord && <MistakeBadge />}</div>
      <div className="rounded-3xl bg-white p-5 ring-1 ring-slate-200">
        <div className="text-center text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">Listen</div>
        <button
          className={`mx-auto mt-3 flex h-16 w-16 items-center justify-center rounded-full bg-[#17336d] text-white shadow-md ${playing ? "lg2-playing" : ""}`}
          onClick={play}
          aria-label="Play the word again"
        >
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor" aria-hidden="true">
            <path d="M4 9v6h4l5 4V5L8 9H4z" />
            <path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </button>
        <div className="mt-1.5 text-center text-xs text-slate-400">Tap to hear it again</div>
        <div className="mt-3 text-center text-[17px] font-semibold text-slate-800">Which word did you hear?</div>
        <div className="mt-4 space-y-2.5">
          {opts.map((i) => {
            const [de, en] = word(i);
            const isWrong = wrongIdx.has(i);
            const isSel = selected === i;
            return (
              <button
                key={i}
                className={`w-full rounded-2xl p-3.5 text-left ring-2 transition ${
                  isSel
                    ? "bg-emerald-50 ring-emerald-500"
                    : isWrong
                      ? "bg-rose-50 ring-rose-300 opacity-60"
                      : "bg-slate-50 ring-transparent hover:ring-slate-300 active:scale-[0.99]"
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
    </>
  );
}
