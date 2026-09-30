import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { shuffle } from "../lib/curriculum";
import { speak, blip, speechAvailable } from "../lib/audio";
import { MayaSays } from "../components/Maya";
import Typed from "../components/Typed";
import MicButton from "../components/MicButton";
import Glyph from "../components/Glyph";
import Img from "../components/Img";
import { npcFor, npcPortrait, moduleBackdrop, npcFullFor, whoLabel } from "../lib/vocabArt";

const CHAT_HINTS = [
  "Not that one. Look at what she just asked.",
  "Close, but that doesn't answer her.",
  "Try the one that matches the goal above.",
  "Read her line again — the answer's in there.",
  "That reply doesn't fit what she said.",
  "Almost — check which one actually responds to her.",
  "Not quite. What is she really asking?",
];

const PRODUCTION_HINTS = [
  "Not quite the right order. Try again.",
  "Close — one of those words isn't right for this reply.",
  "Almost. Look at what she just asked.",
  "Check the order — German word order matters here.",
  "One of those tiles is a decoy. Look again.",
  "Nearly — reread what she said and try once more.",
];

// Production-turn reply: the learner assembles the line from tiles instead of
// tapping a pre-written option — controlled recall, not open-ended
// generation. A first wrong attempt gets a hint + clean reset; a second
// places the first tile for them so nobody is left staring at an empty bank.
function ProductionReply({ turn = {}, hardChat = false, onSubmit, missTurn, onWrong }) {
  const answer = Array.isArray(turn.answer) ? turn.answer : [];
  const decoys = Array.isArray(turn.decoys) ? turn.decoys : [];
  const [bank] = useState(() => shuffle(answer.concat(decoys)));
  const [picked, setPicked] = useState([]); // [{w, i}]
  const [used, setUsed] = useState(new Set());
  const [shake, setShake] = useState(false);
  const [wrongCount, setWrongCount] = useState(0);

  const target = answer;
  const norm = (s) => (s || "").toLowerCase().replace(/[.,!?]/g, "").trim();

  const reset = (scaffold) => {
    if (scaffold && target.length > 0) {
      const firstIdx = bank.findIndex((w) => w === target[0]);
      setPicked([{ w: target[0], i: firstIdx }]);
      setUsed(new Set([firstIdx]));
    } else {
      setPicked([]);
      setUsed(new Set());
    }
  };

  const submit = (finalPicked) => {
    const said = finalPicked.map((p) => p.w).join(" ");
    const ok = norm(said) === norm(target.join(" "));
    if (ok) {
      onSubmit?.({ de: target.join(" "), en: turn.answerEn || "", ack: turn.ack, ackEn: turn.ackEn });
    } else {
      missTurn?.();
      const nextWrongCount = wrongCount + 1;
      setWrongCount(nextWrongCount);
      const scaffold = nextWrongCount >= 2;
      onWrong?.(scaffold
        ? `Here's the first word to get you started — ${target[0] || ""}.`
        : PRODUCTION_HINTS[Math.floor(Math.random() * PRODUCTION_HINTS.length)]);
      setShake(true);
      setTimeout(() => { setShake(false); reset(scaffold); }, 650);
    }
  };

  const pickTile = (w, i) => {
    if (shake || used.has(i)) return;
    if (picked.length === 0) onWrong?.(null);
    const next = [...picked, { w, i }];
    setUsed((prev) => new Set(prev).add(i));
    setPicked(next);
    if (next.length === target.length) submit(next);
  };

  const removeTile = (idx) => {
    const p = picked[idx];
    setPicked(picked.filter((_, i) => i !== idx));
    setUsed((prev) => {
      const n = new Set(prev);
      if (p) n.delete(p.i);
      return n;
    });
  };

  return (
    <div>
      <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
        Build your reply{hardChat ? "" : " · tap the words in order"}
      </div>
      <div className={`flex min-h-[48px] flex-wrap items-center gap-1.5 rounded-2xl border-2 border-dashed border-slate-300 bg-white p-2.5 ${shake ? "lg2-shake" : ""}`}>
        {picked.length === 0 && <span className="text-sm text-slate-300">Tap words below</span>}
        {picked.map((p, i) => (
          <button key={i} className="rounded-lg bg-indigo-50 px-2.5 py-1.5 text-sm font-semibold text-indigo-800 ring-1 ring-indigo-200" onClick={() => removeTile(i)}>
            {p.w}
          </button>
        ))}
      </div>
      <div className="mt-2.5 flex flex-wrap gap-2">
        {bank.map((w, i) => (
          <button
            key={i}
            className={`rounded-xl px-3 py-2 text-sm font-semibold ring-1 transition ${
              used.has(i)
                ? "bg-slate-100 text-transparent ring-slate-200"
                : "bg-white text-slate-800 ring-slate-300 shadow-sm active:scale-95"
            }`}
            onClick={() => pickTile(w, i)}
          >
            {w}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function Chat({ step = {}, ctx = {} }) {
  const turns = Array.isArray(step?.turns) ? step.turns : [];
  const [thread, setThread] = useState([]); // {side:'me'|'them', de, en, tick}
  const [typing, setTyping] = useState(false);
  const [started, setStarted] = useState(false);
  const [saidDone, setSaidDone] = useState(false);
  const [ti, setTi] = useState(0);
  const [hardChat, setHardChat] = useState(() => {
    try { return localStorage.getItem("lg2HardChat") === "1"; } catch { return false; }
  });
  const [hint, setHint] = useState(null);
  const [nopeIdx, setNopeIdx] = useState(new Set());
  const [recording, setRecording] = useState(false);
  const [done, setDone] = useState(false);
  const timers = useRef([]);
  const bottomRef = useRef(null);
  const portalTarget = ctx?.portalEl || null;

  const setTimer = (fn, ms) => {
    const id = setTimeout(fn, ms);
    timers.current.push(id);
    return id;
  };

  useEffect(() => () => timers.current.forEach((id) => clearTimeout(id)), []);

  const toBottom = () => {
    const el = bottomRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      try { el.scrollIntoView({ block: "end", behavior: "smooth" }); } catch { /* jsdom */ }
    });
  };

  useEffect(() => { toBottom(); }, [thread, typing, hint, done]);

  const withName = (s) => {
    if (!s) return "";
    return s.includes("{name}") ? s.replace(/\{name\}/g, ctx?.userFirstName || "") : s;
  };

  const nextTurn = (curTi) => {
    if (curTi >= turns.length) {
      setDone(true);
      ctx?.setHideFooter?.(false);
      ctx?.setMainBtn?.({ label: "Continue", disabled: false });
      return;
    }
    const t = turns[curTi];
    if (!t) return;
    setTyping(true);
    setTimer(() => {
      setTyping(false);
      const de = withName(t.them);
      setThread((prev) => [...prev, { side: "them", de, en: withName(t.en) }]);
      speak(de);
    }, 700);
  };

  // The conversation starts on the Start tap — firing the first turn on
  // mount spoke the opening line behind the intro and left the thread out of
  // step.
  useEffect(() => {
    if (!started) return;
    nextTurn(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started]);

  const turn = turns[ti];

  const sendMine = (o) => {
    if (!o) return;
    setNopeIdx(new Set());
    setHint(null);
    const de = withName(o.de);
    setThread((prev) => [...prev, { side: "me", de, en: withName(o.en), tick: true }]);
    if (de) speak(de);
    blip(true);
    ctx?.bumpCombo?.();
    if (o.ack) {
      setTyping(true);
      setTimer(() => {
        setTyping(false);
        const ack = withName(o.ack);
        setThread((prev) => [...prev, { side: "them", de: ack, en: withName(o.ackEn) }]);
        speak(ack);
        const n = ti + 1;
        setTi(n);
        setTimer(() => nextTurn(n), 900);
      }, 600);
    } else {
      const n = ti + 1;
      setTi(n);
      setTimer(() => nextTurn(n), 650);
    }
  };

  const choose = (i) => {
    const opts = Array.isArray(turn?.opts) ? turn.opts : [];
    const o = opts[i];
    if (!o) return;
    if (!o.ok && turn?.mode !== "choice") {
      setNopeIdx((prev) => new Set(prev).add(i));
      blip(false);
      ctx?.miss?.();
      setHint(CHAT_HINTS[Math.floor(Math.random() * CHAT_HINTS.length)]);
      return;
    }
    sendMine(o);
  };

  const micDone = () => {
    if (!recording || !turn) return;
    setRecording(false);
    const opts = Array.isArray(turn.opts) ? turn.opts : [];
    const isChoice = turn.mode === "choice";
    const ok = isChoice ? 0 : opts.findIndex((o) => o.ok);
    if (opts[ok]) sendMine(opts[ok]);
  };

  const toggleHard = () => {
    const next = !hardChat;
    setHardChat(next);
    try { localStorage.setItem("lg2HardChat", next ? "1" : "0"); } catch { /* ignore */ }
  };

  const npc = npcFor(step?.who, ctx?.topic || ctx?.moduleId);
  const npcImg = npcPortrait(npc);
  const backdrop = moduleBackdrop(ctx?.topic || ctx?.moduleId);
  const meInitial = (ctx?.userFirstName || "You").trim().charAt(0).toUpperCase();

  if (!started) {
    const full = npcFullFor(ctx?.topic || ctx?.moduleId, step?.who);
    // flex-1, not h-full: the step area is a flex column whose height comes
    // from flex, which percentage heights can't resolve against — h-full
    // collapsed the scene to 0px and clipped everything inside it.
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="px-1">
          <MayaSays mood="greet" type text={`Now — try talking to ${whoLabel(step?.who)} in German.`} />
        </div>
        <div className="relative flex-1 overflow-hidden rounded-3xl ring-1 ring-slate-200">
          {full && <Img src={full} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full" />}
          <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="absolute inset-x-4 bottom-24">
            <div className="rounded-2xl bg-white/95 px-4 py-3 shadow-lg">
              <span className="block text-[17px] font-bold text-slate-800">
                <Typed text={withName(step?.turns?.[0]?.them) || "Hallo!"} onDone={() => setSaidDone(true)} />
              </span>
              <span className={`mt-0.5 block text-xs text-slate-500 transition-opacity ${saidDone ? "opacity-100" : "opacity-0"}`}>
                {withName(step?.turns?.[0]?.en) || "Hello!"}
              </span>
            </div>
          </div>
          <button
            className="absolute inset-x-4 bottom-6 rounded-2xl bg-white py-3.5 text-[15px] font-bold text-[#17336d] shadow-lg"
            onClick={() => setStarted(true)}
          >
            Start conversation
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Who you're talking to + the goal, in the chat's own header. */}
      <div className="relative -mx-4 -mt-2 mb-3 overflow-hidden">
        {backdrop && (
          <div className="absolute inset-0" aria-hidden="true">
            <Img src={backdrop} alt="" className="h-full w-full" />
            <div className="absolute inset-0 bg-white/70 backdrop-blur-sm" />
          </div>
        )}
        <div className="relative flex items-center gap-3 px-4 py-3">
          {npcImg ? (
            <Img className="h-11 w-11 rounded-full ring-2 ring-white" src={npcImg} alt="" aria-hidden="true" />
          ) : (
            <span className="grid h-11 w-11 place-items-center rounded-full bg-slate-200 text-slate-500 ring-2 ring-white">
              <Glyph name="chat" size={20} />
            </span>
          )}
          <div className="min-w-0 flex-1">
            <span className="block truncate text-[15px] font-bold text-slate-800">{step?.who || "Your turn"}</span>
            <span className="block truncate text-xs text-slate-500">{step?.goal || "Have a conversation"}</span>
          </div>
          <button
            className={`rounded-full px-3 py-1 text-[11px] font-extrabold tracking-wide ${
              hardChat ? "bg-rose-100 text-rose-700" : "bg-slate-100 text-slate-500"
            }`}
            onClick={toggleHard}
          >
            {hardChat ? "HARD" : "EASY"}
          </button>
        </div>
      </div>

      <div className="space-y-3 pb-3">
        {thread.map((m, i) => (
          <div key={i} className={`flex items-end gap-2 ${m.side === "me" ? "flex-row-reverse" : ""}`}>
            <div className="shrink-0">
              {m.side === "me" ? (
                <span className="grid h-8 w-8 place-items-center rounded-full bg-[#17336d] text-xs font-extrabold text-white">{meInitial}</span>
              ) : npcImg ? (
                <Img src={npcImg} alt="" aria-hidden="true" className="h-8 w-8 rounded-full" />
              ) : (
                <span className="grid h-8 w-8 place-items-center rounded-full bg-slate-200 text-slate-500">
                  {step?.avatar || <Glyph name="chat" size={16} />}
                </span>
              )}
            </div>
            <div
              className={`max-w-[78%] cursor-pointer rounded-2xl px-3.5 py-2.5 ${
                m.side === "me"
                  ? "rounded-br-md bg-[#17336d] text-white"
                  : "rounded-bl-md bg-white text-slate-800 ring-1 ring-slate-200"
              }`}
              onClick={() => speak(m.de)}
            >
              <span className="block text-[15px] font-semibold leading-snug">{m.de}</span>
              {!(m.side === "me" && hardChat) && (
                <span className={`mt-0.5 block text-[11px] ${m.side === "me" ? "text-white/60" : "text-slate-400"}`}>{m.en}</span>
              )}
              {m.tick && <span className="mt-0.5 block text-right text-[10px] text-white/50">✓✓</span>}
            </div>
          </div>
        ))}
        {typing && (
          <div className="flex items-end gap-2">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-slate-200 text-slate-500">
              {npcImg ? <Img src={npcImg} alt="" aria-hidden="true" className="h-8 w-8 rounded-full" /> : (step?.avatar || <Glyph name="chat" size={16} />)}
            </span>
            <div className="flex gap-1 rounded-2xl rounded-bl-md bg-white px-4 py-3.5 ring-1 ring-slate-200">
              <i className="h-2 w-2 animate-bounce rounded-full bg-slate-300" />
              <i className="h-2 w-2 animate-bounce rounded-full bg-slate-300" style={{ animationDelay: "0.12s" }} />
              <i className="h-2 w-2 animate-bounce rounded-full bg-slate-300" style={{ animationDelay: "0.24s" }} />
            </div>
          </div>
        )}
        {hint && <MayaSays text={hint} mood="concerned" />}
        <div ref={bottomRef} />
      </div>

      {/* Reply sheet — portalled into the lesson page's fixed bottom area so
          it sits above the thread like a real messaging app. */}
      {done && portalTarget && createPortal(
        <div className="px-4 pb-4">
          <MayaSays text="You just held a conversation in German. Every word in it was yours." mood="cheer" />
        </div>,
        portalTarget,
      )}

      {!done && turn && !typing && turn.mode === "production" && portalTarget && createPortal(
        <div className="border-t border-slate-200 bg-[#f4f6fb] px-4 pb-4 pt-3">
          <ProductionReply turn={turn} hardChat={hardChat} onSubmit={sendMine} missTurn={ctx?.miss} onWrong={setHint} />
        </div>,
        portalTarget,
      )}

      {!done && turn && !typing && turn.mode !== "production" && portalTarget && createPortal(
        <div className="border-t border-slate-200 bg-[#f4f6fb] px-4 pb-4 pt-3">
          <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
            {turn.mode === "choice"
              ? "Your choice. Anything here is right"
              : `Tap a reply, or say it${hardChat || !speechAvailable() ? "" : " · tap a reply to hear it"}`}
          </div>
          <div className="flex items-end gap-3">
            <div className="flex-1 space-y-2">
              {(turn.opts || []).map((o, i) => (
                <button
                  key={i}
                  className={`w-full rounded-2xl px-3.5 py-2.5 text-left ring-1 transition ${
                    nopeIdx.has(i)
                      ? "bg-rose-50 ring-rose-300 opacity-50"
                      : turn.mode === "choice"
                        ? "bg-white ring-slate-200 hover:ring-indigo-300"
                        : "bg-white ring-slate-200 hover:ring-indigo-300"
                  }`}
                  style={nopeIdx.has(i) ? { pointerEvents: "none" } : undefined}
                  onClick={() => choose(i)}
                >
                  <span className="block text-[15px] font-semibold text-slate-800">{withName(o?.de)}</span>
                  {!hardChat && <span className="block text-[11px] text-slate-400">{withName(o?.en)}</span>}
                </button>
              ))}
            </div>
            <MicButton
              size="sm"
              state={recording ? "recording" : "idle"}
              label={recording ? "Tap when you have said it" : "Tap and say your reply"}
              onTap={() => (recording ? micDone() : setRecording(true))}
            />
          </div>
        </div>,
        portalTarget,
      )}
    </>
  );
}
