import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import Maya, { MayaSays } from "./components/Maya";
import ExplainSheet from "./components/ExplainSheet";
import PassportBook from "./components/PassportBook";
import Typed from "./components/Typed";
import {
  shuffle, wordsForStep, pickPraise, pickMindBlown, withName,
  subKey, nextSub, topicFullyDone, topicDoneCount, rewardLine,
} from "./lib/curriculum";
import StepBody from "./steps";
import { fanfare, resetStreak, preloadLg2TTS } from "./lib/audio";
import { moduleBackdrop } from "./lib/vocabArt";
import {
  getLg2Curriculum, getLg2State, getLg2Sub, completeLg2Sub, saveLg2Progress,
  pushLg2Review, removeLg2Review, setLg2Cooldown, reportLg2Combo, getLg2Art,
} from "../../api/learnGermanV2Api";
import { loadArtManifest } from "./lib/vocabArt";
import { enqueue as enqueueProgress, flush as flushPending, wireFlushOnReconnect } from "./lib/pendingProgress";

const NOCHECK = ["teach", "match", "chat", "hack"];
// Story, Speak, VoiceNote and Chat already carry Maya's presence in their own
// chrome — every other mechanic gets the same MayaSays row the design system
// puts on every lesson screen.
const MAYA_SKIP = ["story", "voicenote", "chat", "hack"];
const MAYA_LINE = {
  teach: "Here's a new one for you.",
  pick: "Which one is it?",
  listen: "Listen closely, then pick it out.",
  build: "Put it together, word by word.",
  translate: "Your turn — say it in German.",
  match: "Match them up.",
  soundmatch: "Trust your ears on this one.",
  scenetap: "What fits the scene?",
  keypad: "Dial it out.",
  race: "Quick — beat me to it!",
  hack: "Here's a pattern worth knowing.",
  spotmistake: "Something's off here — find it.",
  oddoneout: "Three belong together. One doesn't.",
  speakcards: "Say it back to me.",
  speak: "Your turn — out loud.",
  gapfill: "Fill in what's missing.",
  sort: "Sort these where they belong.",
};
const MAYA_MOOD = {
  teach: "greet", hack: "proud",
  pick: "curious", listen: "curious", soundmatch: "curious",
  scenetap: "curious", oddoneout: "curious", gapfill: "curious", keypad: "curious",
  match: "bob", sort: "bob", build: "bob",
  translate: "proud", speakcards: "proud", speak: "proud",
  race: "cheer", spotmistake: "concerned",
};

const REVIEW_MECHANICS = ["pick", "listen", "soundmatch"];
const REVIEW_PER_SESSION = 2;

function buildReviewSteps(reviewItems, topics, ownedWords, offset) {
  if (!reviewItems.length) return { steps: [], teaches: [] };
  const reviewWords = reviewItems.map((r) => [r.de, r.en, r.icon]);
  const seen = new Set(reviewWords.map((w) => w[0]));
  const ownedSet = new Set((ownedWords || []).map((w) => w.toLowerCase()));
  const extraPool = [];
  topics.forEach((t) =>
    (t.subs || []).forEach((sub) =>
      (sub.teaches || []).forEach((w) => {
        if (!seen.has(w[0]) && ownedSet.has(w[0].toLowerCase())) {
          seen.add(w[0]);
          extraPool.push(w);
        }
      }),
    ),
  );
  const teaches = reviewWords.concat(shuffle(extraPool).slice(0, 10));
  const steps = [{ t: "story", review: true, lines: ["Let's see what you still remember."] }];
  reviewWords.forEach((tw, i) => {
    const others = teaches.map((_, j) => j).filter((j) => j !== i);
    // from[0] is the correct answer; never shuffle before handing off.
    const from = [i, ...shuffle(others).slice(0, 2)].map((j) => j + offset);
    const mechanic = REVIEW_MECHANICS[Math.floor(Math.random() * REVIEW_MECHANICS.length)];
    if (mechanic === "pick") steps.push({ t: "pick", q: `Which one is <b>${tw[0]}</b>?`, from, reviewWord: tw[0] });
    else if (mechanic === "listen") steps.push({ t: "listen", w: i + offset, from, reviewWord: tw[0] });
    else steps.push({ t: "soundmatch", w: i + offset, from, reviewWord: tw[0] });
  });
  const closingLine = reviewWords.length > 1 ? "Still in there. Nice." : `Still know ${reviewWords[0][0]}. Nice.`;
  steps.push({ t: "story", review: true, lines: [closingLine] });
  return { steps, teaches };
}

export default function Lg2LessonPage() {
  const { topicId, subKey: subKeyParam } = useParams();
  const navigate = useNavigate();
  const user = useSelector((s) => s.auth?.user);
  const userName = user?.name || user?.username || "";

  const [phase, setPhase] = useState("loading"); // loading | lesson | part | reward
  const [topics, setTopics] = useState([]);
  const [target, setTarget] = useState(null); // {topic, sub}
  const [learner, setLearner] = useState({ done: [], inProgress: {}, stats: {}, review: [] });
  const [partInfo, setPartInfo] = useState(null);
  const [rewardInfo, setRewardInfo] = useState(null);
  const [explain, setExplain] = useState(null); // tokens[]
  const [fatal, setFatal] = useState(null);
  const [sheetEl, setSheetEl] = useState(null);

  // Anything that failed earlier (another tab, a tunnel) goes first.
  useEffect(() => {
    wireFlushOnReconnect();
    flushPending().catch(() => {});
  }, []);

  // Load curriculum + state + the sub's steps (sub fetch is the quota gate).
  useEffect(() => {
    let live = true;
    setPhase("loading");
    (async () => {
      try {
        const [cur, st, subRes] = await Promise.all([
          getLg2Curriculum(),
          getLg2State(),
          getLg2Sub(topicId, subKeyParam),
          // Deep links skip the home screen, so the manifest may be cold.
          loadArtManifest(getLg2Art),
        ]);
        if (!live) return;
        setTopics(cur.data?.topics || []);
        setLearner({
          done: st.data?.done || [],
          inProgress: st.data?.inProgress || {},
          stats: st.data?.stats || {},
          review: st.data?.review || [],
        });
        setTarget({ topic: subRes.data?.topic, sub: subRes.data?.sub });
        setPhase("lesson");
      } catch (err) {
        if (!live) return;
        const status = err?.response?.status;
        if (status === 402) { navigate("/learn-german", { replace: true }); return; } // modal already shown by axios
        if (status === 403) { navigate("/learn-german", { replace: true }); return; } // flag off mid-flight
        setFatal(err?.response?.data?.error || "Couldn't load this lesson.");
      }
    })();
    return () => { live = false; };
  }, [topicId, subKeyParam, navigate]);

  const onExit = () => navigate("/learn-german");

  const isDone = (t, done) => topicFullyDone(t, done);

  const onSubFinished = async ({ topic, sub, bestCombo, misses, stepsLen, secs }) => {
    const key = subKey(topic, sub);
    const doneAfter = learner.done.includes(key) ? learner.done : [...learner.done, key];
    const fullyDone = topicFullyDone(topic, doneAfter);
    const accuracy = Math.max(0, Math.round(100 - (misses * 100) / (stepsLen || 1)));

    setLearner((u) => ({ ...u, done: doneAfter }));

    if (!fullyDone) {
      const newWords = (sub.steps || [])
        .filter((s) => s.t === "teach" && sub.teaches && sub.teaches[s.w])
        .map((s) => sub.teaches[s.w]);
      setPartInfo({
        topic, sub, upNext: nextSub(topic, doneAfter), accuracy, bestCombo,
        doneCount: topicDoneCount(topic, doneAfter), total: topic.subs?.length || 1,
        newWords: newWords || [],
      });
      setPhase("part");
    } else {
      const nextTopic = topics.find((t) => !topicFullyDone(t, doneAfter)) || null;
      setRewardInfo({ topic, accuracy, bestCombo, secs, nextTopic });
      setPhase("reward");
    }

    // Send first; if the request dies, the completion waits in localStorage
    // and flushes on the next save or reconnect — a dead request must not
    // eat a finished lesson.
    try {
      await completeLg2Sub({ topicId: topic.id, subKey: sub.key, secs, accuracy, bestCombo });
    } catch (err) {
      if (!err?.response) {
        // Network-level failure — queue it for retry.
        enqueueProgress({ kind: "complete", topicId: topic.id, subKey: sub.key, payload: { secs, accuracy, bestCombo } });
      }
      // A 402/403/404 means the server heard us and refused — nothing to
      // retry; the backend's own accounting decides what counted.
    }
  };

  const continueToNextSub = () => {
    const up = partInfo?.upNext;
    if (!up || !partInfo?.topic) { navigate("/learn-german"); return; }
    navigate(`/learn-german/v2/lesson/${partInfo.topic.id}/${up.key}`);
  };

  const goHome = () => navigate("/learn-german");
  const goPassport = () => navigate("/learn-german/v2/passport");

  if (phase === "loading") {
    return (
      <div className="grid min-h-[60vh] place-items-center bg-[#f4f6fb]">
        <div className="text-sm font-semibold text-slate-400">Loading lesson…</div>
      </div>
    );
  }

  if (fatal) {
    return (
      <div className="grid min-h-[60vh] place-items-center bg-[#f4f6fb] px-6 text-center">
        <div>
          <p className="text-slate-600">{fatal}</p>
          <button className="mt-4 rounded-2xl bg-[#17336d] px-6 py-3 text-sm font-bold text-white" onClick={onExit}>
            Back to Learn German
          </button>
        </div>
      </div>
    );
  }

  if (phase === "part" && partInfo) {
    return (
      <PartCompleteScreen
        {...partInfo}
        userName={userName}
        onContinue={continueToNextSub}
        onExit={onExit}
      />
    );
  }

  if (phase === "reward" && rewardInfo) {
    return (
      <RewardScreen
        topic={rewardInfo.topic}
        stats={rewardInfo}
        topics={topics}
        done={learner.done}
        isDone={isDone}
        userName={userName}
        onNext={goHome}
        onPassport={goPassport}
      />
    );
  }

  if (!target?.sub) return null;

  return (
    <LessonEngine
      topics={topics}
      target={target}
      userName={userName}
      stats={learner.stats}
      review={learner.review}
      startStep={learner.inProgress?.[subKey(target.topic, target.sub)] || 0}
      explainTokens={explain}
      onExplain={setExplain}
      onCloseExplain={() => setExplain(null)}
      sheetEl={sheetEl}
      setSheetEl={setSheetEl}
      onExit={onExit}
      onFinishSub={onSubFinished}
      onPushReview={async (de, en, icon) => {
        setLearner((u) => (u.review.some((r) => r.de === de) ? u : { ...u, review: [...u.review, { de, en, icon }] }));
        try { await pushLg2Review({ de, en, icon }); } catch { /* best effort */ }
      }}
      onRemoveReview={async (de) => {
        setLearner((u) => ({ ...u, review: u.review.filter((r) => r.de !== de) }));
        try { await removeLg2Review(de); } catch { /* best effort */ }
      }}
      onCooldown={async (kind) => {
        setLearner((u) => ({
          ...u,
          stats: {
            ...u.stats,
            [kind === "listen" ? "listenSkipUntil" : "speakSkipUntil"]: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
          },
        }));
        try { await setLg2Cooldown(kind); } catch { /* best effort */ }
      }}
      onReportCombo={async (best) => {
        try { await reportLg2Combo(best); } catch { /* best effort */ }
      }}
    />
  );
}

/* ------------------------------------------------------------------ */
/* The step engine — the reference Lesson screen, wired to Skillcase.    */
/* ------------------------------------------------------------------ */
function LessonEngine({
  topics, target, userName, stats, review, startStep,
  onExit, onFinishSub, onPushReview, onRemoveReview, onCooldown, onReportCombo,
  explainTokens, onExplain, onCloseExplain, sheetEl, setSheetEl,
}) {
  const L = useMemo(() => {
    const base = { steps: target.sub.steps, teaches: target.sub.teaches };
    const pending = (review || []).slice(0, REVIEW_PER_SESSION);
    if (!pending.length) return base;
    const { steps: reviewSteps, teaches: reviewTeaches } = buildReviewSteps(
      pending, topics, stats.words, base.teaches.length,
    );
    return { steps: [...reviewSteps, ...base.steps], teaches: [...base.teaches, ...reviewTeaches] };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  // Warm the TTS cache for the next few steps so the auto-play on step mount
  // isn't a cold fetch over the network.
  useEffect(() => {
    const texts = [];
    for (const s of L.steps) {
      if (s.t === "teach") texts.push(L.teaches[s.w]?.[0]);
      else if (s.t === "speak" || s.t === "translate") texts.push(s.de);
      else if (s.t === "listen" || s.t === "soundmatch") texts.push(L.teaches[s.w]?.[0]);
      else if (s.t === "voicenote") texts.push(s.sentence);
      else if (s.t === "keypad") (s.target || []).forEach((i) => texts.push(L.teaches[i]?.[0]));
      else if (s.t === "chat") (s.turns || []).forEach((t) => texts.push(t.them));
      if (texts.length >= 24) break;
    }
    preloadLg2TTS(texts.filter(Boolean));
  }, [L]);

  const [step, setStep] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [verdict, setVerdict] = useState(null);
  const [combo, setCombo] = useState(0);
  const [bestCombo, setBestCombo] = useState(0);
  const [misses, setMisses] = useState(0);
  const [mainBtn, setMainBtnState] = useState({ label: "Check", disabled: true });
  const [footSkip, setFootSkipState] = useState(null);
  const [lastWords, setLastWords] = useState([]);
  const [hideFooter, setHideFooter] = useState(false);
  const t0 = useRef(Date.now());
  const speakCheckRef = useRef(null);
  const stepHadMiss = useRef(false);
  const [banked, setBanked] = useState(0);
  const [bump, setBump] = useState(false);
  const sheetRef = useRef(null);
  const bestComboRef = useRef(0);
  bestComboRef.current = bestCombo;

  // Sheet dock for Chat's reply UI — a plain div above the footer area.
  useEffect(() => { setSheetEl(sheetRef.current); }, [setSheetEl]);

  const now = () => Date.now();
  const onListenCooldown = () => stats.listenSkipUntil && now() < new Date(stats.listenSkipUntil).getTime();
  const onSpeakCooldown = () => stats.speakSkipUntil && now() < new Date(stats.speakSkipUntil).getTime();

  const resolveStep = (idx) => {
    let i = idx;
    while (L.steps[i] && (
      ((L.steps[i].t === "listen" || L.steps[i].t === "translate") && onListenCooldown()) ||
      (L.steps[i].t === "speak" && onSpeakCooldown())
    )) i++;
    return i;
  };

  const savePosition = (idx) => {
    // Autosave — direct POST, queued for retry only if the network eats it.
    saveLg2Progress({ topicId: target.topic.id, subKey: target.sub.key, stepIndex: idx }).catch((err) => {
      if (!err?.response) {
        enqueueProgress({
          kind: "progress", topicId: target.topic.id, subKey: target.sub.key,
          payload: { stepIndex: idx },
        });
      }
    });
  };

  const finishNow = async () => {
    fanfare();
    resetStreak();
    const secs = Math.round((now() - t0.current) / 1000);
    if (bestComboRef.current > 0) onReportCombo?.(bestComboRef.current);
    onFinishSub({ topic: target.topic, sub: target.sub, bestCombo: bestComboRef.current, misses, stepsLen: L.steps.length, secs });
  };

  const goToStep = (idx) => {
    const resolved = resolveStep(idx);
    if (!L.steps[resolved]) { finishNow(); return; }
    setStep(resolved);
    setAnswered(false); setVerdict(null); setMainBtnState({ label: "Check", disabled: true });
    setFootSkipState(null); speakCheckRef.current = null; stepHadMiss.current = false;
    setHideFooter(L.steps[resolved].t === "story" || L.steps[resolved].t === "chat");
    savePosition(resolved);
  };

  // Resume mid-lesson from a saved step_index.
  useEffect(
    () => { goToStep(Math.min(startStep || 0, L.steps.length - 1)); },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [L],
  );

  const s = L.steps[step];
  if (!s) return null;

  const commit = (ok, msg, words) => {
    setAnswered(true);
    const headline = !ok ? "Not that one. No harm done." : (!stepHadMiss.current ? pickMindBlown() : pickPraise());
    setVerdict({ ok, msg, headline });
    if (ok) { setCombo((c) => { const n = c + 1; setBestCombo((b) => Math.max(b, n)); return n; }); }
    else { setCombo(0); setMisses((m) => m + 1); }
    setMainBtnState({ label: "Continue", disabled: false });
    setLastWords(ok ? words : []);
    if (ok && s.reviewWord) onRemoveReview(s.reviewWord);
  };

  const advance = () => {
    if (s.t === "teach") {
      setBanked((b) => b + 1);
      setBump(true);
      setTimeout(() => setBump(false), 460);
    }
    goToStep(step + 1);
  };

  const handleMainBtn = () => {
    if (NOCHECK.includes(s.t)) { advance(); return; }
    if (!answered) {
      if (s.t === "speak" && speakCheckRef.current) {
        const v = speakCheckRef.current();
        commit(v.ok, v.msg, wordsForStep(s, L.teaches));
      }
      return;
    }
    advance();
  };

  const progressPct = (step / L.steps.length) * 100;
  const miss = () => { setCombo(0); setMisses((m) => m + 1); stepHadMiss.current = true; };
  const bumpCombo = () => setCombo((c) => { const n = c + 1; setBestCombo((b) => Math.max(b, n)); return n; });

  const ctx = {
    teaches: L.teaches, topics,
    topic: target.topic,
    moduleId: target.topic?.id, subTitle: target.topic?.title,
    subIndex: (target.topic?.subs || []).findIndex((x) => x.key === target.sub?.key),
    subCount: (target.topic?.subs || []).length,
    userFirstName: userName ? userName.split(" ")[0] : null,
    commit: (ok, msg) => commit(ok, msg, wordsForStep(s, L.teaches)),
    miss,
    bumpCombo,
    advance,
    setMainBtn: (v) => setMainBtnState(v),
    setFootSkip: (v) => setFootSkipState(v),
    registerSpeakCheck: (fn) => { speakCheckRef.current = fn; },
    onPushReview, onRemoveReview, onCooldown,
    setHideFooter, finishNow,
    answered,
    portalEl: sheetEl,
  };

  return (
    <section className="lg2 flex min-h-[100dvh] flex-col bg-[#f4f6fb]">
      <div className="flex items-center gap-3 px-4 pt-3">
        <button className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white text-slate-500 ring-1 ring-slate-200" aria-label="Leave lesson" onClick={onExit}>
          ✕
        </button>
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200">
          <i className="block h-full rounded-full bg-[#17336d] transition-[width]" style={{ width: `${progressPct}%` }} />
        </div>
        <span className="text-xs font-bold tabular-nums text-slate-400">
          {Math.min(step + 1, L.steps.length)}/{L.steps.length}
        </span>
        {banked > 0 && (
          <span className={`text-xs font-extrabold text-amber-600 ${bump ? "lg2-bump inline-block" : ""}`}>+{banked}</span>
        )}
        <span className={`text-xs font-extrabold transition ${combo >= 2 ? "text-indigo-600" : "text-slate-300"}`}>
          ×{combo + 1}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-3 pt-3">
        {!MAYA_SKIP.includes(s.t) && (
          <MayaSays mood={MAYA_MOOD[s.t] || "curious"} text={MAYA_LINE[s.t] || "Let's try this one."} />
        )}
        <StepBody key={step} step={s} ctx={ctx} />
        <div ref={sheetRef} />
      </div>

      {!hideFooter && (
        <div
          className={`border-t px-4 pb-5 pt-3 ${
            verdict ? (verdict.ok ? "border-emerald-200 bg-emerald-50" : "border-rose-200 bg-rose-50") : "border-slate-200 bg-white"
          }`}
        >
          {footSkip && !answered && (
            <button className="mb-2 w-full text-center text-xs font-semibold text-slate-400 underline-offset-2 hover:underline" onClick={() => footSkip.onSkip()}>
              {footSkip.label}
            </button>
          )}
          {verdict && (
            <div className="mb-3 flex items-start gap-3">
              {verdict.ok ? (
                <svg className="mt-0.5 h-6 w-6 shrink-0 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="11" />
                  <path d="M7 12.4l3.3 3.2L17 8.8" />
                </svg>
              ) : (
                <Maya mood="wobble" className="h-9 w-9" />
              )}
              <div className="min-w-0 flex-1">
                <h3 className={`text-[15px] font-extrabold ${verdict.ok ? "text-emerald-800" : "text-rose-800"}`}>{verdict.headline}</h3>
                {!verdict.ok && verdict.msg && (
                  <p className="mt-0.5 text-sm text-slate-600" dangerouslySetInnerHTML={{ __html: verdict.msg }} />
                )}
              </div>
              {answered && verdict?.ok && lastWords.length > 0 && (
                <button
                  className="flex shrink-0 items-center gap-1 rounded-full bg-white/70 px-3 py-1.5 text-xs font-bold text-indigo-700 ring-1 ring-indigo-200"
                  onClick={() => onExplain(lastWords)}
                >
                  Explain
                  <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M9 6l6 6-6 6" />
                  </svg>
                </button>
              )}
            </div>
          )}
          <button
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#17336d] py-3.5 text-[15px] font-bold text-white shadow-md disabled:opacity-40"
            disabled={mainBtn.disabled}
            onClick={handleMainBtn}
          >
            {mainBtn.label}
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </button>
        </div>
      )}

      {explainTokens && (
        <div className="fixed inset-0 z-50 bg-black/30" onClick={onCloseExplain}>
          <div className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-3xl bg-[#f4f6fb]" onClick={(e) => e.stopPropagation()}>
            <ExplainSheet tokens={explainTokens} topics={topics} onClose={onCloseExplain} />
          </div>
        </div>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Part complete — the beat between learn1/learn2 and the next part.     */
/* ------------------------------------------------------------------ */
function PartCompleteScreen({
  topic = {}, sub = {}, upNext = null, accuracy = 100, bestCombo = 0,
  doneCount = 0, total = 1, newWords = [], userName, onContinue, onExit,
}) {
  const proof = withName(topic?.proof, userName ? userName.split(" ")[0] : null);
  const perfLine = accuracy === 100
    ? "No mistakes. Every tap was the right one."
    : bestCombo >= 2
      ? `${bestCombo + 1} right in a row at your best.`
      : "You got there. That's what counts.";

  const safeNewWords = (newWords || []).filter((item) => Array.isArray(item) && item.length > 0);
  const wordNames = safeNewWords.map(([de]) => de).filter(Boolean);
  const joinWords = (arr) => {
    if (arr.length <= 1) return arr[0] || "";
    if (arr.length === 2) return `${arr[0]} and ${arr[1]}`;
    return `${arr.slice(0, -1).join(", ")}, and ${arr[arr.length - 1]}`;
  };

  const readyForCapability = sub?.key === "learn2" && topic?.proof;
  const capHeadline = readyForCapability
    ? `You can now say: ${proof}`
    : wordNames.length > 0
      ? `You just learned ${joinWords(wordNames)}.`
      : `${sub?.label || "Part"} done.`;

  const backdrop = moduleBackdrop(topic);

  return (
    <section className="relative flex min-h-[100dvh] flex-col overflow-hidden bg-[#17336d]">
      {backdrop && (
        <div className="absolute inset-0" aria-hidden="true">
          <img src={backdrop} alt="" className="h-full w-full object-cover opacity-30" />
        </div>
      )}
      <div className="relative z-10 flex flex-1 items-center justify-center px-5 pt-8">
        <div className="w-full max-w-sm rounded-3xl bg-white/95 p-5 shadow-xl">
          <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">
            {sub?.label || "Part"} done
          </div>
          <div className="mt-2 flex gap-1.5">
            {Array.from({ length: total || 1 }).map((_, i) => (
              <span key={i} className={`h-2 flex-1 rounded-full ${i < doneCount ? "bg-emerald-500" : "bg-slate-200"}`} />
            ))}
          </div>
          <h2 className="mt-3 text-xl font-extrabold leading-snug text-slate-800">{capHeadline}</h2>
          <p className="mt-1 text-sm text-slate-500">{perfLine}</p>
          {safeNewWords.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {safeNewWords.map((item, idx) => {
                const [de = "", en = ""] = Array.isArray(item) ? item : [];
                return (
                  <div key={de || idx} className="rounded-xl bg-slate-100 px-2.5 py-1.5">
                    <b className="block text-[13px] font-bold text-slate-800">{de}</b>
                    <span className="block text-[10px] text-slate-500">{en}</span>
                  </div>
                );
              })}
            </div>
          )}
          <div className="mt-4 flex items-end gap-2.5">
            <div className="flex-1 rounded-2xl rounded-bl-md bg-indigo-50 px-3.5 py-2.5 text-[15px] text-slate-800">
              <Typed text="Nice. Ready for the next part?" />
            </div>
            <Maya mood="cheer" />
          </div>
        </div>
      </div>
      <div className="relative z-10 px-5 pb-8">
        <button className="flex w-full items-center justify-center gap-2 rounded-2xl bg-white py-3.5 text-[15px] font-bold text-[#17336d] shadow-lg" onClick={onContinue}>
          Continue{upNext?.label ? ` to ${upNext.label}` : ""}
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </button>
        <button className="mt-2 w-full text-center text-xs font-semibold text-white/70" onClick={onExit}>
          Leave for now
        </button>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Reward — the passport stamp ceremony after a whole topic is done.     */
/* ------------------------------------------------------------------ */
function RewardScreen({ topic = {}, stats = {}, topics = [], done = [], isDone, userName, onNext, onPassport }) {
  const { accuracy = 100, bestCombo = 0, secs = 0, nextTopic = null } = stats || {};
  const [landed, setLanded] = useState(false);
  const proof = withName(topic?.proof, userName ? userName.split(" ")[0] : null);

  return (
    <section className="lg2 flex min-h-[100dvh] flex-col bg-[#f4f6fb] px-4 pb-6 pt-6">
      <div className="text-center text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">Stamp earned</div>

      <div className="mt-6 flex-1">
        <PassportBook
          ceremony
          landingId={topic?.id}
          topics={topics}
          done={done}
          stats={stats}
          isDone={isDone}
          userName={userName}
          onLanded={() => setLanded(true)}
        />
      </div>

      <div className="mt-4 text-center text-[15px] font-semibold text-slate-700">
        {topic?.capability || proof || "Module complete."}
      </div>

      <div className="mt-4">
        <MayaSays text={rewardLine(accuracy, bestCombo, secs)} mood="cheer" />
        <button
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#17336d] py-3.5 text-[15px] font-bold text-white shadow-md disabled:opacity-40"
          disabled={!landed}
          onClick={onNext}
        >
          {nextTopic?.title ? `Next: ${nextTopic.title}` : "Back to the path"}
        </button>
        <button className="mt-2 w-full text-center text-xs font-semibold text-slate-400" onClick={onPassport}>
          Open my passport
        </button>
      </div>
    </section>
  );
}
