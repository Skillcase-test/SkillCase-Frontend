import { useEffect, useRef, useState } from "react";
import { speak, blip } from "../lib/audio";
import MicButton from "../components/MicButton";

const norm = (s) => s.toLowerCase().replace(/[.,!?]/g, "").replace(/\s+/g, " ").trim();

function getRecognizer() {
  if (typeof window === "undefined") return null;
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return null;
  const r = new SR();
  r.lang = "de-DE";
  r.interimResults = false;
  r.maxAlternatives = 3;
  return r;
}

// True flashcard: one card at a time, a correct match flips straight to the
// next. Speech recognition where the browser has it; a trust-her "I said it"
// button where it doesn't — same spirit as the plain Speak step.
export default function SpeakCards({ step, ctx }) {
  const cards = step.cards || []; // [{de, en}, ...]
  const [idx, setIdx] = useState(0);
  const [state, setState] = useState("idle"); // idle | listening | correct | retry
  const [supported] = useState(() => !!getRecognizer());
  const recRef = useRef(null);

  const card = cards[idx];

  useEffect(() => {
    if (!card) return;
    setState("idle");
    speak(card.de);
    ctx.setFootSkip({ label: "Can't speak right now", onSkip: () => { ctx.onCooldown("speak"); ctx.advance(); } });
    // eslint-disable-next-line
  }, [idx]);

  const finishAll = () => {
    ctx.commit(true, `<b>${cards.map((c) => c.de).join(" · ")}</b>. All three, out loud.`);
  };

  const goNext = () => {
    if (idx + 1 >= cards.length) { finishAll(); return; }
    setIdx((i) => i + 1);
  };

  const onCorrect = () => {
    blip(true);
    setState("correct");
    setTimeout(goNext, 650);
  };

  const listen = () => {
    if (!supported || state === "listening") return;
    setState("listening");
    const r = getRecognizer();
    recRef.current = r;
    r.onresult = (e) => {
      const heard = Array.from(e.results[0]).map((a) => norm(a.transcript));
      if (heard.some((h) => h === norm(card.de) || h.includes(norm(card.de)))) {
        onCorrect();
      } else {
        blip(false);
        setState("retry");
      }
    };
    r.onerror = () => setState("retry");
    r.onend = () => { setState((s) => (s === "listening" ? "retry" : s)); };
    r.start();
  };

  const manualSaid = () => onCorrect();

  if (!card) return null;

  return (
    <div className="flex flex-col items-center">
      <div className="mb-4 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">Say it</div>
      {/* An actual card, with the rest of the deck stacked behind it. */}
      <div className="relative w-full max-w-[280px]">
        {idx + 1 < cards.length && (
          <div className="absolute inset-x-3 -bottom-2 h-full rotate-2 rounded-3xl bg-white/60 ring-1 ring-slate-200" aria-hidden="true" />
        )}
        {idx + 2 < cards.length && (
          <div className="absolute inset-x-6 -bottom-4 h-full -rotate-2 rounded-3xl bg-white/40 ring-1 ring-slate-200" aria-hidden="true" />
        )}
        <div
          key={idx}
          className={`relative rounded-3xl bg-white p-6 text-center ring-1 ring-slate-200 shadow-md transition ${
            state === "correct" ? "ring-2 ring-emerald-500 bg-emerald-50" : ""
          }`}
        >
          <div className="text-xs font-bold text-slate-400">{idx + 1} of {cards.length}</div>
          <div className="mt-2 text-2xl font-extrabold text-slate-800">{card.de}</div>
          <div className="mt-1 text-sm text-slate-500">{card.en}</div>
        </div>
      </div>

      <div className="mt-6">
        {supported ? (
          <MicButton
            state={state === "listening" ? "recording" : "idle"}
            onTap={listen}
            label={state === "listening" ? "Listening…" : state === "correct" ? "Got it" : "Tap and say it"}
          />
        ) : (
          <button
            className="rounded-2xl bg-[#17336d] px-8 py-3 text-[15px] font-bold text-white shadow-md"
            onClick={manualSaid}
          >
            I said it
          </button>
        )}
      </div>

      {state === "retry" && <div className="mt-3 text-sm font-medium text-rose-600">Didn't catch that. Try again.</div>}
    </div>
  );
}
