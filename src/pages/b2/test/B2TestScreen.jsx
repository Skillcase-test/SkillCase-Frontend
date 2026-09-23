import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Loader2,
  Lock,
  AlertCircle,
} from "lucide-react";
import { getB2TestOverview, startB2ExamSubmission } from "../../../api/b2Api";
import { hapticLight } from "../../../utils/haptics";
import toast from "react-hot-toast";
import { useUsageLimits } from "../../../hooks/useUsageLimits";

const SKILLS = [
  { key: "reading", label: "Reading" },
  { key: "listening", label: "Listening" },
  { key: "writing", label: "Writing" },
  { key: "speaking", label: "Speaking" },
];

const bandColor = (score) =>
  score >= 62 ? "text-green-600" : score >= 42 ? "text-amber-500" : "text-red-500";
const bandBar = (score) =>
  score >= 62 ? "bg-green-500" : score >= 42 ? "bg-amber-400" : "bg-red-500";

const formatDate = (iso) => {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

function ScoreRing({ score }) {
  const size = 72;
  const stroke = 8;
  const radius = (size - stroke) / 2;
  const circumference = radius * 2 * Math.PI;
  const value = Math.max(0, Math.min(100, Number(score) || 0));
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          stroke="#E4E4E7"
          fill="transparent"
          strokeWidth={stroke}
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        <circle
          stroke={value >= 62 ? "#16a34a" : value >= 42 ? "#f59e0b" : "#ef4444"}
          fill="transparent"
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={circumference - (value / 100) * circumference}
          strokeLinecap="round"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-sky-950 text-base font-bold">{value}%</span>
      </div>
    </div>
  );
}

export default function B2TestScreen() {
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [starting, setStarting] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const { getState } = useUsageLimits();
  const examUsageState = getState("B2", "exams");
  const isExamLocked = Boolean(examUsageState?.locked);

  const openUsageLimitModal = (moduleKey, state) => {
    window.dispatchEvent(
      new CustomEvent("skillcase:usage-limit", {
        detail: {
          locked: true,
          reason: "usage_limit",
          module_key: moduleKey,
          level: "B2",
          limit_value: state?.limit_value,
          periods: state?.periods,
          reset_at: state?.reset_at,
          msg: state?.hard_locked
            ? "This feature is currently locked."
            : "Your limit for this feature has been reached.",
        },
      }),
    );
  };

  const fetchOverview = async () => {
    setLoading(true);
    setFetchError(false);
    try {
      const res = await getB2TestOverview();
      setOverview(res.data || null);
    } catch (err) {
      console.error("Error fetching B2 test overview:", err);
      setFetchError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user?.user_id) return;
    fetchOverview();
  }, [user?.user_id]);

  const handleStartTest = async () => {
    if (!overview?.nextPaper || starting) return;
    if (isExamLocked) {
      openUsageLimitModal("exams", examUsageState);
      return;
    }
    setStarting(true);
    try {
      await startB2ExamSubmission(overview.nextPaper.paperId);
      navigate(`/b2/exams/papers/${overview.nextPaper.paperId}/dashboard`);
    } catch (err) {
      console.error("Error starting B2 test:", err);
      const resData = err.response?.data || {};
      if (err.response?.status === 403 && resData.alreadyCompleted) {
        navigate(
          `/b2/exams/papers/${overview.nextPaper.paperId}/congratulations`,
        );
      } else if (err.response?.status !== 402) {
        // 402 usage-limit responses are surfaced globally by the axios
        // interceptor — anything else is a genuine failure.
        toast.error("Failed to start test session. Please try again.");
      }
      setStarting(false);
    }
  };

  const openExercise = (item) => {
    if (!item) return;
    const modState = getState("B2", item.module);
    if (modState?.locked) {
      openUsageLimitModal(item.module, modState);
      return;
    }
    hapticLight();
    navigate(`/b2/${item.module}/${item.exerciseId}`);
  };

  const latest = overview?.latest || null;
  const previousTests = (overview?.history || [])
    .filter((t) => t.submissionId !== latest?.submissionId)
    .slice()
    .reverse();

  return (
    <div className="w-full max-w-md mx-auto min-h-screen bg-white flex flex-col justify-start items-center overflow-hidden shadow-sm relative">
      {/* Header */}
      <div
        className="self-stretch px-4 pb-2.5 flex flex-col justify-start items-start gap-2.5 shrink-0 bg-white"
        style={{ paddingTop: "calc(0.625rem + env(safe-area-inset-top, 0px))" }}
      >
        <div className="self-stretch inline-flex justify-between items-center">
          <button
            onClick={() => navigate("/")}
            className="px-0.5 flex justify-center items-center gap-2 cursor-pointer bg-transparent border-0 outline-none"
          >
            <ChevronLeft className="w-4 h-4 text-slate-900" />
            <span className="text-center text-slate-900 text-sm font-semibold leading-6">
              Back
            </span>
          </button>
          <span className="text-center text-neutral-500 text-sm font-semibold leading-6">
            Your Test
          </span>
        </div>
      </div>

      {loading ? (
        <div className="self-stretch px-4 pt-4 flex flex-col gap-4">
          <div className="h-40 rounded-2xl bg-slate-100 animate-pulse" />
          <div className="h-64 rounded-2xl bg-slate-100 animate-pulse" />
          <div className="h-32 rounded-2xl bg-slate-100 animate-pulse" />
        </div>
      ) : fetchError ? (
        <div className="flex-1 w-full flex flex-col items-center justify-center gap-3 px-6">
          <AlertCircle className="w-6 h-6 text-red-500" />
          <p className="text-slate-500 text-xs font-semibold text-center">
            Couldn&apos;t load your tests. Please check your connection.
          </p>
          <button
            onClick={fetchOverview}
            className="text-[#002856] text-xs font-semibold underline underline-offset-2 bg-transparent border-0 cursor-pointer"
          >
            Try again
          </button>
        </div>
      ) : (
        <div className="self-stretch px-4 pt-2 pb-8 flex flex-col gap-5 overflow-y-auto">
          {/* Hero — next test OR all completed */}
          {overview?.nextPaper ? (
            <div className="w-full rounded-2xl bg-[#0a1f44] px-5 py-5 flex flex-col gap-3">
              <span className="text-amber-400 text-[10px] font-bold tracking-widest uppercase">
                Test {Math.min(overview.completed + 1, overview.total)} of{" "}
                {overview.total}
              </span>
              <div className="flex flex-col gap-1">
                <h2 className="text-white text-xl font-bold leading-7">
                  Take your next test
                </h2>
                <p className="text-white/60 text-xs font-medium leading-4">
                  {overview.nextPaper.durationMinutes ?? 120} minutes ·
                  Reading, Listening, Writing, Speaking
                </p>
              </div>
              <button
                onClick={handleStartTest}
                disabled={starting}
                className="w-full mt-1 py-3 bg-amber-400 hover:bg-amber-300 active:scale-[0.99] disabled:opacity-60 text-[#0a1f44] text-sm font-bold rounded-xl border-0 cursor-pointer flex justify-center items-center gap-2 transition-all"
              >
                {starting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    {overview.nextPaper.inProgress
                      ? "Resume test"
                      : "Start test"}
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          ) : overview?.completed > 0 && overview?.completed >= overview?.total ? (
            <div className="w-full rounded-2xl bg-[#0a1f44] px-5 py-5 flex flex-col gap-3">
              <span className="text-emerald-400 text-[10px] font-bold tracking-widest uppercase">
                All {overview.total} Tests Completed
              </span>
              <div className="flex flex-col gap-1">
                <h2 className="text-white text-xl font-bold leading-7">
                  Great work! You finished every test
                </h2>
                <p className="text-white/60 text-xs font-medium leading-4">
                  Review your performance or choose any exam paper to practice again.
                </p>
              </div>
              <button
                onClick={() => navigate("/b2/exams")}
                className="w-full mt-1 py-3 bg-amber-400 active:scale-[0.99] text-[#002856] text-sm font-bold rounded-xl border border-amber-300 cursor-pointer flex justify-center items-center gap-2 transition-all"
              >
                View Exam Papers
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          ) : null}

          {/* Last test card */}
          {latest ? (
            <div className="w-full rounded-2xl border border-zinc-200 bg-white p-5 flex flex-col gap-4">
              <div
                onClick={() => {
                  hapticLight();
                  setExpanded((v) => !v);
                }}
                className="flex items-center justify-between gap-4 cursor-pointer select-none"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <ScoreRing score={latest.overallScore} />
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <h3 className="text-sky-950 text-base font-bold leading-5">
                      Your last test
                    </h3>
                    <p className="text-neutral-500 text-xs font-medium">
                      Test {latest.testNumber} · {formatDate(latest.finishedAt)}
                    </p>
                  </div>
                </div>
                <div className="p-1 rounded-full text-slate-500 hover:bg-slate-100 transition-colors shrink-0">
                  <ChevronDown
                    className={`w-5 h-5 text-slate-600 transition-transform duration-200 ${
                      expanded ? "rotate-180" : ""
                    }`}
                  />
                </div>
              </div>

              {expanded && (
                <>
                  <div className="flex flex-col gap-3 pt-1">
                    {SKILLS.map(({ key, label }) => {
                      const entry = latest.bySkill?.[key];
                      return (
                        <div key={key} className="flex flex-col gap-1">
                          <div className="flex justify-between items-center">
                            <span className="text-slate-700 text-xs font-semibold">
                              {label}
                            </span>
                            {entry?.measured ? (
                              <span
                                className={`text-xs font-bold ${bandColor(entry.score)}`}
                              >
                                {entry.score}%
                              </span>
                            ) : (
                              <span className="text-neutral-400 text-xs font-medium">
                                Not measured yet
                              </span>
                            )}
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-zinc-100 overflow-hidden">
                            {entry?.measured && (
                              <div
                                className={`h-full rounded-full ${bandBar(entry.score)}`}
                                style={{ width: `${entry.score}%` }}
                              />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {latest.summary && (
                    <p className="text-slate-600 text-xs font-medium leading-4">
                      {latest.summary}
                    </p>
                  )}

                  {/* Locked detailed report */}
                  <button
                    onClick={() =>
                      toast(
                        "A deeper, item-by-item report is planned but not yet available.",
                        { icon: "🔒" },
                      )
                    }
                    className="w-full rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-4 py-3 flex items-center gap-3 cursor-pointer text-left"
                  >
                    <Lock className="w-4 h-4 text-neutral-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sky-950 text-xs font-bold leading-4">
                        Detailed report
                      </p>
                      <p className="text-neutral-500 text-[10px] font-medium leading-4">
                        Item-by-item breakdown for this test
                      </p>
                    </div>
                    <span className="shrink-0 px-2 py-0.5 rounded-md bg-amber-400/15 text-amber-600 text-[9px] font-bold tracking-wide uppercase">
                      Premium
                    </span>
                  </button>
                </>
              )}
            </div>
          ) : (
            <div className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 p-5 flex flex-col items-center gap-2 text-center">
              <p className="text-sky-950 text-sm font-bold">
                You haven&apos;t taken a test yet
              </p>
              <p className="text-neutral-500 text-xs font-medium leading-4">
                Take your first test to see where you stand across Reading,
                Listening, Writing and Speaking.
              </p>
            </div>
          )}

          {/* Practise next */}
          {overview?.practiseNext?.length > 0 && (
            <div className="flex flex-col gap-2.5">
              <h4 className="text-neutral-500 text-[10px] font-bold tracking-widest uppercase">
                Practise next
              </h4>
              {overview.practiseNext.map((item) => (
                <button
                  key={`${item.module}-${item.exerciseId}`}
                  onClick={() => openExercise(item)}
                  className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3.5 flex items-center gap-3 cursor-pointer hover:shadow-md active:scale-[0.99] transition-all text-left"
                >
                  <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                    <span className="text-slate-900 text-sm font-semibold leading-5 truncate">
                      {item.title}
                    </span>
                    <span className="text-neutral-500 text-[11px] font-medium leading-4 truncate">
                      {item.skillLabel}
                      {item.description ? ` · ${item.description}` : ""}
                    </span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-neutral-400 shrink-0" />
                </button>
              ))}
            </div>
          )}

          {/* Previous tests */}
          {previousTests.length > 0 && (
            <div className="flex flex-col gap-2.5">
              <h4 className="text-neutral-500 text-[10px] font-bold tracking-widest uppercase">
                Previous tests
              </h4>
              {previousTests.map((test) => (
                <div
                  key={test.submissionId}
                  className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3.5 flex items-center gap-3"
                >
                  <span
                    className={`text-sm font-bold w-11 shrink-0 ${bandColor(test.overallScore ?? 0)}`}
                  >
                    {test.overallScore ?? 0}%
                  </span>
                  <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                    <span className="text-slate-900 text-sm font-semibold leading-5">
                      Test {test.testNumber}
                    </span>
                    <span className="text-neutral-500 text-[11px] font-medium leading-4">
                      {formatDate(test.finishedAt)}
                    </span>
                  </div>
                  <button
                    onClick={() =>
                      toast(
                        "Item-by-item reports are planned but not yet available.",
                        { icon: "🔒" },
                      )
                    }
                    className="shrink-0 px-2.5 py-1.5 rounded-lg bg-amber-400/15 text-amber-600 text-[10px] font-bold flex items-center gap-1 cursor-pointer border-0"
                  >
                    <Lock className="w-3 h-3" />
                    Report
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
