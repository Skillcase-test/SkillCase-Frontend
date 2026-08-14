import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { getExamResult } from "../../api/scholarshipExamApi";
import { useFirstPartyAnalytics } from "../../telemetry/legacyAnalytics";
import ScholarshipLevelPickerModal from "../../components/ScholarshipLevelPickerModal";
import { switchScholarshipToMode } from "../../utils/lgMode";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  Award,
  Play,
  Pause,
  Minus,
  BookOpen,
  Dumbbell,
  Sparkles,
} from "lucide-react";
import mayaThumbsup from "../../assets/onboarding/mayaThumbsup.webp";
import mayaShocked from "../../assets/onboarding/mayaShocked.webp";
import mayaSad from "../../assets/onboarding/mayaSad.webp";
import {
  formatAnswerValue,
  formatCorrectAnswer,
} from "../../utils/scholarshipAnswers";

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
  const googleDriveId = extractDriveFileId(raw);
  if (googleDriveId) {
    return [
      `https://drive.google.com/uc?export=download&id=${googleDriveId}`,
      raw,
    ];
  }
  return [raw];
}

function QuestionAudioPlayer({ src }) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState(false);

  const candidates = getAudioSourceCandidates(src);

  const toggle = () => {
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      audioRef.current.play().catch(() => setError(true));
      setPlaying(true);
    }
  };

  const onEnded = () => setPlaying(false);

  if (!src) return null;
  if (error) {
    return <p className="text-xs text-red-400">Audio unavailable</p>;
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={toggle}
        className="w-10 h-10 rounded-full bg-[#002856] text-white flex items-center justify-center hover:bg-[#003d83] transition shrink-0"
      >
        {playing ? (
          <Pause className="w-4 h-4" />
        ) : (
          <Play className="w-4 h-4 ml-0.5" />
        )}
      </button>
      {candidates.map((candidate, i) => (
        <audio
          key={i}
          ref={i === 0 ? audioRef : undefined}
          src={candidate}
          onEnded={onEnded}
          preload="none"
        />
      ))}
    </div>
  );
}

function CorrectAnswerText({ qData, qType }) {
  const text = formatCorrectAnswer(qData, qType);
  if (text === null || text === undefined || text === "") return null;
  return <span className="font-medium text-green-700">{text}</span>;
}

/** B1-style top navigation row shared by every result state. */
function ResultTopBar({ title }) {
  const navigate = useNavigate();
  return (
    <div className="px-4 py-2.5">
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate("/scholarship")}
          className="flex items-center gap-2 text-sm font-semibold text-[#181d27]"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Back</span>
        </button>
        <span className="text-sm font-semibold text-[#7b7b7b]">{title}</span>
      </div>
    </div>
  );
}

/**
 * Scholarship result screen. Two modes:
 *  - Results released  → full score + answer review (mirrors ExamResult).
 *  - Results awaited   → "results awaited" state with the option to switch to
 *    learning or practicing mode (opens the level-picker modal).
 */
export default function ScholarshipResult() {
  const { testId } = useParams();
  const navigate = useNavigate();
  const analytics = useFirstPartyAnalytics();

  const [loading, setLoading] = useState(true);
  const [resultsAwaited, setResultsAwaited] = useState(false);
  const [error, setError] = useState(null);
  const [exam, setExam] = useState(null);
  const [submission, setSubmission] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [picker, setPicker] = useState(null); // "learn" | "practice" | null
  const user = useSelector((state) => state.auth.user);

  // The level picker exists to replace the placeholder A1 that scholarship
  // onboarding assigns. Anyone who reached the exam from an existing
  // learn/practice account (admin-added candidates, or a candidate who already
  // picked a level once and came back) has a real level, so asking again would
  // demote them — hand them straight back to their mode instead.
  const needsLevel =
    !!user?.scholarship_candidate_at &&
    user?.lg_preferred_mode === "scholarship";

  // Shared by the picker and the skip path: a candidate who never took their
  // free trial sees the trial offer before the hub (same gate as onboarding).
  const goToMode = (mode, freshUser) => {
    const dest = mode === "learn" ? "/learn-german" : "/";
    const target = freshUser || user;
    if (target && !target.trial_taken) {
      navigate("/trial-offer", { replace: true, state: { from: dest } });
      return;
    }
    navigate(dest);
  };

  const handleModeHandoff = async (mode) => {
    if (needsLevel) {
      setPicker(mode);
      return;
    }
    // No level argument: their existing proficiency level stays untouched.
    const freshUser = await switchScholarshipToMode(mode);
    goToMode(mode, freshUser);
  };

  useEffect(() => {
    let cancelled = false;
    const fetchResult = async () => {
      try {
        const res = await getExamResult(testId);
        if (cancelled) return;
        setExam(res.data?.exam);
        setSubmission(res.data?.submission);
        setQuestions(res.data?.questions || []);
        analytics?.capture("scholarship_result_viewed", {
          feature_key: "scholarship_exam",
          exam_id: testId,
          exam_title: res.data?.exam?.title,
          results_visible: true,
        });
      } catch (err) {
        if (cancelled) return;
        if (
          err.response?.status === 403 &&
          err.response?.data?.results_awaited
        ) {
          setResultsAwaited(true);
        } else {
          setError(err.response?.data?.msg || "Failed to load result");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchResult();
    return () => {
      cancelled = true;
    };
  }, [analytics, testId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <ResultTopBar title="Result" />
        <div className="flex-1 flex flex-col items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#002856]" />
          <p className="text-xs text-gray-400 font-medium mt-3">
            Loading result...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <ResultTopBar title="Result" />
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <img
            src={mayaSad}
            alt=""
            className="w-28 h-28 object-contain mb-4 opacity-90"
          />
          <p className="text-gray-700 text-lg font-medium mb-4">{error}</p>
          <button
            onClick={() => navigate("/scholarship")}
            className="px-6 py-2 bg-[#002856] text-white rounded-xl font-semibold"
          >
            Back to Exam
          </button>
        </div>
      </div>
    );
  }

  // ── Results awaited state ───────────────────────────────────────────────
  if (resultsAwaited) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <ResultTopBar title="Scholarship Exam" />

        {/* Banner with white fade */}
        <div className="relative h-[150px] w-full overflow-hidden bg-gradient-to-br from-[#002856] via-[#0a3d7a] to-[#153A71]">
          <div>
            <div className="absolute -right-10 -top-10 w-44 h-44 bg-[#edb843] opacity-10 rounded-full blur-3xl" />
            <div className="absolute -left-12 -bottom-16 w-52 h-52 bg-[#1E76F3] opacity-20 rounded-full blur-3xl" />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-white" />
          </div>
          <img
            src={mayaShocked}
            alt="Maya cheering"
            className="absolute right-6 bottom-0 h-[150px] object-contain drop-shadow-[0_8px_16px_rgba(0,0,0,0.35)]"
          />
        </div>

        {/* Title */}
        <div className="px-4 pt-4 pb-4">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[rgba(237,184,67,0.18)] text-[#ac8121] text-[10px] font-bold uppercase tracking-wider">
            <Sparkles className="w-3 h-3" /> Well done — exam submitted!
          </span>
          <h1 className="text-[26px] font-semibold text-[#002856] leading-[34px] mt-1.5">
            Results awaited
          </h1>
          <p className="text-xs text-black opacity-70 mt-1 leading-relaxed">
            Your answers have been recorded successfully. The scholarship team
            is reviewing submissions and will release results soon.
          </p>
        </div>

        {/* Content */}
        <div className="flex-1 px-4 pb-8">
          <div className="bg-white border border-[#dbdbdb] rounded-xl p-4">
            <p className="text-sm font-bold text-[#181d27] mb-1">
              While you wait…
            </p>
            <p className="text-xs text-[#7b7b7b] mb-4">
              Keep learning or practicing German so you're ready for what's
              next.
            </p>
            <div className="grid grid-cols-1 gap-3">
              <button
                onClick={() => handleModeHandoff("practice")}
                className="w-full p-4 rounded-xl border border-[#dbdbdb] hover:border-[#002856] hover:shadow-md transition flex items-center gap-3 text-left group"
              >
                <span className="w-11 h-11 rounded-xl bg-[#edb843] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Dumbbell className="w-5 h-5 text-[#002856]" />
                </span>
                <span className="flex-1">
                  <span className="block font-semibold text-[#181d27] text-sm">
                    Practice Your German
                  </span>
                  <span className="block text-xs text-[#7b7b7b]">
                    Flashcards, grammar, tests & more
                  </span>
                </span>
                <ChevronRight className="w-5 h-5 text-[#414651]" />
              </button>
            </div>
          </div>

          <button
            onClick={() => navigate("/scholarship")}
            className="w-full mt-4 px-6 py-3 text-[#002856] rounded-xl font-semibold hover:bg-gray-50 transition"
          >
            Back to Scholarship Exam
          </button>
        </div>

        {picker && (
          <ScholarshipLevelPickerModal
            mode={picker}
            onClose={() => setPicker(null)}
            onDone={(freshUser) => goToMode(picker, freshUser)}
          />
        )}
      </div>
    );
  }

  // ── Results released state ──────────────────────────────────────────────
  // score/earned_points are DECIMAL columns — coerce so a string can never leak
  // "83.00000" into the UI.
  const score = Number(submission?.score ?? 0) || 0;
  const earnedPoints = Number(submission?.earned_points ?? 0) || 0;
  const scoreColor =
    score >= 60
      ? "text-green-600"
      : score >= 35
        ? "text-amber-500"
        : "text-red-500";

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <ResultTopBar title="Scholarship Exam" />

      {/* Banner with white fade */}
      <div className="relative h-[140px] w-full overflow-hidden bg-gradient-to-br from-[#002856] via-[#0a3d7a] to-[#153A71]">
        <div>
          <div className="absolute -right-10 -top-10 w-44 h-44 bg-[#edb843] opacity-10 rounded-full blur-3xl" />
          <div className="absolute -left-12 -bottom-16 w-52 h-52 bg-[#1E76F3] opacity-20 rounded-full blur-3xl" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-white" />
        </div>
        <img
          src={mayaThumbsup}
          alt="Maya giving a thumbs up"
          className="absolute right-6 bottom-0 h-[140px] object-contain drop-shadow-[0_8px_16px_rgba(0,0,0,0.35)]"
        />
      </div>

      <div className="flex-1 px-4 pt-4 pb-10">
        {/* Score card */}
        <div className="bg-white border border-[#dbdbdb] rounded-xl px-5 py-6 mb-6 text-center">
          <div className="flex items-center justify-center gap-2 text-[#7b7b7b] text-sm mb-3">
            <Award className="w-4 h-4 text-[#ac8121]" />
            {exam?.title || "Scholarship Exam"}
          </div>
          <div className={`text-6xl font-bold leading-none ${scoreColor}`}>
            {score.toFixed(1)}%
          </div>
          <p className="text-[#7b7b7b] text-sm mt-2">
            {Number.isInteger(earnedPoints)
              ? earnedPoints
              : earnedPoints.toFixed(1)}{" "}
            / {submission?.total_points ?? 0} points
          </p>
          <div className="flex items-center justify-center gap-4 mt-4 text-xs text-[#9ca3af]">
            {submission?.finished_at && (
              <span className="inline-flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                Submitted{" "}
                {new Date(submission.finished_at).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </span>
            )}
          </div>
        </div>

        {/* Answer review — non-answerable blocks (page_break, passage, audio,
            image, content) render as their content, never as questions. Only
            answerable questions are numbered. */}
        <h2 className="text-lg font-bold text-[#181d27] mb-3">Answer Review</h2>
        <div className="space-y-3">
          {(() => {
            let answerableNum = 0;
            return questions.map((q) => {
              const qType = q.question_type;
              const qData = q.question_data;

              // Page break — dashed divider, not a question
              if (qType === "page_break") {
                return (
                  <div
                    key={q.question_id}
                    className="flex items-center gap-3 py-1"
                  >
                    <div className="flex-1 border-t-2 border-dashed border-[#dbdbdb]" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                      Page Break
                    </span>
                    <div className="flex-1 border-t-2 border-dashed border-[#dbdbdb]" />
                  </div>
                );
              }

              // Reading passage — render the passage text
              if (qType === "reading_passage") {
                return (
                  <div
                    key={q.question_id}
                    className="rounded-2xl border border-[#e5e9f0] bg-white p-4 shadow-sm"
                  >
                    <p className="text-[10px] font-bold uppercase tracking-wider text-blue-600 mb-2">
                      Reading Passage
                    </p>
                    <p className="text-sm leading-relaxed text-gray-800 whitespace-pre-wrap break-words">
                      {qData?.passage || qData?.text || ""}
                    </p>
                  </div>
                );
              }

              // Content block — render the informational text
              if (qType === "content_block") {
                return (
                  <div
                    key={q.question_id}
                    className="rounded-2xl border border-[#e5e9f0] bg-white p-4 shadow-sm"
                  >
                    <p className="text-sm leading-relaxed text-gray-800 whitespace-pre-wrap break-words">
                      {qData?.content || qData?.text || ""}
                    </p>
                  </div>
                );
              }

              // Audio block — render the player
              if (qType === "audio_block") {
                return (
                  <div
                    key={q.question_id}
                    className="rounded-2xl border border-[#e5e9f0] bg-white p-4 shadow-sm"
                  >
                    <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600 mb-2">
                      Audio
                    </p>
                    <QuestionAudioPlayer src={q.audio_url} />
                  </div>
                );
              }

              // Image block — render the image centered
              if (qType === "image_block") {
                return (
                  <div
                    key={q.question_id}
                    className="rounded-2xl border border-[#e5e9f0] bg-white p-4 shadow-sm flex justify-center"
                  >
                    {qData?.image_url && (
                      <img
                        src={qData.image_url}
                        alt={qData.alt || ""}
                        style={{ display: "block", maxWidth: "100%" }}
                        className="rounded-lg"
                      />
                    )}
                  </div>
                );
              }

              // Answerable question
              const isCorrect = q.is_correct;
              const userAnswer = q.user_answer;
              const isParagraph = qType === "paragraph";
              answerableNum += 1;

              return (
                <div
                  key={q.question_id}
                  className="rounded-2xl border border-[#e5e9f0] bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <p className="text-sm font-medium text-gray-800 flex-1">
                      <span className="text-gray-400 mr-1.5">
                        {answerableNum}.
                      </span>
                      {qData?.question ||
                        qData?.title ||
                        qData?.text ||
                        "Question"}
                    </p>
                    {!isParagraph &&
                      (isCorrect === true ? (
                        <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                      ) : isCorrect === false ? (
                        <XCircle className="w-5 h-5 text-red-400 shrink-0" />
                      ) : (
                        <Minus className="w-5 h-5 text-gray-300 shrink-0" />
                      ))}
                  </div>

                  <p className="text-xs text-gray-500 mb-1">Your answer</p>
                  <p className="text-sm text-gray-700 mb-2">
                    {formatAnswerValue(userAnswer, qType, qData)}
                  </p>
                  {!isParagraph ? (
                    <>
                      <p className="text-xs text-gray-500 mb-1">
                        Correct answer
                      </p>
                      <CorrectAnswerText qData={qData} qType={qType} />
                    </>
                  ) : (
                    <p className="text-xs text-amber-600">
                      Reviewed manually by the scholarship team
                    </p>
                  )}
                </div>
              );
            });
          })()}
        </div>
      </div>
    </div>
  );
}
