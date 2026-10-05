import { useEffect, useState } from "react";
import { shuffle } from "../lib/curriculum";
import { speak, blip } from "../lib/audio";
import Maya from "../components/Maya";
import MistakeBadge from "../components/MistakeBadge";

const NOT_THAT = ["Not that one.", "Not quite. Try another.", "Close, but no."];

// Maya sends a voice note — a full sentence in a texting-a-friend register,
// and the learner picks the taught word out of it. Same answer format as
// Listen, but the word arrives inside real running speech.
export default function VoiceNote({ step, ctx }) {
  const [opts] = useState(() => shuffle((step.from || []).slice()));
  const [wrongIdx, setWrongIdx] = useState(new Set());
  const [selected, setSelected] = useState(null);
  const [hint, setHint] = useState(null);
  const [playing, setPlaying] = useState(false);
  const correct = step.w;
  const word = (i) => (ctx.teaches && ctx.teaches[i]) || ["", "", ""];

  const play = () => {
    setPlaying(true);
    speak(step.sentence);
    setTimeout(() => setPlaying(false), 1800);
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
      <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">Voice note from Maya</div>
      <div className="mt-2 flex items-center gap-2.5">
        <Maya mood="bob" className="h-10 w-10" />
        <button
          className={`flex-1 rounded-2xl rounded-bl-md bg-white px-4 py-3 text-left ring-1 ring-slate-200 ${playing ? "lg2-playing" : ""}`}
          onClick={play}
        >
          <div className="lg2-wave text-[#17336d]"><i /><i /><i /><i /><i /></div>
          <small className="mt-1 block text-[11px] font-medium text-slate-400">Tap to play again</small>
        </button>
      </div>
      {step.context && <div className="mt-2 text-sm text-slate-500">{step.context}</div>}
      <div className="mt-3 text-[17px] font-semibold text-slate-800">Which word did she say?</div>
      <div className="mt-3 space-y-2.5">
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
                    : "bg-white ring-slate-200 hover:ring-slate-300 active:scale-[0.99]"
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
    </>
  );
}
