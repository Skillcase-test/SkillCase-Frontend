import { useEffect, useRef, useState } from "react";
import { speak, blip } from "../lib/audio";
import WordArt from "../components/WordArt";
import { treatmentFor } from "../lib/vocabArt";
import Glyph from "../components/Glyph";

// The moment a new word appears — the tile spins like a slot reel, flips over
// to reveal the word, settles with a sound and a badge, and only then does she
// hear it spoken.
export default function Teach({ step, ctx }) {
  const [de = "", en = "", pic = ""] = (ctx.teaches && ctx.teaches[step.w]) || [];
  const treatment = treatmentFor(de, pic);
  const bare = treatment.kind === "word";
  const spoken =
    treatment.kind === "usage"
      ? treatment.parts.join("")
      : treatment.kind === "contrast"
        ? treatment.lines[treatment.lines.length - 1][0]
        : de;
  const [phase, setPhase] = useState("spin"); // spin -> settle -> done
  const held = useRef(null);
  const playedSlow = useRef(false);
  const [playing, setPlaying] = useState(false);
  const play = (slow) => {
    speak(spoken, slow);
    setPlaying(true);
    setTimeout(() => setPlaying(false), slow ? 1500 : 1000);
  };

  useEffect(() => {
    setPhase("spin");
    ctx.setMainBtn({ label: "Got it", disabled: true });
    const t1 = setTimeout(() => {
      setPhase("settle");
      blip(true);
    }, 620);
    const t2 = setTimeout(() => {
      setPhase("done");
      ctx.setMainBtn({ label: "Got it", disabled: false });
      play(false);
    }, 1000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
    // eslint-disable-next-line
  }, [step]);

  const revealed = phase !== "spin";

  return (
    <div className="flex flex-col items-center text-center">
      <div className="mb-4 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">New word</div>
      <div className="lg2-flip3d w-full max-w-[280px]">
        <div className={`lg2-flip3d-inner ${phase === "spin" ? "spin" : "settle"}`}>
          {phase === "spin" ? (
            <div className="grid min-h-[220px] place-items-center rounded-3xl bg-[#17336d] text-white/80" aria-hidden="true">
              <Glyph name="lock" size={54} />
            </div>
          ) : (
            <div className="flex min-h-[220px] flex-col items-center justify-center gap-3 rounded-3xl bg-white p-5 ring-1 ring-slate-200">
              {!bare && (
                <div className="w-full">
                  <WordArt de={de} en={en} pic={pic} variant="hero" size={120} />
                </div>
              )}
              <div className="text-2xl font-extrabold text-slate-800">{de}</div>
              <div className="text-[15px] text-slate-500">{en}</div>
            </div>
          )}
        </div>
      </div>
      {revealed && (
        <div className="mt-3 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700">
          +1 word unlocked
        </div>
      )}
      <div className="h-5" />
      <button
        className={`flex w-full max-w-[280px] items-center gap-3 rounded-2xl bg-[#17336d] px-4 py-3 text-white shadow-md disabled:opacity-50 ${playing ? "lg2-playing" : ""}`}
        disabled={!revealed}
        aria-label="Play pronunciation"
        onClick={() => {
          // A hold already fired the slow play — the release click must not
          // cut it off with the normal-speed one.
          if (playedSlow.current) { playedSlow.current = false; return; }
          play(false);
        }}
        onPointerDown={() => { held.current = setTimeout(() => { playedSlow.current = true; play(true); }, 450); }}
        onPointerUp={() => clearTimeout(held.current)}
      >
        <span aria-hidden="true">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
            <path d="M4 9v6h4l5 4V5L8 9H4z" />
            <path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </span>
        <span className="flex-1 truncate text-left text-sm font-semibold">{spoken}</span>
        <div className="lg2-wave"><i /><i /><i /><i /><i /></div>
      </button>
      <div className="mt-2 text-xs text-slate-400">
        {bare ? "Tap to hear it · hold for slow" : "Tap to hear the sentence · hold for slow"}
      </div>
    </div>
  );
}
