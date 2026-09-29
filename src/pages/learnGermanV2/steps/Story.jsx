import { useEffect, useState } from "react";
import { narrate } from "../lib/audio";
import { moduleBackdrop } from "../lib/vocabArt";
import Maya from "../components/Maya";
import Typed from "../components/Typed";
import Img from "../components/Img";

/* The module opener: full-bleed backdrop, translucent card with the chapter
 * name, Maya typing the line, dots for multi-line beats. Owns its own footer
 * (ctx.setHideFooter) — "Skip intro" + Next/Start instead of Check. */
const NO_LINES = [];

export default function Story({ step, ctx }) {
  const [li, setLi] = useState(0);
  const backdrop = moduleBackdrop(ctx?.topic || ctx?.moduleId);
  const lines = step.lines || NO_LINES;

  const topics = ctx?.topics || [];
  const idx = topics.findIndex((t) => t.id === ctx?.moduleId);
  const topic = !step.review && idx >= 0 ? topics[idx] : null;
  const last = li + 1 >= lines.length;

  useEffect(() => { if (lines[li]) narrate(lines[li]); }, [li, lines]);

  const next = () => {
    if (last) { ctx.advance(); return; }
    setLi(li + 1);
  };

  return (
    <div className="relative -mx-4 -my-2 flex min-h-[70vh] flex-col overflow-hidden rounded-b-3xl">
      {backdrop && (
        <div className="absolute inset-0" aria-hidden="true">
          <Img src={backdrop} alt="" className="h-full w-full" />
          <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/50 to-transparent" />
        </div>
      )}

      <div className="relative z-10 flex flex-1 items-center justify-center px-5">
        <div className="w-full max-w-sm rounded-3xl bg-black/55 p-5 backdrop-blur-sm">
          <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/60">
            {topic
              ? `Level ${idx + 1}${ctx?.subCount > 1 ? ` · Part ${(ctx.subIndex ?? 0) + 1} of ${ctx.subCount}` : ""}`
              : "Review"}
          </div>
          {topic && <h2 className="mt-1 text-2xl font-extrabold text-white">{topic.title}</h2>}
          <div className="mt-4 flex items-end gap-2.5">
            <div className="flex-1 rounded-2xl rounded-bl-md bg-white/95 px-3.5 py-2.5 text-[15px] leading-snug text-slate-800">
              <Typed text={lines[li] || ""} />
            </div>
            <Maya mood={topic ? "greet" : "cheer"} className="ring-2 ring-white/70" />
          </div>
        </div>
      </div>

      <div className="relative z-10 px-5 pb-5">
        {lines.length > 1 && (
          <div className="mb-3 flex justify-center gap-1.5">
            {lines.map((_, i) => (
              <i key={i} className={`h-1.5 rounded-full transition-all ${i === li ? "w-5 bg-white" : "w-1.5 bg-white/40"}`} />
            ))}
          </div>
        )}
        <button className="mb-2 w-full text-center text-xs font-semibold text-white/70 underline-offset-2 hover:underline" onClick={ctx.advance}>
          Skip intro
        </button>
        <button
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-white py-3.5 text-[15px] font-bold text-[#17336d] shadow-lg"
          onClick={next}
        >
          {topic && last ? "Start" : "Next"}
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </button>
      </div>
    </div>
  );
}
