import { useState } from "react";
import { shuffle } from "../lib/curriculum";
import { speak, blip } from "../lib/audio";
import { tapSceneArt } from "../lib/vocabArt";
import Img from "../components/Img";

const NOT_THAT = ["Not that one.", "Not quite. Try another.", "Close, but no."];

// Scenario picker — a small scene sets the context, you tap the word that
// fits. `flip` gates options behind a tap-to-ask reveal; `free` accepts any
// tap for scenes with no single right answer.
export default function SceneTap({ step, ctx }) {
  const [opts] = useState(() => shuffle((step.from || []).slice()));
  const [wrongIdx, setWrongIdx] = useState(new Set());
  const [selected, setSelected] = useState(null);
  const [hint, setHint] = useState(null);
  const [revealed, setRevealed] = useState(!step.flip);
  const correct = step.from?.[0] ?? 0;
  const sceneImg = tapSceneArt(step.sceneImg);
  const word = (i) => (ctx.teaches && ctx.teaches[i]) || ["", "", ""];

  const ask = () => {
    setRevealed(true);
    if (step.askAudio) speak(step.askAudio);
  };

  const tap = (i) => {
    if (ctx.answered || selected !== null) return;
    const [de] = word(i);
    speak(de);
    if (!step.free && i !== correct) {
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
    ctx.commit(true, step.free ? `<b>${de}</b>. Fair enough.` : `That's <b>${de}</b>.`);
  };

  return (
    <div className="rounded-3xl bg-white p-5 ring-1 ring-slate-200">
      <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">What fits the scene</div>
      <div className="mt-2 flex flex-col items-center gap-2">
        {sceneImg ? (
          <div className={`w-full overflow-hidden rounded-2xl ${step.flip && !revealed ? "opacity-40 blur-sm" : ""}`}>
            <Img src={sceneImg} alt="" className="aspect-[4/3] w-full" />
          </div>
        ) : (
          <div className={`text-4xl ${step.flip && !revealed ? "opacity-40 blur-sm" : ""}`}>{step.scene}</div>
        )}
        {(revealed && step.revealCaption ? step.revealCaption : step.sceneCaption) ? (
          <div className="text-center text-sm text-slate-500">
            {revealed && step.revealCaption ? step.revealCaption : step.sceneCaption}
          </div>
        ) : null}
      </div>
      <div className="mt-3 text-center text-lg font-bold leading-snug text-slate-800" dangerouslySetInnerHTML={{ __html: step.q }} />

      {!revealed ? (
        <button
          className="mx-auto mt-4 block rounded-2xl bg-[#17336d] px-6 py-3 text-[15px] font-bold text-white shadow-md"
          onClick={ask}
        >
          {step.askLabel || "Ask"}
        </button>
      ) : (
        <>
          <div className="mt-4 grid grid-cols-2 gap-2.5">
            {opts.map((i) => {
              const [de, en] = word(i);
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
        </>
      )}
    </div>
  );
}
