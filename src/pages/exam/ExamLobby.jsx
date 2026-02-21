import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getExamInfo } from "../../api/examApi";
import {
  ChevronLeft,
  Clock,
  FileText,
  AlertTriangle,
  ShieldAlert,
  Loader2,
  Play,
} from "lucide-react";

export default function ExamLobby() {
  const { testId } = useParams();
  const navigate = useNavigate();
  const [exam, setExam] = useState(null);
  const [submission, setSubmission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchInfo = async () => {
      try {
        const res = await getExamInfo(testId);
        setExam(res.data?.exam);
        setSubmission(res.data?.submission);
      } catch (err) {
        setError(err.response?.data?.msg || "Failed to load exam info");
      } finally {
        setLoading(false);
      }
    };
    fetchInfo();
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
        <ShieldAlert className="w-16 h-16 text-red-400 mb-4" />
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

  const isCompleted = submission?.status === "completed";
  const isWarnedOut = submission?.status === "warned_out";
  const isAutoClosed = submission?.status === "auto_closed";
  const isInProgress = submission?.status === "in_progress";

  if (isCompleted && exam?.results_visible) {
    navigate(`/exam/${testId}/result`, { replace: true });
    return null;
  }

  const canStart = !isCompleted && !isWarnedOut && !isAutoClosed;

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="px-4 py-3 flex items-center border-b border-gray-200">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 text-sm font-semibold text-[#181d27]"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Back</span>
        </button>
      </div>

      <div className="max-w-lg mx-auto p-6">
        {/* Exam Info Card */}
        <div className="bg-gradient-to-br from-[#002856] to-[#004080] rounded-2xl p-6 text-white mb-6">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-5 h-5 text-yellow-300" />
            <span className="text-xs font-bold text-yellow-300 uppercase tracking-wider">
              Exam
            </span>
          </div>
          <h1 className="text-2xl font-bold mb-2">{exam?.title}</h1>
          {exam?.description && (
            <p className="text-white/70 text-sm mb-4">{exam.description}</p>
          )}
          <div className="flex items-center gap-6 text-sm text-white/80">
            <span className="flex items-center gap-1.5">
              <Clock className="w-4 h-4" /> {exam?.duration_minutes} minutes
            </span>
            <span className="flex items-center gap-1.5">
              <FileText className="w-4 h-4" /> {exam?.total_questions} questions
            </span>
          </div>
        </div>

        {/* Rules */}
        <div className="space-y-3 mb-8">
          <h2 className="text-lg font-bold text-[#002856]">Exam Rules</h2>
          <div className="space-y-2">
            {[
              "Once started, the timer cannot be paused.",
              "You can navigate freely between questions during the exam.",
              "Do NOT switch tabs, minimize the app, or press the back button.",
              "3 violations will automatically close your exam.",
              "The exam will auto-submit when the timer runs out.",
              "Results will be visible only after the admin releases them.",
            ].map((rule, i) => (
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
        </div>

        {/* Status Messages */}
        {isWarnedOut && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl mb-4">
            <p className="text-red-700 font-medium text-sm">
              ⚠️ Your exam was closed due to 3 violations. Please contact your
              admin to reopen it.
            </p>
          </div>
        )}

        {isAutoClosed && (
          <div className="p-4 bg-orange-50 border border-orange-200 rounded-xl mb-4">
            <p className="text-orange-700 font-medium text-sm">
              ⏰ Your exam was auto-closed because time ran out.
            </p>
          </div>
        )}

        {isCompleted && !exam?.results_visible && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl mb-4">
            <p className="text-blue-700 font-medium text-sm">
              ✅ You have completed this exam. Results will be available once
              the admin releases them.
            </p>
          </div>
        )}

        {/* Action Button */}
        {canStart && (
          <button
            onClick={() => navigate(`/exam/${testId}/take`)}
            className="w-full py-4 bg-[#002856] text-white rounded-xl font-bold text-lg flex items-center justify-center gap-3 shadow-lg hover:bg-[#003366] active:scale-[0.98] transition-all"
          >
            <Play className="w-5 h-5 fill-current" />
            {isInProgress ? "Continue Exam" : "Start Exam"}
          </button>
        )}
      </div>
    </div>
  );
}
