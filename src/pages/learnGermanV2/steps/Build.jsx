import { useState } from "react";
import { shuffle, findTaughtWord, withName } from "../lib/curriculum";
import { speak, blip } from "../lib/audio";
import { HardBadge } from "../components/MistakeBadge";

const NOT_THAT = ["Not quite that order. Try again.", "Close, but not that arrangement.", "Not that one. Give it another go."];
const HINT_AFTER = 2;

const tileCls = (state) =>
  `rounded-xl px-3 py-2 text-[15px] font-semibold transition ring-1 ${
    state === "used"
      ? "bg-slate-100 text-transparent ring-slate-200"
      : state === "hinted"
        ? "bg-indigo-100 text-indigo-800 ring-indigo-400 animate-pulse"
        : state === "placed"
          ? "bg-indigo-50 text-indigo-800 ring-indigo-200"
          : "bg-white text-slate-800 ring-slate-300 shadow-sm active:scale-95"
  }`;

export default function Build({ step = {}, ctx = {} }) {
  const rawTarget = Array.isArray(step?.de) ? step.de : typeof step?.de === "string" ? [step.de] : [];
  const target = rawTarget.map((w) => withName(w, ctx?.userFirstName));
  const stepEn = withName(step?.en, ctx?.userFirstName) || "";
  const extra = Array.isArray(step?.extra) ? step.extra : [];
  const sep = step?.fuse ? "" : " ";
  const [bank] = useState(() => {
    // Every token in the answer gets its own tile — deduplicating the whole
    // bank makes "nicht die rote"-style double-word sentences unfinishable.
    const inAnswer = new Set(target.map((w) => String(w).toLowerCase().trim()));
    const seenDecoy = new Set();
    const decoys = [];
    for (const w of extra) {
      const k = String(w).toLowerCase().trim();
      if (inAnswer.has(k) || seenDecoy.has(k)) continue;
      seenDecoy.add(k);
      decoys.push(w);
    }
    return shuffle(target.concat(decoys));
  });
  const [picked, setPicked] = useState([]); // [{w, i}]
  const [used, setUsed] = useState(new Set());
  const [shake, setShake] = useState(false);
  const [hint, setHint] = useState(null);
  const [hinted, setHinted] = useState(null);
  const [misses, setMisses] = useState(0);

  // A hint points at the next word rather than placing it — the learner still
  // makes the move, and the sentence stays theirs.
  const showHint = () => {
    if (ctx.answered) return;
    const want = String(target[picked.length] || "").toLowerCase().trim();
    if (!want) return;
    const i = bank.findIndex((w, idx) => !used.has(idx) && String(w).toLowerCase().trim() === want);
    if (i < 0) return;
    setHinted(i);
    setTimeout(() => setHinted(null), 2000);
  };

  const submit = (finalPicked) => {
    const said = finalPicked.map((p) => p.w).join(sep);
    const ok = said.toLowerCase().replace(/[.,]/g, "") === target.join(sep).toLowerCase().replace(/[.,]/g, "");
    if (ok) {
      speak(target.join(sep));
      const hardPayoff = step?.hard ? " That one was marked hard, and you just did it without blinking." : "";
      ctx?.commit?.(true, `<b>${target.join(sep)}</b>. ${stepEn}${hardPayoff}`);
      return;
    }
    // Wrong arrangement doesn't end the step — flash, queue the words for
    // review, hand the tiles back.
    blip(false);
    target.forEach((tok) => {
      const clean = tok.replace(/[.,!?]+$/, "");
      const hit = findTaughtWord(clean, ctx?.topics || []);
      if (hit && ctx?.onPushReview) ctx.onPushReview(hit[0], hit[1], hit[2]);
    });
    ctx?.miss?.();
    setShake(true);
    setMisses((m) => m + 1);
    setHint(NOT_THAT[Math.floor(Math.random() * NOT_THAT.length)]);
    setTimeout(() => {
      setShake(false);
      setPicked([]);
      setUsed(new Set());
    }, 500);
  };

  const pickTile = (w, i) => {
    if (ctx.answered || used.has(i)) return;
    const next = [...picked, { w, i }];
    setUsed((prev) => new Set(prev).add(i));
    setPicked(next);
    setHinted(null);
    if (!step.fuse) speak(w);
    if (next.length === target.length) submit(next);
  };

  const removeTile = (idx) => {
    if (ctx.answered) return;
    const p = picked[idx];
    setPicked(picked.filter((_, i) => i !== idx));
    setUsed((prev) => { const n = new Set(prev); n.delete(p.i); return n; });
  };

  return (
    <>
      <div className="mb-2 min-h-[24px]">{step.hard && <HardBadge />}</div>
      <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">
        {step.fuse ? "Build the word" : "Build the sentence"}
      </div>
      <div className="mt-1.5 text-[19px] font-bold text-slate-800">{stepEn}</div>
      <div
        className={`mt-4 flex min-h-[52px] flex-wrap items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed border-slate-300 bg-white/60 p-2.5 ${shake ? "lg2-shake" : ""}`}
      >
        {picked.length === 0 && <span className="text-sm text-slate-300">Tap the words in order</span>}
        {picked.map((p, i) => (
          <button key={i} className={tileCls("placed")} onClick={() => removeTile(i)}>
            {p.w}
          </button>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        {bank.map((w, i) => (
          <button
            key={i}
            className={tileCls(used.has(i) ? "used" : hinted === i ? "hinted" : "bank")}
            onClick={() => pickTile(w, i)}
          >
            {w}
          </button>
        ))}
      </div>
      {hint && <div className="mt-3 text-center text-sm font-medium text-rose-600">{hint}</div>}
      {!ctx.answered && misses >= HINT_AFTER && picked.length < target.length && (
        <button
          type="button"
          className="mx-auto mt-3 flex items-center gap-1.5 text-sm font-semibold text-indigo-600"
          onClick={showHint}
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.5.4.8 1 .9 1.6h5.2c.1-.6.4-1.2.9-1.6A6 6 0 0 0 12 3z" />
          </svg>
          Hint
        </button>
      )}
    </>
  );
}
