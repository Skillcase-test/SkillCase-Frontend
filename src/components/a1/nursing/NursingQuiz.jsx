import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Volume2,
  Loader2,
  Check,
  RotateCcw,
  Timer,
  Maximize2,
} from "lucide-react";
import NursingDocumentSheet from "./NursingDocumentSheet";
import { checkNursingAnswer } from "../../../api/a1NursingApi";

function shuffleOptions(options) {
  const a = [...(options || [])];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Per-question nursing quiz: pick → Check → correct shows feedback_de, wrong
// offers a retry that doesn't rescore. Checks are server-side — the correct
// answer only arrives in the response for reveal states. Timed questions
// (emergency) count a timeout as a wrong first attempt.
export default function NursingQuiz({
  questions = [],
  title = "Quiz",
  chapterId,
  onFinish,
  onExit,
  speak,
  isSpeaking,
  isLoadingAudio,
}) {
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState("pick"); // pick | checking | correct | wrong | revealed | timeout
  const [selected, setSelected] = useState(null);
  const [attempts, setAttempts] = useState(0);
  const [timeLeft, setTimeLeft] = useState(null);
  const [overlayDoc, setOverlayDoc] = useState(null);
  const [reveal, setReveal] = useState(null); // {answer, feedback_de, feedback_en}
  const firstAnswersRef = useRef({});
  const autoPlayedRef = useRef(null);

  const question = questions[index];
  const options = useMemo(
    () => shuffleOptions(question?.options),
    [question],
  );
  const timeLimit = Number(question?.time_limit_seconds) || 0;
  const isLast = index >= questions.length - 1;

  // Auto-play the question audio once when a question appears.
  useEffect(() => {
    if (!question || autoPlayedRef.current === question.id) return;
    autoPlayedRef.current = question.id;
    if (question.audio?.text) {
      speak?.(question.audio.text, question.audio.lang || "de-DE");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, question?.id]);

  // Countdown for timed questions — only while waiting for a pick.
  useEffect(() => {
    if (!timeLimit || phase !== "pick") {
      setTimeLeft(null);
      return undefined;
    }
    setTimeLeft(timeLimit);
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev === null) return null;
        if (prev <= 0.1) {
          clearInterval(timer);
          return 0;
        }
        return +(prev - 0.1).toFixed(1);
      });
    }, 100);
    return () => clearInterval(timer);
  }, [index, timeLimit, phase]);

  useEffect(() => {
    if (timeLeft === 0 && phase === "pick") {
      if (firstAnswersRef.current[question.id] === undefined) {
        firstAnswersRef.current[question.id] = null;
      }
      setSelected(null);
      // Reveal needs the correct answer — fetch it without scoring anything.
      checkNursingAnswer(chapterId, question.id, null)
        .then((res) => setReveal(res?.data || null))
        .catch(() => {})
        .finally(() => setPhase("timeout"));
    }
  }, [timeLeft, phase, question, chapterId]);

  if (!question) return null;

  const checkAnswer = async () => {
    if (selected === null || phase !== "pick") return;
    if (firstAnswersRef.current[question.id] === undefined) {
      firstAnswersRef.current[question.id] = selected;
    }
    setPhase("checking");
    try {
      const res = await checkNursingAnswer(chapterId, question.id, selected);
      const data = res?.data || {};
      setReveal({
        answer: data.answer ?? null,
        feedback_de: data.feedback_de ?? null,
        feedback_en: data.feedback_en ?? null,
      });
      if (data.correct) {
        setPhase("correct");
        if (data.feedback_de) speak?.(data.feedback_de, "de-DE");
        return;
      }
      // Second miss reveals the answer — keeps the quiz from dead-ending.
      setPhase(attempts >= 1 ? "revealed" : "wrong");
      setAttempts((a) => a + 1);
    } catch (err) {
      console.error("Error checking nursing answer:", err);
      setPhase("pick");
    }
  };

  const next = () => {
    if (isLast) {
      onFinish?.(
        questions.map((q) => ({
          question_uid: q.id,
          answer: firstAnswersRef.current[q.id] ?? null,
        })),
      );
      return;
    }
    setIndex((i) => i + 1);
    setPhase("pick");
    setSelected(null);
    setAttempts(0);
    setTimeLeft(null);
    setReveal(null);
  };

  const optionClass = (opt) => {
    const isPicked = selected === opt;
    if (phase === "pick" || phase === "checking") {
      return isPicked
        ? "border-[#002856] bg-[#edfaff] text-[#002856]"
        : "border-gray-200 bg-white text-gray-800 hover:border-[#002856]/40";
    }
    if (
      (phase === "correct" || phase === "timeout" || phase === "revealed") &&
      opt === reveal?.answer
    ) {
      return "border-[#019035] bg-[#e9f9ee] text-[#019035]";
    }
    if ((phase === "wrong" || phase === "revealed") && isPicked) {
      return "border-[#d92d20] bg-[#fef1f0] text-[#d92d20]";
    }
    return "border-gray-200 bg-white text-gray-500";
  };

  return (
    <div className="w-full max-w-md mx-auto flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={onExit}
          className="w-8 h-8 flex items-center justify-center rounded-full bg-white border border-gray-200 text-gray-600"
        >
          <X className="w-4 h-4" />
        </button>
        <span className="text-xs font-semibold text-gray-500">
          {title} · {index + 1}/{questions.length}
        </span>
        {timeLeft !== null && phase === "pick" ? (
          <span
            className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${
              timeLeft <= 3
                ? "bg-[#fef1f0] text-[#d92d20]"
                : "bg-[#fff4e0] text-[#ac8121]"
            }`}
          >
            <Timer className="w-3.5 h-3.5" />
            {Math.ceil(timeLeft)}s
          </span>
        ) : (
          <span className="w-8" />
        )}
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
        {question.label && (
          <span className="inline-block text-[10px] font-bold uppercase tracking-wide text-[#ac8121] bg-[#fff4e0] px-2 py-1 rounded-full mb-2">
            {question.label}
          </span>
        )}

        {question.image_url && (
          <div className="w-full h-36 rounded-xl overflow-hidden bg-gray-100 mb-3">
            <img
              src={question.image_url}
              alt=""
              className="w-full h-full object-cover"
              loading="eager"
            />
          </div>
        )}

        {question.document && (
          <button
            onClick={() => setOverlayDoc(question.document)}
            className="w-full relative mb-3 text-left"
          >
            <div className="max-h-48 overflow-hidden rounded-lg pointer-events-none">
              <NursingDocumentSheet document={question.document} />
            </div>
            <span className="absolute bottom-2 right-2 flex items-center gap-1 text-[10px] font-bold text-white bg-[#002856]/80 px-2 py-1 rounded-full">
              <Maximize2 className="w-3 h-3" /> Expand
            </span>
          </button>
        )}

        {question.speaker_name && (
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
            {question.speaker_name}
          </p>
        )}
        {question.prompt_de && (
          <p className="text-[17px] font-bold text-[#002856] leading-snug">
            {question.prompt_de}
          </p>
        )}
        {question.prompt_en && (
          <p className="text-[13px] text-gray-500 leading-snug mt-0.5">
            {question.prompt_en}
          </p>
        )}
        {question.question_en && (
          <p className="text-[15px] font-semibold text-gray-800 leading-snug mt-1">
            {question.question_en}
          </p>
        )}

        {question.audio?.text && (
          <button
            onClick={() =>
              speak?.(question.audio.text, question.audio.lang || "de-DE")
            }
            disabled={isLoadingAudio || isSpeaking}
            className={`mt-2 w-10 h-10 flex items-center justify-center rounded-full transition-all ${
              isSpeaking
                ? "bg-[#edb843] text-white animate-pulse"
                : "bg-[#f5f7fa] text-[#002856] border-[1.5px] border-[#e4e9f0]"
            }`}
          >
            {isLoadingAudio ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
          </button>
        )}

        <div className="mt-4 space-y-2">
          {options.map((opt, i) => (
            <button
              key={i}
              onClick={() => {
                if (phase === "pick" || phase === "wrong") {
                  setSelected(opt);
                  if (phase === "wrong") setPhase("pick");
                }
              }}
              disabled={
                phase === "checking" ||
                phase === "correct" ||
                phase === "timeout" ||
                phase === "revealed"
              }
              className={`w-full text-left px-4 py-3 rounded-xl border-2 text-[14px] font-medium transition-all ${optionClass(opt)}`}
            >
              {opt}
            </button>
          ))}
        </div>

        {(phase === "pick" || phase === "checking") && (
          <button
            onClick={checkAnswer}
            disabled={selected === null || phase === "checking"}
            className="mt-4 w-full py-3 rounded-xl bg-[#002856] text-white text-sm font-bold disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {phase === "checking" ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              "Check"
            )}
          </button>
        )}

        {phase === "correct" && (
          <div className="mt-4">
            <div className="flex items-center gap-2 text-[#019035] text-sm font-bold mb-1">
              <Check className="w-4 h-4" /> Correct
            </div>
            {reveal?.feedback_de && (
              <p className="text-[13px] text-gray-700 italic">
                {reveal.feedback_de}
              </p>
            )}
            {reveal?.feedback_en && (
              <p className="text-[12px] text-gray-500">{reveal.feedback_en}</p>
            )}
            <button
              onClick={next}
              className="mt-3 w-full py-3 rounded-xl bg-[#019035] text-white text-sm font-bold"
            >
              {isLast ? "Finish" : "Next"}
            </button>
          </div>
        )}

        {phase === "wrong" && (
          <div className="mt-4">
            <p className="text-[#d92d20] text-sm font-bold mb-2">
              Not quite — try again
            </p>
            <button
              onClick={() => {
                setPhase("pick");
                setSelected(null);
              }}
              className="w-full py-3 rounded-xl bg-[#002856] text-white text-sm font-bold flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-4 h-4" /> Try again
            </button>
          </div>
        )}

        {phase === "revealed" && (
          <div className="mt-4">
            <p className="text-[#d92d20] text-sm font-bold mb-1">
              The correct answer is:
            </p>
            <p className="text-[15px] font-bold text-[#019035]">
              {reveal?.answer}
            </p>
            <button
              onClick={next}
              className="mt-3 w-full py-3 rounded-xl bg-[#002856] text-white text-sm font-bold"
            >
              {isLast ? "Finish" : "Next"}
            </button>
          </div>
        )}

        {phase === "timeout" && (
          <div className="mt-4">
            <p className="text-[#d92d20] text-sm font-bold mb-1">
              Time's up — the answer was:
            </p>
            <p className="text-[15px] font-bold text-[#019035]">
              {reveal?.answer}
            </p>
            <button
              onClick={next}
              className="mt-3 w-full py-3 rounded-xl bg-[#002856] text-white text-sm font-bold"
            >
              {isLast ? "Finish" : "Next"}
            </button>
          </div>
        )}
      </div>

      {overlayDoc &&
        createPortal(
          <div
            className="fixed inset-0 z-[999] bg-black/60 flex items-center justify-center p-4"
            onClick={() => setOverlayDoc(null)}
          >
            <div
              className="bg-white rounded-2xl p-4 max-w-md w-full max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-bold text-[#002856]">
                  {overlayDoc.title_de || "Document"}
                </span>
                <button
                  onClick={() => setOverlayDoc(null)}
                  className="w-7 h-7 flex items-center justify-center rounded-full bg-gray-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <NursingDocumentSheet document={overlayDoc} />
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
