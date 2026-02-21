import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getExamResult } from "../../api/examApi";
import {
  ChevronLeft,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  Award,
  Play,
  Pause,
  Volume2,
  Lock,
  Minus,
} from "lucide-react";

function toAlphaLabel(index) {
  let value = index + 1;
  let label = "";
  while (value > 0) {
    const rem = (value - 1) % 26;
    label = String.fromCharCode(65 + rem) + label;
    value = Math.floor((value - 1) / 26);
  }
  return label;
}

function getCompositePrefix(index, mode) {
  if (mode === "none") return "";
  if (mode === "alphabet") return `${toAlphaLabel(index).toLowerCase()}. `;
  return `${index + 1}. `;
}

function extractDriveFileId(url) {
  if (!url) return null;
  try {
    const parsed = new URL(String(url).trim());
    const host = parsed.hostname.toLowerCase();
    if (
      !host.includes("drive.google.com") &&
      !host.includes("drive.usercontent.google.com")
    ) {
      return null;
    }
    const byQuery = parsed.searchParams.get("id");
    if (byQuery) return byQuery;
    const byPath = parsed.pathname.match(/\/file\/d\/([^/]+)/i);
    if (byPath?.[1]) return byPath[1];
    return null;
  } catch {
    return null;
  }
}

function getAudioSourceCandidates(url) {
  if (!url) return [];
  const raw = String(url).trim();
  if (!raw) return [];

  const fileId = extractDriveFileId(raw);
  if (!fileId) return [raw];

  const backendBase = String(import.meta.env.VITE_BACKEND_URL || "").replace(
    /\/$/,
    "",
  );
  const proxyUrl = backendBase
    ? `${backendBase}/exam-audio/proxy?src=${encodeURIComponent(raw)}`
    : "";

  let isDriveViewLink = false;
  try {
    const parsed = new URL(raw);
    const host = parsed.hostname.toLowerCase();
    const path = parsed.pathname.toLowerCase();
    isDriveViewLink =
      host.includes("drive.google.com") && /\/file\/d\/.+\/view/.test(path);
  } catch {
    isDriveViewLink = false;
  }

  const candidates = [
    proxyUrl,
    `https://drive.google.com/uc?export=download&id=${fileId}`,
    `https://drive.usercontent.google.com/download?id=${fileId}&export=download&confirm=t`,
    `https://drive.google.com/uc?export=open&id=${fileId}`,
  ];

  if (!isDriveViewLink) {
    candidates.unshift(raw);
  }

  return candidates
    .filter(Boolean)
    .filter((value, index, arr) => arr.indexOf(value) === index);
}

// Mini audio player for result review
function ResultAudioPlayer({ src }) {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [candidateIndex, setCandidateIndex] = useState(0);
  const candidates = getAudioSourceCandidates(src);

  useEffect(() => {
    setCandidateIndex(0);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
  }, [src]);

  const audioSrc = candidates[candidateIndex] || "";

  if (!audioSrc) return null;

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return "00:00";
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(
      2,
      "0",
    )}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handleSeek = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    if (audioRef.current && duration) {
      audioRef.current.currentTime = Math.max(
        0,
        Math.min(duration, ratio * duration),
      );
    }
  };

  const toggle = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current
          .play()
          .then(() => setIsPlaying(true))
          .catch(() => setIsPlaying(false));
      }
    }
  };

  return (
    <div className="flex items-center gap-2 mb-3">
      <audio
        ref={audioRef}
        src={audioSrc}
        onTimeUpdate={(e) => setCurrentTime(e.target.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.target.duration)}
        onEnded={() => setIsPlaying(false)}
        onError={() => {
          setIsPlaying(false);
          if (candidateIndex < candidates.length - 1) {
            setCandidateIndex((idx) => idx + 1);
          }
        }}
      />
      <button
        onClick={toggle}
        className="w-8 h-8 rounded-full bg-[#002856] text-white flex items-center justify-center shrink-0"
      >
        {isPlaying ? (
          <Pause className="w-3 h-3 fill-current" />
        ) : (
          <Play className="w-3 h-3 fill-current ml-0.5" />
        )}
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between text-[10px] font-medium text-gray-500 mb-1">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
        <div
          className="h-2 bg-gray-200 rounded-full overflow-hidden cursor-pointer"
          onClick={handleSeek}
        >
          <div
            className="h-full bg-[#002856] transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
      <Volume2 className="w-4 h-4 text-gray-400 shrink-0" />
    </div>
  );
}

export default function ExamResult() {
  const { testId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [examData, setExamData] = useState(null);
  const [submission, setSubmission] = useState(null);
  const [questions, setQuestions] = useState([]);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await getExamResult(testId);
        setExamData(res.data?.exam);
        setSubmission(res.data?.submission);
        setQuestions(res.data?.questions || []);
      } catch (err) {
        setError(err.response?.data?.msg || "Failed to load results");
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [testId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="w-8 h-8 animate-spin text-[#002856]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white p-6 text-center">
        <Lock className="w-16 h-16 text-gray-300 mb-4" />
        <p className="text-gray-700 text-lg font-medium mb-4">{error}</p>
        <button
          onClick={() => navigate("/")}
          className="px-6 py-2 bg-[#002856] text-white rounded-xl font-semibold"
        >
          Go Home
        </button>
      </div>
    );
  }

  const score = parseFloat(submission?.score || 0);
  const isPassing = score >= 60;
  const timeTaken =
    submission?.started_at && submission?.finished_at
      ? Math.round(
          (new Date(submission.finished_at) - new Date(submission.started_at)) /
            60000,
        )
      : null;

  // Filter out non-question types for stats
  const answerableQuestions = questions.filter(
    (q) =>
      q.question_type !== "page_break" &&
      q.question_type !== "reading_passage" &&
      q.question_type !== "audio_block" &&
      q.question_type !== "content_block",
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white px-4 py-3 flex items-center border-b border-gray-200 sticky top-0 z-10">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 text-sm font-semibold text-[#181d27]"
        >
          <ChevronLeft className="w-4 h-4" /> Back
        </button>
      </div>

      <div className="max-w-2xl mx-auto p-4">
        {/* Score Card */}
        <div
          className={`rounded-2xl p-6 text-white mb-6 text-center ${
            isPassing
              ? "bg-gradient-to-br from-green-600 to-emerald-700"
              : "bg-gradient-to-br from-red-600 to-rose-700"
          }`}
        >
          <div className="w-20 h-20 mx-auto rounded-full bg-white/20 flex items-center justify-center mb-4">
            <Award className="w-10 h-10" />
          </div>
          <h1 className="text-4xl font-black mb-1">{score.toFixed(0)}%</h1>
          <p className="text-white/80 text-sm font-medium">
            {submission?.earned_points}/{submission?.total_points} points
          </p>
          <p className="text-white/60 text-xs mt-1">{examData?.title}</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-white rounded-xl p-3 text-center border border-gray-100">
            <CheckCircle2 className="w-5 h-5 text-green-500 mx-auto mb-1" />
            <p className="text-lg font-bold text-green-600">
              {answerableQuestions.filter((q) => q.is_correct).length}
            </p>
            <p className="text-xs text-gray-400">Correct</p>
          </div>
          <div className="bg-white rounded-xl p-3 text-center border border-gray-100">
            <XCircle className="w-5 h-5 text-red-500 mx-auto mb-1" />
            <p className="text-lg font-bold text-red-600">
              {answerableQuestions.filter((q) => q.is_correct === false).length}
            </p>
            <p className="text-xs text-gray-400">Wrong</p>
          </div>
          <div className="bg-white rounded-xl p-3 text-center border border-gray-100">
            <Clock className="w-5 h-5 text-blue-500 mx-auto mb-1" />
            <p className="text-lg font-bold text-blue-600">
              {timeTaken ? `${timeTaken}m` : "—"}
            </p>
            <p className="text-xs text-gray-400">Time</p>
          </div>
        </div>

        {/* Question Review */}
        <h2 className="text-lg font-bold text-[#002856] mb-4">
          Review Answers
        </h2>
        <div className="space-y-4">
          {questions
            .filter(
              (q) =>
                q.question_type !== "page_break" &&
                q.question_type !== "reading_passage" &&
                q.question_type !== "audio_block" &&
                q.question_type !== "content_block",
            )
            .map((q, idx) => {
              const isCorrect = q.is_correct === true;
              const isWrong = q.is_correct === false;
              const unanswered =
                q.user_answer === null || q.user_answer === undefined;

              return (
                <div
                  key={q.question_id}
                  className={`bg-white rounded-xl border-2 overflow-hidden ${
                    isCorrect
                      ? "border-green-200"
                      : isWrong
                      ? "border-red-200"
                      : "border-gray-200"
                  }`}
                >
                  {/* Question header */}
                  <div
                    className={`px-4 py-2.5 flex items-center justify-between ${
                      isCorrect
                        ? "bg-green-50"
                        : isWrong
                        ? "bg-red-50"
                        : "bg-gray-50"
                    }`}
                  >
                    <span className="text-sm font-bold text-gray-600">
                      Q{idx + 1}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-gray-400">
                        {q.points_earned || 0}/{q.points} pts
                      </span>
                      {isCorrect ? (
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                      ) : isWrong ? (
                        <XCircle className="w-5 h-5 text-red-500" />
                      ) : (
                        <Minus className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                  </div>

                  <div className="p-4">
                    <ResultAudioPlayer src={q.audio_url} />
                    <p className="text-[15px] font-medium leading-relaxed text-[#181d27] mb-3 whitespace-pre-wrap break-words">
                      {q.question_data.question ||
                        (q.question_type === "composite_question"
                          ? "Answer the following"
                          : "") ||
                        (q.question_type === "dialogue_dropdown"
                          ? "Complete the dialogue"
                          : "")}
                    </p>
                    {renderResultDetail(q)}
                  </div>
                </div>
              );
            })}
        </div>

        {/* Back button */}
        <div className="py-6">
          <button
            onClick={() => navigate("/")}
            className="w-full py-3 bg-[#002856] text-white rounded-xl font-semibold"
          >
            Back to Home
          </button>
        </div>
      </div>
    </div>
  );
}

// RESULT DETAIL RENDERER
function renderResultDetail(q) {
  const qType = q.question_type;
  const qData = q.question_data;
  const userAnswer = q.user_answer;

  switch (qType) {
    case "mcq_single":
    case "mcq":
      return (
        <div className="space-y-2">
          {qData.options?.map((opt, i) => {
            const isCorrectOption = opt === qData.correct;
            const isSelected = userAnswer === i;
            let cls = "border-gray-200 bg-gray-50";
            if (isCorrectOption)
              cls = "border-green-500 bg-green-50 text-green-700";
            else if (isSelected) cls = "border-red-500 bg-red-50 text-red-700";
            return (
              <div
                key={i}
                className={`p-3 rounded-xl border-2 text-sm font-medium ${cls}`}
              >
                <span className="inline-flex items-center gap-2">
                  <span className="w-6 h-6 rounded-md border border-gray-300 bg-white text-[11px] text-gray-600 font-semibold flex items-center justify-center shrink-0">
                    {toAlphaLabel(i)}
                  </span>
                  <span className="break-words break-all">{opt}</span>
                  <span>
                    {isCorrectOption && "✓"}{" "}
                    {isSelected && !isCorrectOption && "✗"}
                  </span>
                </span>
              </div>
            );
          })}
        </div>
      );

    case "mcq_multi": {
      const userArr = Array.isArray(userAnswer) ? userAnswer : [];
      const correctArr = qData.correct || [];
      return (
        <div className="space-y-2">
          {qData.options?.map((opt, i) => {
            const isCorrectOption = correctArr.includes(opt);
            const isSelected = userArr.includes(i);
            let cls = "border-gray-200 bg-gray-50";
            if (isCorrectOption)
              cls = "border-green-500 bg-green-50 text-green-700";
            else if (isSelected) cls = "border-red-500 bg-red-50 text-red-700";
            return (
              <div
                key={i}
                className={`p-3 rounded-xl border-2 text-sm font-medium ${cls}`}
              >
                <span className="inline-flex items-center gap-2">
                  <span className="w-6 h-6 rounded-md border border-gray-300 bg-white text-[11px] text-gray-600 font-semibold flex items-center justify-center shrink-0">
                    {toAlphaLabel(i)}
                  </span>
                  <span className="break-words break-all">{opt}</span>
                  <span>
                    {isCorrectOption && "✓"}{" "}
                    {isSelected && !isCorrectOption && "✗"}
                  </span>
                </span>
              </div>
            );
          })}
        </div>
      );
    }

    case "true_false":
    case "truefalse":
      return (
        <div className="space-y-2">
          {[true, false].map((val, idx) => {
            const isCorrect = val === qData.correct;
            const isSelected = userAnswer === val;
            let cls = "border-gray-200";
            if (isCorrect) cls = "border-green-500 bg-green-50 text-green-700";
            else if (isSelected) cls = "border-red-500 bg-red-50 text-red-700";
            return (
              <div
                key={String(val)}
                className={`p-3 rounded-xl border-2 text-sm font-medium ${cls}`}
              >
                <span className="inline-flex items-center gap-2">
                  <span className="w-6 h-6 rounded-md border border-gray-300 bg-white text-[11px] text-gray-600 font-semibold flex items-center justify-center shrink-0">
                    {toAlphaLabel(idx)}
                  </span>
                  <span>{val ? "True" : "False"}</span>
                  <span>
                    {isCorrect && "✓"} {isSelected && !isCorrect && "✗"}
                  </span>
                </span>
              </div>
            );
          })}
        </div>
      );

    case "fill_typing":
    case "fill_blank_typing":
      return (
        <div className="space-y-2">
          <div
            className={`p-3 rounded-xl border-2 ${
              q.is_correct
                ? "border-green-500 bg-green-50"
                : "border-red-500 bg-red-50"
            }`}
          >
            <span className="text-sm">Your answer: </span>
            <span className="font-medium whitespace-pre-wrap break-words break-all">
              {userAnswer || "(no answer)"}
            </span>
          </div>
          {!q.is_correct && (
            <div className="p-3 rounded-xl border-2 border-green-500 bg-green-50">
              <span className="text-sm text-green-600">Correct: </span>
              <span className="font-medium text-green-700">
                {qData.correct || qData.correct_answer}
              </span>
            </div>
          )}
        </div>
      );

    case "fill_options":
    case "fill_blank_options":
      return (
        <div className="space-y-2">
          {qData.options?.map((opt, i) => {
            const isCorrectOption = opt === qData.correct;
            const isSelected = userAnswer === opt;
            let cls = "border-gray-200";
            if (isCorrectOption)
              cls = "border-green-500 bg-green-50 text-green-700";
            else if (isSelected) cls = "border-red-500 bg-red-50 text-red-700";
            return (
              <div
                key={i}
                className={`p-3 rounded-xl border-2 text-sm font-medium ${cls}`}
              >
                <span className="inline-flex items-center gap-2">
                  <span className="w-6 h-6 rounded-md border border-gray-300 bg-white text-[11px] text-gray-600 font-semibold flex items-center justify-center shrink-0">
                    {toAlphaLabel(i)}
                  </span>
                  <span className="break-words break-all">{opt}</span>
                </span>
              </div>
            );
          })}
        </div>
      );

    case "sentence_ordering":
    case "sentence_reorder": {
      const userOrder = Array.isArray(userAnswer) ? userAnswer : [];
      const correctOrder = qData.correct_order || [];
      return (
        <div className="space-y-2">
          <div
            className={`p-3 rounded-xl border-2 ${
              q.is_correct
                ? "border-green-500 bg-green-50"
                : "border-red-500 bg-red-50"
            }`}
          >
            <span className="text-sm">Your order: </span>
            <span className="font-medium">
              {userOrder.join(" ") || "(no answer)"}
            </span>
          </div>
          {!q.is_correct && (
            <div className="p-3 rounded-xl border-2 border-green-500 bg-green-50">
              <span className="text-sm text-green-600">Correct: </span>
              <span className="font-medium text-green-700">
                {correctOrder.join(" ")}
              </span>
            </div>
          )}
        </div>
      );
    }

    case "sentence_correction":
      return (
        <div className="space-y-2">
          {/* Always show the correct answer at the top */}
          <div className="p-3 rounded-xl border-2 border-green-500 bg-green-50">
            <span className="text-sm text-green-600">Correct: </span>
            <span className="font-medium text-green-800">
              {qData.correct_sentence || qData.correct}
            </span>
          </div>
          {/* User's answer — green if correct, red if wrong */}
          <div
            className={`p-3 rounded-xl border-2 ${
              q.is_correct
                ? "border-green-500 bg-green-50"
                : "border-red-500 bg-red-50"
            }`}
          >
            <span
              className={`text-sm ${
                q.is_correct ? "text-green-600" : "text-red-600"
              }`}
            >
              Your answer:{" "}
            </span>
            <span
              className={`font-medium ${
                q.is_correct ? "text-green-800" : "text-red-800"
              }`}
            >
              <span className="whitespace-pre-wrap break-words break-all">
                {userAnswer || "(no answer)"}
              </span>
            </span>
          </div>
        </div>
      );

    case "composite_question": {
      const items = Array.isArray(qData.items) ? qData.items : [];
      const userAns =
        userAnswer && typeof userAnswer === "object" ? userAnswer : {};
      return (
        <div className="space-y-3">
          {qData.intro_text && (
            <div className="p-3 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-700 whitespace-pre-wrap break-words break-all">
              {qData.intro_text}
            </div>
          )}
          {items.map((item, idx) => {
            const numberingStyle = qData.numbering_style || "number";
            const prefix = getCompositePrefix(idx, numberingStyle);
            const itemType =
              item?.type === "option"
                ? "option"
                : item?.type === "dropdown"
                ? "dropdown"
                : "blank";
            const ans = userAns[idx] ?? userAns[String(idx)];

            if (itemType === "option" || itemType === "dropdown") {
              const isCorrect = Number(ans) === Number(item.correct);
              return (
                <div
                  key={idx}
                  className="p-3 rounded-xl border border-gray-200 bg-white space-y-2"
                >
                  <p className="text-sm font-medium text-gray-700 whitespace-pre-wrap break-words">
                    {prefix}
                    {item.prompt || "Sub question"}
                  </p>
                  <p
                    className={`text-sm font-medium ${
                      isCorrect ? "text-green-700" : "text-red-700"
                    }`}
                  >
                    Your answer:{" "}
                    {ans !== undefined && ans !== null
                      ? `${toAlphaLabel(Number(ans))}. ${
                          (item.options || [])[Number(ans)] || ""
                        }`
                      : "(no answer)"}
                  </p>
                  {!isCorrect && (
                    <p className="text-sm font-medium text-green-700">
                      Correct: {toAlphaLabel(Number(item.correct))}.{" "}
                      {(item.options || [])[Number(item.correct)] || ""}
                    </p>
                  )}
                </div>
              );
            }

            const correctBlanks = Array.isArray(item?.correct)
              ? item.correct
              : [item?.correct || ""];
            const userBlanks = Array.isArray(ans) ? ans : [ans || ""];
            const isCorrect =
              userBlanks.length === correctBlanks.length &&
              correctBlanks.every(
                (value, blankIdx) =>
                  String(userBlanks[blankIdx] || "")
                    .toLowerCase()
                    .trim() ===
                  String(value || "")
                    .toLowerCase()
                    .trim(),
              );

            return (
              <div
                key={idx}
                className="p-3 rounded-xl border border-gray-200 bg-white space-y-2"
              >
                <p className="text-sm font-medium text-gray-700 whitespace-pre-wrap break-words">
                  {prefix}
                  {item.prompt || "Sub question"}
                </p>
                <div className="space-y-1">
                  {correctBlanks.map((correctValue, blankIdx) => {
                    const currentAnswer = userBlanks[blankIdx] || "";
                    const currentCorrect = String(correctValue || "");
                    const currentIsCorrect =
                      String(currentAnswer).toLowerCase().trim() ===
                      currentCorrect.toLowerCase().trim();

                    return (
                      <div key={blankIdx} className="text-sm">
                        <p
                          className={`font-medium whitespace-pre-wrap break-words break-all ${
                            currentIsCorrect ? "text-green-700" : "text-red-700"
                          }`}
                        >
                          Your answer: {currentAnswer || "(no answer)"}
                        </p>
                        {!currentIsCorrect && (
                          <p className="font-medium text-green-700 whitespace-pre-wrap break-words break-all">
                            Correct: {currentCorrect}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      );
    }

    case "matching": {
      const userPairs = Array.isArray(userAnswer) ? userAnswer : [];
      const correctPairs = qData.correct_pairs || [];
      return (
        <div className="space-y-2">
          {qData.left?.map((leftItem, leftIdx) => {
            const userRight = userPairs.find((p) => p[0] === leftIdx)?.[1];
            const correctRight = correctPairs.find(
              (p) => p[0] === leftIdx,
            )?.[1];
            const isCorrectPair = userRight === correctRight;
            return (
              <div key={leftIdx} className="flex items-center gap-2 text-sm">
                <span className="font-medium text-[#002856]">{leftItem}</span>
                <span className="text-gray-400">→</span>
                <span
                  className={`font-medium ${
                    isCorrectPair ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {userRight !== undefined
                    ? qData.right[userRight]
                    : "(not matched)"}
                </span>
                {!isCorrectPair && correctRight !== undefined && (
                  <span className="text-green-600 text-xs">
                    (correct: {qData.right[correctRight]})
                  </span>
                )}
              </div>
            );
          })}
        </div>
      );
    }

    case "dialogue_dropdown":
      return (
        <div className="space-y-3">
          {qData.dialogue?.map((line, lineIdx) => {
            const hasOptions = line.options && line.text === null;
            if (!hasOptions) {
              return (
                <div key={lineIdx} className="flex gap-3 items-baseline">
                  <span className="font-semibold text-gray-700 min-w-[4.5rem] shrink-0">
                    {line.speaker}:
                  </span>
                  <span className="text-gray-600">{line.text}</span>
                </div>
              );
            }
            const userSel = userAnswer?.[lineIdx];
            const isCorrectLine = userSel === line.correct;
            const userText =
              userSel !== undefined ? line.options[userSel] : null;
            const correctText = line.options[line.correct];
            return (
              <div key={lineIdx} className="space-y-1">
                <div className="flex gap-3 items-baseline">
                  <span className="font-semibold text-gray-700 min-w-[4.5rem] shrink-0">
                    {line.speaker}:
                  </span>
                  <span
                    className={`font-medium ${
                      isCorrectLine ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {userText ?? "(no selection)"}
                    {isCorrectLine ? " ✓" : " ✗"}
                  </span>
                </div>
                {!isCorrectLine && (
                  <div className="ml-[4.5rem] px-3 py-1.5 rounded-lg bg-green-50 border border-green-200 text-sm text-green-700 font-medium">
                    ✓ {correctText}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      );

    default:
      return <p className="text-gray-500 text-sm">Unknown question type</p>;
  }
}
