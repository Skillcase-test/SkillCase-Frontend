import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  ChevronLeft,
  Loader2,
  AlertCircle,
  Award,
  ThumbsUp,
  Lightbulb,
} from "lucide-react";
import {
  startB1ExamSubmission,
  getB1ExamSubmissionStatus,
  resetB1ExamSubmission,
} from "../../../api/b1Api";

export default function ExamCongratulations() {
  const navigate = useNavigate();
  const { paperId } = useParams();
  const { user } = useSelector((state) => state.auth);

  const [submissionData, setSubmissionData] = useState(null);
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetError, setResetError] = useState(false);

  const fetchFinalReport = async () => {
    setLoading(true);
    setFetchError(false);
    try {
      // Call startB1ExamSubmission to get or verify the session.
      // For a completed exam the backend returns 403 with alreadyCompleted + submissionId.
      // In both paths we then call getB1ExamSubmissionStatus which returns the same
      // { submission, sections } shape including exam_type — avoids the data-shape mismatch.
      const startRes = await startB1ExamSubmission(paperId);
      const subId = startRes.data.id;

      // Fetch the full status (includes exam_type via JOIN)
      const statusRes = await getB1ExamSubmissionStatus(subId);
      setSubmissionData(statusRes.data.submission);
      setSections(
        Array.isArray(statusRes.data.sections) ? statusRes.data.sections : [],
      );
    } catch (err) {
      // F-H5: Backend returns 403 with alreadyCompleted + submissionId for completed papers
      if (
        err?.response?.status === 403 &&
        err?.response?.data?.alreadyCompleted
      ) {
        try {
          const subId = err.response.data.submissionId;
          const statusRes = await getB1ExamSubmissionStatus(subId);
          // Same shape as happy path — consistent
          setSubmissionData(statusRes.data.submission);
          setSections(
            Array.isArray(statusRes.data.sections)
              ? statusRes.data.sections
              : [],
          );
          return;
        } catch (innerErr) {
          console.error("Error fetching completed exam status:", innerErr);
        }
      }
      console.error("Error fetching final report details:", err);
      setFetchError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user?.user_id || !paperId) return;
    fetchFinalReport();
  }, [user?.user_id, paperId]);

  const handleReattempt = async () => {
    if (!submissionData) return;
    setResetting(true);
    setResetError(false);
    try {
      await resetB1ExamSubmission(submissionData.id);
      navigate(`/b1/exams/papers/${paperId}/dashboard`);
    } catch (err) {
      console.error("Error resetting exam attempt:", err);
      // Show inline error instead of blocking alert()
      setResetError(true);
    } finally {
      setResetting(false);
    }
  };

  const getScoreStyle = (score) => {
    const val = parseInt(score || 0, 10);
    if (val >= 75) {
      return {
        cardBg: "bg-green-700/20",
        textColor: "text-green-700",
      };
    }
    if (val >= 50) {
      return {
        cardBg: "bg-amber-100/60",
        textColor: "text-orange-400",
      };
    }
    return {
      cardBg: "bg-red-100",
      textColor: "text-red-500",
    };
  };

  if (loading) {
    return (
      <div className="w-full max-w-md mx-auto min-h-screen flex items-center justify-center bg-white shadow-sm">
        <Loader2 className="w-8 h-8 animate-spin text-[#002856]" />
      </div>
    );
  }

  if (fetchError || !submissionData) {
    return (
      <div className="w-full max-w-md mx-auto min-h-screen flex flex-col items-center justify-center gap-3 bg-white px-6">
        <AlertCircle className="w-6 h-6 text-red-500" />
        <p className="text-slate-500 text-xs font-semibold text-center">
          Failed to load final report.
        </p>
        <button
          onClick={() => navigate("/b1/exams")}
          className="px-4 py-2 bg-sky-950 text-white rounded-lg text-xs font-semibold border-0 outline-none cursor-pointer"
        >
          Return to Exams
        </button>
      </div>
    );
  }

  // Extract section scores — F-H5: null/undefined score defaults to 0, never NaN
  const getSectionScore = (type) => {
    const sec = sections.find((s) => s.section_type === type);
    const raw = parseFloat(sec?.score);
    return isFinite(raw) ? Math.round(raw) : 0;
  };

  const readingScore = getSectionScore("reading");
  const writingScore = getSectionScore("writing");
  const listeningScore = getSectionScore("listening");
  const speakingScore = getSectionScore("speaking");

  // Compile Went Well / Improve qualitative commentary
  const speakSec = sections.find((s) => s.section_type === "speaking");
  const speakFeedback = speakSec?.feedback || {};

  const overallWentWell =
    speakFeedback.whatWentWell ||
    "Good sentence flow and clear communication in writing and speaking stages.";
  const overallTryToImprove =
    speakFeedback.tryToImprove ||
    "Work on listening comprehension details and expand B1 vocabulary ranges.";

  // Remove hardcoded "TELC" fallback — exam_type is always present via getB1ExamSubmissionStatus JOIN
  const capitalizedExam = String(submissionData.exam_type || "").toUpperCase();

  return (
    <div className="w-full max-w-md mx-auto min-h-screen bg-white flex flex-col justify-start items-center overflow-hidden shadow-sm relative">
      {/* Navigation and Title Bar */}
      <div className="self-stretch px-4 py-2.5 flex flex-col justify-start items-start gap-2.5 shrink-0 bg-white">
        <div className="self-stretch inline-flex justify-between items-center">
          <button
            onClick={() => navigate("/b1/exams")}
            className="px-0.5 flex justify-center items-center gap-2 cursor-pointer bg-transparent border-0 outline-none"
          >
            <ChevronLeft className="w-4 h-4 text-slate-900" />
            <span className="text-slate-900 text-sm font-semibold leading-6">
              Back
            </span>
          </button>
          <span className="text-center text-neutral-500 text-sm font-semibold leading-6">
            {capitalizedExam}
          </span>
        </div>
      </div>

      {/* Main Congratulations scroll body */}
      <div className="flex-1 w-full overflow-y-auto px-4 pb-10 flex flex-col justify-start items-center gap-6">
        <div className="w-full px-5 pt-10 pb-5 bg-black/5 rounded-xl flex flex-col justify-center items-center gap-6 mt-4">
          {/* Header section with trophy */}
          <div className="flex flex-col justify-start items-center gap-3">
            <div className="text-center text-sky-950 text-3xl font-semibold font-['Inter'] leading-9">
              Congratulations
            </div>
            <div className="w-48 text-center text-sky-950 text-base font-semibold font-['Inter'] leading-5">
              You have completed {capitalizedExam} exam papers
            </div>
            <img
              className="w-44 h-40 object-contain mt-3"
              src="/trophy.webp"
              alt="Trophy"
            />
          </div>

          {/* 2x2 grid scorecards */}
          <div className="w-full flex flex-col gap-2">
            <div className="self-stretch inline-flex justify-start items-center gap-2">
              {/* Writing Card */}
              <div
                className={`flex-1 p-2.5 rounded-md flex justify-center items-center gap-2.5 ${
                  getScoreStyle(writingScore).cardBg
                }`}
              >
                <div className="w-full flex flex-col justify-center items-center gap-1">
                  <span className="text-center text-black text-xs font-normal leading-6">
                    Writing score
                  </span>
                  <span
                    className={`text-center text-3xl font-semibold leading-9 ${
                      getScoreStyle(writingScore).textColor
                    }`}
                  >
                    {writingScore}%
                  </span>
                </div>
              </div>

              {/* Speaking Card */}
              <div
                className={`flex-1 p-2.5 rounded-md flex justify-center items-center gap-2.5 ${
                  getScoreStyle(speakingScore).cardBg
                }`}
              >
                <div className="w-full flex flex-col justify-center items-center gap-1">
                  <span className="text-center text-black text-xs font-normal leading-6">
                    Speaking score
                  </span>
                  <span
                    className={`text-center text-3xl font-semibold leading-9 ${
                      getScoreStyle(speakingScore).textColor
                    }`}
                  >
                    {speakingScore}%
                  </span>
                </div>
              </div>
            </div>

            <div className="self-stretch inline-flex justify-start items-center gap-2">
              {/* Reading Card */}
              <div
                className={`flex-1 p-2.5 rounded-md flex justify-center items-center gap-2.5 ${
                  getScoreStyle(readingScore).cardBg
                }`}
              >
                <div className="w-full flex flex-col justify-center items-center gap-1">
                  <span className="text-center text-black text-xs font-normal leading-6">
                    Reading score
                  </span>
                  <span
                    className={`text-center text-3xl font-semibold leading-9 ${
                      getScoreStyle(readingScore).textColor
                    }`}
                  >
                    {readingScore}%
                  </span>
                </div>
              </div>

              {/* Listening Card */}
              <div
                className={`flex-1 p-2.5 rounded-md flex justify-center items-center gap-2.5 ${
                  getScoreStyle(listeningScore).cardBg
                }`}
              >
                <div className="w-full flex flex-col justify-center items-center gap-1">
                  <span className="text-center text-black text-xs font-normal leading-6">
                    Listening score
                  </span>
                  <span
                    className={`text-center text-3xl font-semibold leading-9 ${
                      getScoreStyle(listeningScore).textColor
                    }`}
                  >
                    {listeningScore}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Feedback boxes */}
          <div className="w-full flex flex-col gap-3">
            <div className="self-stretch p-3 bg-white rounded-xl border border-zinc-300 flex justify-start items-start gap-2.5 shadow-sm text-left">
              <ThumbsUp className="w-4 h-4 text-green-700 shrink-0 mt-0.5" />
              <div className="flex-1 flex flex-col justify-start items-start gap-1">
                <div className="text-black text-xs font-semibold">
                  What went well
                </div>
                <div className="text-black text-xs font-normal leading-4">
                  {overallWentWell}
                </div>
              </div>
            </div>

            <div className="self-stretch p-3 bg-white rounded-xl border border-zinc-300 flex justify-start items-start gap-2.5 shadow-sm text-left">
              <Lightbulb className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <div className="flex-1 flex flex-col justify-start items-start gap-1">
                <div className="text-black text-xs font-semibold">
                  Try to improve
                </div>
                <div className="text-black text-xs font-normal leading-4">
                  {overallTryToImprove}
                </div>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="w-full flex flex-col gap-2 mt-2">
            <button
              onClick={() => navigate("/b1/exams")}
              className="w-full py-3 bg-[#0a1f44] hover:bg-[#06142c] active:scale-[0.99] text-white text-base font-semibold rounded-lg shadow-md border-0 cursor-pointer flex justify-center items-center"
            >
              Start Next Exam
            </button>

            <button
              onClick={handleReattempt}
              disabled={resetting}
              className="w-full py-3 bg-transparent hover:bg-black/5 border border-zinc-300 active:scale-[0.99] disabled:opacity-50 text-[#0a1f44] text-base font-semibold rounded-lg transition-all outline-none cursor-pointer flex justify-center items-center"
            >
              {resetting ? (
                <Loader2 className="w-5 h-5 animate-spin text-sky-950" />
              ) : (
                "Reattempt this Exam"
              )}
            </button>
            {resetError && (
              <p className="text-center text-xs text-red-600 mt-1">
                Failed to reset exam. Please try again.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
