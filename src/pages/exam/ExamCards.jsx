import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { getVisibleExams } from "../../api/examApi";
import {
  Clock,
  FileText,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Loader2,
  Lock,
  Timer,
} from "lucide-react";

function CountdownTimer({ targetDate }) {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    const calc = () => {
      const now = new Date();
      const target = new Date(targetDate);
      const diff = target.getTime() - now.getTime();
      if (diff <= 0) {
        setTimeLeft("Starting...");
        return;
      }
      const days = Math.floor(diff / 86400000);
      const hours = Math.floor((diff % 86400000) / 3600000);
      const mins = Math.floor((diff % 3600000) / 60000);
      const secs = Math.floor((diff % 60000) / 1000);

      if (days > 0) setTimeLeft(`${days}d ${hours}h ${mins}m`);
      else if (hours > 0) setTimeLeft(`${hours}h ${mins}m ${secs}s`);
      else setTimeLeft(`${mins}m ${secs}s`);
    };

    calc();
    const interval = setInterval(calc, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/20 text-white text-[9px] sm:text-sm font-semibold">
      <Timer className="w-3 h-3" /> Starts in {timeLeft}
    </span>
  );
}

export default function ExamCards() {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [seenResultExamIds, setSeenResultExamIds] = useState(() => {
    try {
      const parsed = JSON.parse(
        localStorage.getItem("seen_exam_results") || "[]",
      );
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    const fetchExams = async () => {
      try {
        const res = await getVisibleExams();
        setExams(res.data?.exams || []);
      } catch (err) {
        console.error("Error fetching exams:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchExams();
  }, []);

  // Re-render every second to update countdowns
  const [, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const markResultSeen = (testId) => {
    setSeenResultExamIds((prev) => {
      if (prev.includes(testId)) return prev;
      const next = [...prev, testId];
      localStorage.setItem("seen_exam_results", JSON.stringify(next));
      return next;
    });
  };

  if (loading) {
    return (
      <div className="col-span-3 flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-[#002856]" />
      </div>
    );
  }

  if (exams.length === 0) return null;

  return (
    <>
      <style>{`@keyframes examResultPulse {0%,100%{transform:scale(1)}50%{transform:scale(1.03)}}`}</style>
      {exams.map((exam) => {
        const now = new Date();
        const availableFrom = exam.available_from
          ? new Date(exam.available_from)
          : null;
        const availableUntil = exam.available_until
          ? new Date(exam.available_until)
          : null;

        const isNotYetOpen = availableFrom && now < availableFrom;
        const isWindowClosed = availableUntil && now > availableUntil;

        const isCompleted = exam.status === "completed";
        const isInProgress = exam.status === "in_progress";
        const isWarnedOut = exam.status === "warned_out";
        const isAutoClosed = exam.status === "auto_closed";
        const canTake =
          !isCompleted &&
          !isWarnedOut &&
          !isAutoClosed &&
          !isNotYetOpen &&
          !isWindowClosed;

        let statusBadge = null;
        let cardBg = "bg-gradient-to-br from-[#002856] to-[#004080]";

        if (isNotYetOpen) {
          statusBadge = <CountdownTimer targetDate={exam.available_from} />;
          cardBg = "bg-gradient-to-br from-slate-600 to-slate-700";
        } else if (isWindowClosed) {
          statusBadge = (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-xs font-semibold">
              <Lock className="w-3 h-3" /> Window Closed
            </span>
          );
          cardBg = "bg-gradient-to-br from-gray-600 to-gray-700";
        } else if (isCompleted) {
          statusBadge = (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-semibold">
              <CheckCircle2 className="w-3 h-3" />{" "}
              {exam.results_visible
                ? `Score: ${parseFloat(exam.score).toFixed(0)}%`
                : "Submitted"}
            </span>
          );
          cardBg = exam.results_visible
            ? "bg-gradient-to-br from-[#002856] to-[#004080]"
            : "bg-gradient-to-br from-gray-600 to-gray-700";
        } else if (isInProgress) {
          statusBadge = (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 text-xs font-semibold">
              <Clock className="w-3 h-3" /> In Progress
            </span>
          );
          cardBg = "bg-gradient-to-br from-[#b45309] to-[#d97706]";
        } else if (isWarnedOut || isAutoClosed) {
          statusBadge = (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-semibold">
              <XCircle className="w-3 h-3" /> Closed
            </span>
          );
          cardBg = "bg-gradient-to-br from-red-700 to-red-800";
        }

        const shouldAnimateResult =
          isCompleted &&
          exam.results_visible &&
          !seenResultExamIds.includes(exam.test_id);

        // Format schedule info
        let scheduleInfo = null;
        if (availableFrom && !isNotYetOpen) {
          const fromStr = availableFrom.toLocaleString(undefined, {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          });
          const untilStr = availableUntil
            ? availableUntil.toLocaleString(undefined, {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })
            : null;
          scheduleInfo = untilStr
            ? `${fromStr} – ${untilStr}`
            : `Opens ${fromStr}`;
        }

        const cardContent = (
          <div
            style={
              shouldAnimateResult
                ? { animation: "examResultPulse 1.2s ease-in-out infinite" }
                : undefined
            }
            className={`${cardBg} rounded-xl p-4 text-white shadow-lg transition-all mt-2 ${
              isNotYetOpen
                ? "opacity-75 cursor-not-allowed"
                : "hover:shadow-xl hover:scale-[1.01] active:scale-[0.99]"
            } ${shouldAnimateResult ? "ring-2 ring-[#002856]/70" : ""}
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className="w-4 h-4 text-yellow-300" />
                  <span className="text-xs font-bold text-yellow-300 uppercase tracking-wider">
                    Exam
                  </span>
                </div>
                <h3 className="text-sm font-bold mb-1">{exam.title}</h3>
                <div className="flex items-center gap-2 text-[10px] sm:text-sm text-white/70">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {exam.duration_minutes} min
                  </span>
                  <span className="flex items-center gap-1">
                    <FileText className="w-3 h-3" /> {exam.total_questions}{" "}
                    questions
                  </span>
                </div>
                {scheduleInfo && (
                  <p className="text-xs text-white/50 mt-1">{scheduleInfo}</p>
                )}
              </div>
              <div className="flex flex-col items-end gap-2">
                {statusBadge}
                {!isNotYetOpen && (
                  <ChevronRight className="w-5 h-5 text-white/50" />
                )}
                {isNotYetOpen && <Lock className="w-5 h-5 text-white/30" />}
              </div>
            </div>
          </div>
        );

        // If not yet open, render as non-clickable div
        if (isNotYetOpen) {
          return (
            <div key={exam.test_id} className="col-span-3">
              {cardContent}
            </div>
          );
        }

        return (
          <Link
            to={
              canTake || isInProgress
                ? `/exam/${exam.test_id}`
                : isCompleted && exam.results_visible
                ? `/exam/${exam.test_id}/result`
                : `/exam/${exam.test_id}`
            }
            onClick={() => {
              if (isCompleted && exam.results_visible) {
                markResultSeen(exam.test_id);
              }
            }}
            key={exam.test_id}
            className="col-span-3"
          >
            {cardContent}
          </Link>
        );
      })}
    </>
  );
}
