import { Fragment, useEffect, useState } from "react";
import { shuffle } from "../lib/curriculum";
import { speak, blip } from "../lib/audio";
import WordArt from "../components/WordArt";

const MAX_PAIRS = 3; // more than 3 pairs on screen is too much to track

export default function Match({ step, ctx }) {
  const [ws] = useState(() => shuffle((step.ws || []).slice()).slice(0, MAX_PAIRS));
  const [left] = useState(() => shuffle(ws.slice()));
  // Independent shuffles of a short list can land in the same order (~50%
  // with 2 pairs), which lets a learner match by position. Force a different
  // arrangement instead of leaving it to a second coin flip.
  const [right] = useState(() => {
    let r = shuffle(ws.slice());
    if (ws.length > 1 && r.every((w, i) => w === left[i])) {
      [r[0], r[1]] = [r[1], r[0]];
    }
    return r;
  });
  const [gone, setGone] = useState(new Set());
  const [miss, setMiss] = useState(new Set());
  const [pickDe, setPickDe] = useState(null);
  const word = (i) => (ctx.teaches && ctx.teaches[i]) || ["", "", ""];

  useEffect(() => { ctx.setMainBtn({ label: "Check", disabled: true }); }, []); // eslint-disable-line
  useEffect(() => {
    // Clearing the grid is a right answer and has to be graded like one.
    if (gone.size === ws.length) ctx.commit(true, "");
    // eslint-disable-next-line
  }, [gone]);

  const tapDe = (i) => { setPickDe(i); speak(word(i)[0]); };
  const tapEn = (i) => {
    if (pickDe === null) return;
    if (pickDe === i) {
      setGone((prev) => new Set(prev).add(i));
      blip(true);
    } else {
      setMiss(new Set([pickDe, i]));
      blip(false);
      setTimeout(() => setMiss(new Set()), 450);
    }
    setPickDe(null);
  };

  const visual = step.visual; // picture <-> German word
  const cell = (state) =>
    `flex min-h-[64px] items-center justify-center rounded-2xl p-2 text-center font-semibold transition ring-2 ${
      state === "gone"
        ? "pointer-events-none bg-emerald-50 text-emerald-700 ring-emerald-400 opacity-50"
        : state === "miss"
          ? "bg-rose-50 text-rose-700 ring-rose-400"
          : state === "sel"
            ? "bg-indigo-50 text-indigo-800 ring-indigo-500"
            : "bg-slate-50 text-slate-800 ring-transparent hover:ring-slate-300 active:scale-[0.97]"
    }`;

  return (
    <div className="rounded-3xl bg-white p-5 ring-1 ring-slate-200">
      <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">Match them up</div>
      <div className="mt-1.5 text-[19px] font-bold text-slate-800">
        {visual ? "Tap a picture, then its word." : "Tap a German word, then its meaning."}
      </div>
      {/* One grid, not two columns — interleaved so every row is one row. */}
      <div className="mt-4 grid grid-cols-2 gap-2.5">
        {left.map((i, r) => (
          <Fragment key={r}>
            <button
              className={cell(gone.has(i) ? "gone" : miss.has(i) ? "miss" : pickDe === i ? "sel" : "open")}
              disabled={gone.has(i)}
              onClick={() => tapDe(i)}
            >
              {visual ? <WordArt de={word(i)[0]} en={word(i)[1]} pic={word(i)[2]} size={62} /> : word(i)[0]}
            </button>
            <button
              className={cell(gone.has(right[r]) ? "gone" : miss.has(right[r]) ? "miss" : "open")}
              disabled={gone.has(right[r])}
              onClick={() => tapEn(right[r])}
            >
              {visual ? word(right[r])[0] : word(right[r])[1]}
            </button>
          </Fragment>
        ))}
      </div>
    </div>
  );
}
