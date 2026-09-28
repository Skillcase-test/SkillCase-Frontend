import { useState } from "react";
import { shuffle } from "../lib/curriculum";
import { speak, blip } from "../lib/audio";

// "Beat Maya" — tap the next item in the sequence before she does. No timer,
// no penalty for missing — just the small thrill of getting there first.
export default function RaceTap({ step, ctx }) {
  const order = step.from || []; // teaches-indices, correct ascending order
  const [grid] = useState(() => shuffle(order.slice()));
  const [done, setDone] = useState([]);
  const [wrong, setWrong] = useState(null);
  const word = (i) => (ctx.teaches && ctx.teaches[i]) || ["", "", ""];
  const next = order?.[done.length];

  const tap = (i) => {
    if (ctx.answered || done.includes(i)) return;
    if (i !== next) {
      blip(false);
      ctx.miss();
      setWrong(i);
      setTimeout(() => setWrong(null), 350);
      return;
    }
    blip(true);
    speak(word(i)[0]);
    const nd = [...done, i];
    setDone(nd);
    if (nd.length === order.length) {
      ctx.commit(true, `<b>${order.map((x) => word(x)[0]).join(", ")}</b>. Beat her every time.`);
    }
  };

  return (
    <div className="rounded-3xl bg-white p-5 ring-1 ring-slate-200">
      <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">Beat Maya</div>
      <div className="mt-1.5 text-xl font-bold text-slate-800">{step.en}</div>
      <div className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-center text-sm font-semibold text-amber-800 ring-1 ring-amber-200">
        {done.length < order.length ? (
          <>Maya's turn: <b>{word(next)[0]}</b> is next. Tap it first.</>
        ) : (
          "You beat her to every one."
        )}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2.5">
        {grid.map((i) => {
          const isDone = done.includes(i);
          const isWrong = wrong === i;
          return (
            <button
              key={i}
              className={`min-h-[64px] rounded-2xl p-3 text-center transition ring-2 ${
                isDone
                  ? "bg-emerald-50 ring-emerald-500"
                  : isWrong
                    ? "bg-rose-50 ring-rose-400"
                    : "bg-slate-50 ring-transparent hover:ring-slate-300 active:scale-[0.97]"
              }`}
              disabled={isDone}
              onClick={() => tap(i)}
            >
              <span className="text-[17px] font-bold text-slate-800">{word(i)[0]}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
