import React, { useState } from "react";
import { Link2, RefreshCw, Video } from "lucide-react";
import { Link } from "react-router-dom";
import { checkInterview, getProgress } from "../../../api/jobScreeningApi";

const InterviewStep = ({ progress, onComplete }) => {
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const handleRefreshStatus = async () => {
    try {
      setRefreshing(true);
      setError("");
      const { data } = await getProgress();
      if (data?.success) {
        onComplete(data.data);
      } else {
        setError("Failed to refresh status");
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || "Failed to sync screening status");
    } finally {
      setRefreshing(false);
    }
  };

  const handleRefreshInterview = async () => {
    try {
      setLoading(true);
      setError("");
      const { data } = await checkInterview();
      if (data?.success) {
        onComplete(data.data);
      } else {
        setError("Interview attempt not detected yet");
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || "Failed to sync interview status");
    } finally {
      setLoading(false);
    }
  };

  const hasInterview = !!progress?.assigned_interview_slug;

  if (!hasInterview) {
    return (
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 sm:p-8 flex flex-col items-center justify-center text-center w-full">
        {/* Visual Pulse Circle */}
        <div className="relative mb-5 flex items-center justify-center">
          <div className="absolute w-16 h-16 bg-blue-50/50 rounded-full blur-xl -z-10" />
          <div className="w-12 h-12 rounded-full bg-blue-50/30 border border-blue-50 flex items-center justify-center text-[#002856] animate-pulse">
            <Video className="w-6 h-6" />
          </div>
        </div>

        <h2 className="text-xl sm:text-2xl font-extrabold text-[#002856] tracking-tight mb-2">
          Preparing Your Interview
        </h2>
        <p className="text-zinc-500 text-xs sm:text-sm max-w-md leading-relaxed mb-6">
          Our recruiting team is setting up your tailored Skillcase interview.
          This will consist of video/audio questions matching your background.
          We will notify you here once it is assigned.
        </p>

        {/* Refresh button */}
        <button
          type="button"
          onClick={handleRefreshStatus}
          disabled={refreshing}
          className="w-full sm:max-w-xs h-11 border-2 border-zinc-200 bg-white text-[#002856] hover:bg-zinc-50 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50 active:scale-[0.99]"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
          <span>Refresh Status</span>
        </button>

        {error && (
          <p className="text-red-500 text-xs font-semibold mt-3">{error}</p>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 sm:p-8 flex flex-col items-center justify-center text-center w-full">
      {/* Icon Row */}
      <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100/50 flex items-center justify-center text-[#002856] mb-4">
        <Video className="w-6 h-6" />
      </div>

      <h2 className="text-xl sm:text-2xl font-extrabold text-[#002856] tracking-tight mb-1.5">
        Skillcase Interview
      </h2>
      <p className="text-zinc-500 text-xs sm:text-sm max-w-md leading-relaxed mb-5">
        Please complete the video interview assigned specifically to you.
      </p>

      {/* Info Block */}
      <div className="w-full sm:max-w-xs bg-slate-50/30 border border-slate-100 rounded-2xl p-4 mb-5 text-left">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
          Assigned Interview
        </span>
        <span className="text-xs sm:text-sm font-bold text-[#002856] truncate block">
          {progress.assigned_interview_title || "Skillcase Screening Interview"}
        </span>
      </div>

      {/* Action Buttons */}
      <div className="w-full flex flex-col items-center gap-3 max-w-xs">
        <Link
          to={`/interview/${progress.assigned_interview_slug}?source=job_screening`}
          state={{
            name: progress.candidate_name,
            email: progress.candidate_email,
            phone: progress.candidate_phone,
          }}
          className="w-full h-11 bg-gradient-to-r from-amber-200 to-amber-300 text-[#002856] border border-[#eec139] hover:from-amber-300 hover:to-amber-400 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-md shadow-amber-200/10 hover:shadow-lg hover:scale-[1.01] active:scale-[0.99] transition-all text-center"
        >
          <Link2 className="w-4 h-4 text-[#002856]" />
          <span>Start Video Interview</span>
        </Link>

        <button
          type="button"
          onClick={handleRefreshInterview}
          disabled={loading}
          className="w-full h-11 border-2 border-zinc-200 bg-white text-[#002856] hover:bg-zinc-50 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all disabled:opacity-50 active:scale-[0.99]"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          <span>I Have Completed the Interview</span>
        </button>

        {error && (
          <p className="text-red-500 text-[11px] font-semibold text-center mt-1">{error}</p>
        )}
      </div>
    </div>
  );
};

export default InterviewStep;
