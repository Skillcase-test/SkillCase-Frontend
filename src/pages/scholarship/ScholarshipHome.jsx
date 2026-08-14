import React, { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { getScholarshipExam } from "../../api/scholarshipExamApi";
import { useFirstPartyAnalytics } from "../../telemetry/legacyAnalytics";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  Play,
  Hourglass,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  RefreshCw,
  X,
} from "lucide-react";
import mayaWave from "../../assets/onboarding/mayaWave.webp";
import mayaSmiling from "../../assets/onboarding/mayaSmiling.webp";
import mayaThumbsup from "../../assets/onboarding/mayaThumbsup.webp";
import mayaSad from "../../assets/onboarding/mayaSad.webp";

function formatRemaining(seconds) {
  if (seconds == null) return "";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${String(s).padStart(2, "0")}s left`;
}

function formatWindowDate(date) {
  if (!date) return "";
  return date.toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

// Same points the hardcore exam lobby lists, worded for the scholarship exam.
// The modal doubles as the start confirmation — the exam screen begins the
// attempt (and the server timer) the moment it mounts.
const EXAM_RULES = [
  "Once started, the timer cannot be paused.",
  "You can navigate freely between questions during the exam.",
  "Do NOT switch tabs, minimize the app, or press the back button.",
  "3 violations will automatically close your exam.",
  "The exam will auto-submit when the timer runs out.",
  "You get one attempt only — results are visible after the scholarship team releases them.",
];

/**
 * Scholarship exam hub — the candidate's main screen inside the scholarship
 * funnel (B1-style phone column). Shows the single scholarship test with its
 * state:
 *   - not started           → Start button (maya waves)
 *   - in_progress           → Resume button with remaining time (maya smiles)
 *   - completed (results)   → results hidden → "Results awaited" card (maya cheers)
 *   - completed (released)  → link to the result screen (maya thumbs up)
 *   - warned_out/auto_closed→ locked card with admin contact hint (maya sad)
 */
export default function ScholarshipHome() {
  const navigate = useNavigate();
  const analytics = useFirstPartyAnalytics();

  const [exam, setExam] = useState(null);
  const [submission, setSubmission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [blocked, setBlocked] = useState(false);
  const [showRules, setShowRules] = useState(false);

  const fetchExam = useCallback(async () => {
    try {
      const res = await getScholarshipExam();
      setExam(res.data?.exam || null);
      setSubmission(res.data?.submission || null);
      setBlocked(res.data?.blocked === true);
      analytics?.capture("scholarship_home_viewed", {
        feature_key: "scholarship_exam",
        exam_id: res.data?.exam?.test_id,
        exam_title: res.data?.exam?.title,
        submission_status: res.data?.submission?.status || "not_started",
      });
    } catch (err) {
      setError(err.response?.data?.msg || "Failed to load the exam");
    } finally {
      setLoading(false);
    }
  }, [analytics]);

  useEffect(() => {
    fetchExam();
    // fetchExam is stable via useCallback; analytics is a stable mock in tests
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analytics]);

  const refresh = useCallback(() => {
    setError(null);
    setLoading(true);
    fetchExam();
  }, [fetchExam]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center pt-8 px-4">
        <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-sm border border-slate-100 animate-pulse flex flex-col items-center gap-4">
          <div className="w-24 h-24 rounded-full bg-slate-200" />
          <div className="h-6 w-48 bg-slate-200 rounded-lg" />
          <div className="h-4 w-64 bg-slate-100 rounded" />
          <div className="w-full h-12 bg-slate-200 rounded-xl mt-4" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[calc(100vh - 50px)] flex flex-col items-center justify-center bg-white p-6 text-center">
        <img
          src={mayaSad}
          alt=""
          className="w-28 h-28 object-contain mb-4 opacity-90"
        />
        <p className="text-gray-700 text-lg font-medium mb-4">{error}</p>
        <button
          onClick={refresh}
          className="inline-flex items-center gap-2 px-6 py-2 bg-[#002856] text-white rounded-xl font-semibold"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>
    );
  }

  if (!exam) {
    return (
      <div className="min-h-[75vh] flex flex-col items-center justify-center bg-white p-6 text-center">
        <img
          src={blocked ? mayaSad : mayaWave}
          alt=""
          className="w-28 h-28 object-contain mb-4 opacity-90"
        />
        <p className="text-gray-700 text-lg font-medium mb-2">
          {blocked ? "Your exam access was removed" : "No scholarship exam yet"}
        </p>
        <p className="text-gray-500 text-sm mb-4">
          {blocked
            ? "The scholarship team has removed your access to this exam. Contact them if you think this is a mistake."
            : "The scholarship exam has not been announced. Please check back later."}
        </p>
        <button
          onClick={refresh}
          className="inline-flex items-center gap-2 px-6 py-2 bg-[#002856] text-white rounded-xl font-semibold"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>
    );
  }

  const status = submission?.status || "not_started";
  const isCompleted = status === "completed";
  const isInProgress = status === "in_progress";
  const isLocked = status === "warned_out" || status === "auto_closed";
  const resultsReleased = isCompleted && exam.results_visible;

  // Scheduling window. The server enforces this on start AND resume, so the CTA
  // must be hidden outside the window for both.
  const now = Date.now();
  const opensAt = exam.available_from ? new Date(exam.available_from) : null;
  const closesAt = exam.available_until ? new Date(exam.available_until) : null;
  const notYetOpen = opensAt && opensAt.getTime() > now;
  const windowClosed = closesAt && closesAt.getTime() < now;

  const canStart =
    (status === "not_started" || status === "in_progress") &&
    !notYetOpen &&
    !windowClosed;

  // Maya pose per state
  let mascot = mayaWave;
  let mascotAlt = "Maya waving";
  if (isInProgress) {
    mascot = mayaSmiling;
    mascotAlt = "Maya smiling";
  } else if (isCompleted && resultsReleased) {
    mascot = mayaThumbsup;
    mascotAlt = "Maya giving a thumbs up";
  } else if (isCompleted) {
    mascot = mayaThumbsup;
    mascotAlt = "Maya cheering";
  } else if (status === "warned_out" || status === "auto_closed") {
    mascot = mayaSad;
    mascotAlt = "Maya looking sad";
  } else if (windowClosed) {
    mascot = mayaSad;
    mascotAlt = "Maya looking sad";
  }

  const startExam = () => {
    setShowRules(false);
    analytics?.capture("scholarship_start_requested", {
      feature_key: "scholarship_exam",
      exam_id: exam.test_id,
      exam_title: exam.title,
    });
    navigate(`/scholarship/${exam.test_id}/take`);
  };

  const statusMeta = isCompleted
    ? resultsReleased
      ? {
          icon: <CheckCircle2 className="w-5 h-5 text-[#019035]" />,
          title: "Your results are out!",
          sub: "View your score and detailed answers.",
          action: (
            <button
              onClick={() => navigate(`/scholarship/${exam.test_id}/result`)}
              className="inline-flex justify-center items-center gap-1.5 px-4 py-2.5 bg-[#002856] text-white rounded-xl text-sm font-semibold hover:bg-[#003d83] transition w-full"
            >
              View Result <ChevronRight className="w-4 h-4" />
            </button>
          ),
        }
      : {
          icon: <Hourglass className="w-5 h-5 text-[#ac8121]" />,
          title: "Exam submitted — results awaited",
          sub: "Results will appear here once the scholarship team releases them.",
          action: (
            <button
              onClick={() => navigate(`/scholarship/${exam.test_id}/result`)}
              className="inline-flex justify-center items-center gap-1.5 px-4 py-2.5 border border-[#002856] text-white bg-[#002856] rounded-xl text-sm font-semibold w-full"
            >
              View Status <ChevronRight className="w-4 h-4" />
            </button>
          ),
        }
    : isLocked
      ? {
          icon: <AlertTriangle className="w-5 h-5 text-red-400" />,
          title:
            status === "warned_out"
              ? "Exam closed due to warnings"
              : "Exam auto-closed (time expired)",
          sub:
            status === "warned_out"
              ? "Your exam was closed after 3 violations. Contact the scholarship team to reopen."
              : "Your exam time ran out. Contact the scholarship team to reopen.",
          action: null,
        }
      : notYetOpen
        ? {
            icon: <Hourglass className="w-5 h-5 text-[#ac8121]" />,
            title: "Exam not open yet",
            sub: `This exam opens on ${formatWindowDate(opensAt)}. Come back then to start.`,
            action: null,
          }
        : windowClosed
          ? {
              icon: <AlertTriangle className="w-5 h-5 text-red-400" />,
              title: "Exam window has closed",
              sub: `The window closed on ${formatWindowDate(closesAt)}. Contact the scholarship team if you missed it.`,
              action: null,
            }
          : isInProgress
            ? null
            : {
                icon: <CheckCircle2 className="w-5 h-5 text-[#019035]" />,
                title: "Ready when you are",
                sub: closesAt
                  ? `Read the instructions and start when you are ready. Open until ${formatWindowDate(closesAt)}.`
                  : "Read the instructions and start when you are ready.",
                action: null,
              };

  return (
    <div className="min-h-[calc(100vh-180px)] bg-white flex flex-col">
      {/* Banner with white fade */}
      <div className="relative h-[150px] w-full overflow-hidden bg-gradient-to-br from-[#002856] via-[#0a3d7a] to-[#153A71] mt-1">
        <div>
          <div className="absolute -right-10 -top-10 w-44 h-44 bg-[#edb843] opacity-10 rounded-full blur-3xl" />
          <div className="absolute -left-12 -bottom-16 w-52 h-52 bg-[#1E76F3] opacity-20 rounded-full blur-3xl" />
          <div className="absolute inset-0 mt-4 bg-gradient-to-b from-transparent to-white" />
        </div>
        <img
          src={mascot}
          alt={mascotAlt}
          className="absolute right-6 bottom-0 h-[150px] object-contain drop-shadow-[0_8px_16px_rgba(0,0,0,0.35)]"
        />
      </div>

      {/* Title */}
      <div className="px-4 pt-4 pb-4">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[rgba(237,184,67,0.18)] text-[#ac8121] text-[10px] font-bold uppercase tracking-wider">
            <Sparkles className="w-3 h-3" /> Scholarship Exam
          </span>
        </div>
        <h1 className="text-[26px] font-semibold text-[#002856] leading-[34px]">
          {exam.title}
        </h1>
        <p className="text-xs text-black opacity-70 mt-1">
          One attempt per candidate · take it when you're ready
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 px-4 space-y-3 pb-8">
        {/* In-progress meta */}
        {isInProgress && (
          <div className="flex items-center justify-between gap-2 bg-white border border-[#dbdbdb] rounded-xl px-4 py-3">
            <span className="text-sm text-gray-600">
              {exam.total_questions || 0} questions · {exam.duration_minutes}{" "}
              minutes
            </span>
            <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#002856]">
              <Hourglass className="w-4 h-4" />
              {submission.remaining_seconds != null &&
                formatRemaining(submission.remaining_seconds)}
            </span>
          </div>
        )}

        {/* Status card */}
        {statusMeta && (
          <div className="bg-white border border-[#dbdbdb] rounded-xl px-4 py-5">
            <div className="flex items-center gap-3">
              <span className="w-11 h-11 rounded-xl bg-[#f0f0f0] flex items-center justify-center shrink-0">
                {statusMeta.icon}
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-[#181d27] text-sm leading-snug">
                  {statusMeta.title}
                </p>
                <p className="text-xs text-[#7b7b7b] mt-0.5 leading-relaxed">
                  {statusMeta.sub}
                </p>
              </div>
            </div>
            {statusMeta.action && (
              <div className="mt-4">{statusMeta.action}</div>
            )}
          </div>
        )}

        {/* CTA */}
        {canStart && (
          <button
            onClick={() => setShowRules(true)}
            className="w-full px-6 py-3.5 bg-gradient-to-r from-[#edb843] to-[#e0a92e] text-[#002856] rounded-xl font-bold text-base shadow-md hover:opacity-95 active:scale-[0.99] transition flex items-center justify-center gap-2"
          >
            <Play className="w-5 h-5" />
            {isInProgress ? "Resume Exam" : "Start Exam"}
            <ChevronRight className="w-4 h-4" />
          </button>
        )}

        {isInProgress && (
          <p className="text-xs text-[#7b7b7b] text-center pt-1">
            Tip: do not refresh or switch tabs — repeated violations auto-close
            the exam.
          </p>
        )}

        {/* Stat chips */}
        <div className="grid grid-cols-3 gap-2.5 pt-3">
          <div className="bg-[#f6f8fc] border border-[#e5e9f0] rounded-xl px-3 py-3 text-center">
            <p className="text-lg font-bold text-[#002856] leading-none">
              {exam.duration_minutes}
            </p>
            <p className="text-[10px] text-[#7b7b7b] uppercase tracking-wider mt-1">
              Minutes
            </p>
          </div>
          <div className="bg-[#f6f8fc] border border-[#e5e9f0] rounded-xl px-3 py-3 text-center">
            <p className="text-lg font-bold text-[#002856] leading-none">
              {exam.total_questions || 0}
            </p>
            <p className="text-[10px] text-[#7b7b7b] uppercase tracking-wider mt-1">
              Questions
            </p>
          </div>
          <div className="bg-[#f6f8fc] border border-[#e5e9f0] rounded-xl px-3 py-3 text-center">
            <p className="text-lg font-bold text-[#002856] leading-none">1</p>
            <p className="text-[10px] text-[#7b7b7b] uppercase tracking-wider mt-1">
              Attempt
            </p>
          </div>
        </div>
      </div>

      {/* Instructions + start confirmation. Portalled: the app shell translates
          its content while pull-to-refresh is armed, which would break a fixed
          overlay rendered inside it. */}
      {showRules &&
        createPortal(
          <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4">
            <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[90vh] flex flex-col">
              <div className="px-5 pt-5 pb-3 flex items-start justify-between gap-3 shrink-0">
                <div>
                  <h2 className="text-lg font-bold text-[#002856]">
                    Exam Instructions
                  </h2>
                  <p className="text-xs text-[#7b7b7b] mt-0.5">
                    {exam.duration_minutes} minutes ·{" "}
                    {exam.total_questions || 0} questions · 1 attempt
                  </p>
                </div>
                <button
                  onClick={() => setShowRules(false)}
                  aria-label="Close"
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="px-5 space-y-2 overflow-y-auto">
                {EXAM_RULES.map((rule, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl"
                  >
                    <span className="w-6 h-6 rounded-full bg-[#002856] text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <p className="text-sm text-gray-700">{rule}</p>
                  </div>
                ))}
              </div>

              <div className="p-5 pt-4 shrink-0 space-y-2">
                <button
                  onClick={startExam}
                  className="w-full px-6 py-3.5 bg-gradient-to-r from-[#edb843] to-[#e0a92e] text-[#002856] rounded-xl font-bold text-base shadow-md active:scale-[0.99] transition flex items-center justify-center gap-2"
                >
                  <Play className="w-5 h-5" />
                  {isInProgress ? "I understand, resume" : "I understand, start"}
                </button>
                <button
                  onClick={() => setShowRules(false)}
                  className="w-full py-2.5 text-sm font-semibold text-[#7b7b7b]"
                >
                  Not now
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
