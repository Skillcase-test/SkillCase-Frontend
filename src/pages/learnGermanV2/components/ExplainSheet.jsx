import { useEffect, useState } from "react";
import { glossFor, GLOSS_EX } from "../lib/curriculum";
import { speak } from "../lib/audio";

// "Explain my answer" — a per-word gloss looked up across the whole
// curriculum, so a step's wrong-answer words resolve even when they were
// taught in a different module.
export default function ExplainSheet({ tokens = [], topics = [], onClose }) {
  const tokenList = Array.isArray(tokens) ? tokens : [];
  const [sel, setSel] = useState(0);

  const curToken = tokenList[sel] || tokenList[0] || "";

  useEffect(() => {
    if (curToken) speak(curToken);
  }, [sel, curToken]);

  const clean = curToken ? curToken.replace(/[.,!?]+$/, "").toLowerCase() : "";
  const en = curToken ? glossFor(curToken, topics) : "";
  const examples = clean ? GLOSS_EX[clean] || [] : [];
  const genderNote = { der: "masculine", die: "feminine", das: "neuter" }[clean];

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#f4f6fb] px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
      <div className="mb-3 flex items-center">
        <button
          className="grid h-9 w-9 place-items-center rounded-full bg-white text-lg text-slate-600 ring-1 ring-slate-200"
          aria-label="Back"
          onClick={onClose}
        >
          ←
        </button>
        <div className="flex-1 text-center text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
          Explain my answer
        </div>
        <span className="w-9" />
      </div>
      <div className="mb-4 flex flex-wrap gap-2">
        {tokenList.map((t, i) => (
          <button
            key={i}
            className={`rounded-full px-3 py-1.5 text-sm font-semibold ring-1 transition ${
              i === sel
                ? "bg-[#17336d] text-white ring-[#17336d]"
                : "bg-white text-slate-700 ring-slate-200"
            }`}
            onClick={() => setSel(i)}
          >
            {t}
          </button>
        ))}
      </div>
      <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
        <p className="text-[15px] leading-snug text-slate-700">
          <b className="text-indigo-700">{curToken.replace(/[.,!?]+$/, "")}</b> means{" "}
          <b>{en}</b> in German.
        </p>
        {genderNote && (
          <p className="mt-3 rounded-xl bg-amber-50 p-3 text-[13px] leading-snug text-amber-800 ring-1 ring-amber-200">
            Not a synonym — der, die, and das all mean "the," but each noun has
            one fixed gender ({genderNote}, here) that decides which one you use.
          </p>
        )}
        {examples.length > 0 && (
          <div className="mt-3 space-y-1.5">
            {examples.map((x, i) => {
              try {
                const re = new RegExp(clean, "i");
                const parts = x.split(re);
                const match = x.match(re);
                return (
                  <div className="text-sm text-slate-600" key={i}>
                    • {parts[0]}
                    {match && <b className="text-indigo-700">{match[0]}</b>}
                    {parts[1]}
                  </div>
                );
              } catch {
                return (
                  <div className="text-sm text-slate-600" key={i}>
                    • {x}
                  </div>
                );
              }
            })}
          </div>
        )}
      </div>
      <button
        className="mt-auto w-full rounded-2xl bg-white py-3 text-sm font-bold text-slate-600 ring-1 ring-slate-200"
        onClick={onClose}
      >
        Back to lesson
      </button>
    </div>
  );
}
