import { useState } from "react";
import { shuffle } from "../lib/curriculum";
import { speak } from "../lib/audio";

// "Digit Dial" — the same words as a build step, tapped out on a
// phone-keypad layout: the shape your thumb already knows from dialing.
export default function Keypad({ step, ctx }) {
  const target = step.target || []; // teaches-indices, in order
  const [picked, setPicked] = useState([]); // indices into teaches
  const word = (i) => (ctx.teaches && ctx.teaches[i]) || ["", "", ""];
  const [keys] = useState(() => shuffle((step.keys || []).slice())); // shuffled once, not mirroring the answer

  const submit = (final) => {
    const said = final.map((i) => word(i)[0]).join(" ");
    const wanted = target.map((i) => word(i)[0]).join(" ");
    const ok = said.toLowerCase() === wanted.toLowerCase();
    if (ok) {
      speak(wanted);
    } else {
      ctx.miss?.();
    }
    ctx.commit(ok, ok ? `<b>${wanted}</b>. Dialed correctly.` : `It's <b>${wanted}</b>.`);
  };

  const tapKey = (i) => {
    if (ctx.answered) return;
    const next = [...picked, i];
    setPicked(next);
    speak(word(i)[0]);
    if (next.length === target.length) submit(next);
  };

  // Undo one, not start again — on a seven-word phone number one mis-tap
  // shouldn't cost every tap before it.
  const back = () => { if (!ctx.answered) setPicked((p) => p.slice(0, -1)); };
  const removeAt = (idx) => { if (!ctx.answered) setPicked((p) => p.filter((_, i) => i !== idx)); };
  const clear = () => { if (!ctx.answered) setPicked([]); };

  return (
    <div className="rounded-3xl bg-white p-5 ring-1 ring-slate-200">
      <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">Digit dial</div>
      <div className="mt-1.5 text-[19px] font-bold text-slate-800">{step.en}</div>
      <div className="mt-4 flex min-h-[56px] flex-wrap items-center justify-center gap-1.5 rounded-2xl bg-[#17336d] p-3">
        {picked.length === 0 ? (
          <span className="text-sm text-white/40">tap the keypad</span>
        ) : (
          picked.map((i, idx) => (
            <button
              key={idx}
              className="rounded-lg bg-white/15 px-2.5 py-1.5 text-[15px] font-bold text-white"
              onClick={() => removeAt(idx)}
              aria-label={`Remove ${word(i)[0]}`}
            >
              {word(i)[0]}
            </button>
          ))
        )}
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2.5">
        {keys.map((i, idx) => (
          <button
            key={idx}
            className="min-h-[56px] rounded-2xl bg-slate-50 px-2 py-3 text-center text-[15px] font-bold text-slate-800 ring-1 ring-slate-200 transition hover:bg-indigo-50 active:scale-95 disabled:opacity-50"
            onClick={() => tapKey(i)}
            disabled={ctx.answered}
          >
            {word(i)[0]}
          </button>
        ))}
      </div>
      {picked.length > 0 && !ctx.answered && (
        <div className="mt-3 flex justify-center gap-3">
          <button
            type="button"
            className="flex items-center gap-1.5 rounded-full bg-slate-100 px-3.5 py-1.5 text-xs font-bold text-slate-600"
            onClick={back}
          >
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M20 6H9.4a2 2 0 0 0-1.5.7L3 12l4.9 5.3a2 2 0 0 0 1.5.7H20a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1zM17 9.5l-5 5M12 9.5l5 5" />
            </svg>
            Undo
          </button>
          <button
            type="button"
            className="rounded-full px-3.5 py-1.5 text-xs font-semibold text-slate-400"
            onClick={clear}
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}
