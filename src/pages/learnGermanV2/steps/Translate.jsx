import { useEffect, useState } from "react";
import { shuffle, findTaughtWord, withName } from "../lib/curriculum";
import { speak, narrate, blip } from "../lib/audio";
import MistakeBadge, { HardBadge } from "../components/MistakeBadge";

const NOT_THAT = ["Not quite that order. Try again.", "Close, but not that arrangement.", "Not that one. Give it another go."];
const HINT_AFTER = 2;

export default function Translate({ step = {}, ctx = {} }) {
  const de = withName(step?.de, ctx?.userFirstName) || "";
  const rawTarget = Array.isArray(step?.en) ? step.en : typeof step?.en === "string" ? step.en.split(" ") : [];
  const target = rawTarget.map((w) => withName(w, ctx?.userFirstName));
  const extra = Array.isArray(step?.extra) ? step.extra : [];
  const [bank] = useState(() => {
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
  const [picked, setPicked] = useState([]);
  const [used, setUsed] = useState(new Set());
  const [playing, setPlaying] = useState(false);
  const [shake, setShake] = useState(false);
  const [hint, setHint] = useState(null);
  const [hinted, setHinted] = useState(null);
  const [misses, setMisses] = useState(0);

  const showHint = () => {
    if (ctx.answered) return;
    const want = String(target[picked.length] || "").toLowerCase().trim();
    if (!want) return;
    const i = bank.findIndex((w, idx) => !used.has(idx) && String(w).toLowerCase().trim() === want);
    if (i < 0) return;
    setHinted(i);
    setTimeout(() => setHinted(null), 2000);
  };

  const play = () => {
    if (!de) return;
    setPlaying(true);
    speak(de);
    setTimeout(() => setPlaying(false), 1400);
  };
  useEffect(() => {
    play();
    ctx?.setFootSkip?.({ label: "Can't listen right now", onSkip: () => { ctx?.onCooldown?.("listen"); ctx?.advance?.(); } });
    // eslint-disable-next-line
  }, [step]);

  const submit = (finalPicked) => {
    const said = finalPicked.map((p) => p.w.toLowerCase()).join(" ");
    const ok = said === target.join(" ").toLowerCase();
    if (ok) {
      ctx?.commit?.(true, `<b>${de}</b>. ${target.join(" ")}`);
      return;
    }
    blip(false);
    const clean = de.replace(/[.,!?]+$/, "");
    clean.split(" ").forEach((tok) => {
      const hit = findTaughtWord(tok.replace(/[.,!?]+$/, ""), ctx?.topics || []);
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
    narrate(w);
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
      <div className="mb-2 min-h-[24px]">
        {step.reviewWord ? <MistakeBadge /> : step.hard && <HardBadge />}
      </div>
      <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">Translate this sentence</div>
      <div className="mt-2 rounded-2xl bg-white p-4 text-center text-[17px] font-bold text-slate-800 ring-1 ring-slate-200">
        {de}
      </div>
      <button
        className={`mx-auto mt-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#17336d] text-white shadow-md ${playing ? "lg2-playing" : ""}`}
        onClick={play}
        aria-label="Play the sentence again"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
          <path d="M4 9v6h4l5 4V5L8 9H4z" />
          <path d="M16 8.5a5 5 0 0 1 0 7" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </button>
      <div className="mt-1 text-center text-xs text-slate-400">Tap to hear it again</div>
      <div
        className={`mt-3 flex min-h-[52px] flex-wrap items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed border-slate-300 bg-white/60 p-2.5 ${shake ? "lg2-shake" : ""}`}
      >
        {picked.length === 0 && <span className="text-sm text-slate-300">Build the English</span>}
        {picked.map((p, i) => (
          <button key={i} className="rounded-xl bg-indigo-50 px-3 py-2 text-[15px] font-semibold text-indigo-800 ring-1 ring-indigo-200" onClick={() => removeTile(i)}>
            {p.w}
          </button>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        {bank.map((w, i) => (
          <button
            key={i}
            className={`rounded-xl px-3 py-2 text-[15px] font-semibold ring-1 transition ${
              used.has(i)
                ? "bg-slate-100 text-transparent ring-slate-200"
                : hinted === i
                  ? "bg-indigo-100 text-indigo-800 ring-indigo-400 animate-pulse"
                  : "bg-white text-slate-800 ring-slate-300 shadow-sm active:scale-95"
            }`}
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
