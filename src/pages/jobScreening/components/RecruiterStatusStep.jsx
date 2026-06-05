import React, { useState } from "react";
import { Clock, RefreshCw, ArrowRight, AlertCircle } from "lucide-react";
import { getProgress, skipRecruiterStatus } from "../../../api/jobScreeningApi";

const RecruiterStatusStep = ({ progress, onComplete }) => {
  const [refreshing, setRefreshing] = useState(false);
  const [skipping, setSkipping] = useState(false);
  const [error, setError] = useState("");

  const maskEmail = (email) => {
    if (!email) return "";
    const [before, after] = email.split("@");
    if (!before || !after) return email;
    const keep = Math.min(3, before.length);
    return `${before.slice(0, keep)}${"*".repeat(Math.max(0, before.length - keep))}@${after}`;
  };

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      setError("");
      const { data } = await getProgress();
      if (data?.success && onComplete) {
        onComplete(data.data);
      } else {
        setError("Failed to sync progress.");
      }
    } catch (err) {
      console.error("Error refreshing progress:", err);
      setError(
        err.response?.data?.message || "An error occurred while syncing progress."
      );
    } finally {
      setRefreshing(false);
    }
  };

  const handleSkip = async () => {
    try {
      setSkipping(true);
      setError("");
      const { data } = await skipRecruiterStatus();
      if (data?.success && onComplete) {
        onComplete(data.data);
      } else {
        setError("Failed to proceed to the next stage.");
      }
    } catch (err) {
      console.error("Error skipping step:", err);
      setError(
        err.response?.data?.message || "An error occurred while trying to skip this stage."
      );
    } finally {
      setSkipping(false);
    }
  };

  const recruiterShares = progress?.recruiter_shares || [];
  const visibleShares = recruiterShares.filter((rec) => rec.is_visible);

  const getStatusConfig = (stage) => {
    switch (stage) {
      case "scheduled_interview":
      case "shortlisted":
        return {
          barColor: "bg-emerald-500",
          dotColor: "bg-emerald-500",
          textColor: "text-emerald-700",
          text: "Shortlisted for Interview"
        };
      case "rejected":
        return {
          barColor: "bg-rose-500",
          dotColor: "bg-rose-500",
          textColor: "text-rose-700",
          text: "Application Closed"
        };
      case "viewed":
        return {
          barColor: "bg-blue-500",
          dotColor: "bg-blue-500",
          textColor: "text-blue-700",
          text: "Under Review"
        };
      default:
        return {
          barColor: "bg-slate-300",
          dotColor: "bg-slate-400",
          textColor: "text-slate-600",
          text: "Submitted for Review"
        };
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 sm:p-8 flex flex-col w-full font-sans text-left">
      <div className="mb-6">
        <h2 className="text-xl sm:text-2xl font-extrabold text-[#002856] tracking-tight">Partner Review Status</h2>
        <p className="text-zinc-500 text-xs sm:text-sm mt-1.5 leading-relaxed">
          Your profile has been forwarded to our verified corporate recruitment partners for evaluation. Below is the live status of their review.
        </p>
      </div>

      {error && (
        <div className="flex items-start gap-2.5 text-red-600 text-xs font-semibold p-3 bg-red-50 rounded-xl border border-red-100 mb-5">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Recruiter List */}
      <div className="space-y-4 mb-8">
        {visibleShares.length === 0 ? (
          <div className="p-6 border border-dashed border-slate-150 bg-slate-50/30 rounded-2xl text-center flex flex-col items-center justify-center">
            <Clock className="w-8 h-8 text-slate-400 mb-2" />
            <p className="text-slate-700 text-xs font-bold">Awaiting Corporate Review</p>
            <p className="text-slate-400 text-[10px] mt-1 max-w-xs leading-relaxed">
              Your profile is currently being prepared for matching with recruitment partners. Updates will appear here in real-time.
            </p>
          </div>
        ) : (
          visibleShares.map((rec) => {
            const config = getStatusConfig(rec.stage);
            return (
              <div
                key={rec.account_id}
                className="relative pl-5 pr-4 py-4 bg-white border border-slate-100 rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.01)] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 overflow-hidden transition-all duration-200 hover:border-slate-200"
              >
                {/* Left Accent Bar */}
                <div className={`absolute left-0 top-0 bottom-0 w-[4px] ${config.barColor}`} />

                <div className="flex flex-col gap-0.5">
                  <span className="text-[9px] uppercase font-extrabold tracking-wider text-slate-400">
                    Corporate Partner
                  </span>
                  <span className="text-xs font-extrabold text-[#002856] truncate max-w-[240px] sm:max-w-md">
                    {maskEmail(rec.recruiter_email)}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 sm:text-right">
                  <span className={`w-1.5 h-1.5 rounded-full ${config.dotColor}`} />
                  <span className={`text-[11px] font-bold ${config.textColor}`}>
                    {config.text}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-slate-100">
        <button
          type="button"
          onClick={handleSkip}
          disabled={skipping || refreshing}
          className="w-full sm:flex-1 h-11 sm:h-12 bg-gradient-to-r from-amber-200 to-amber-300 text-[#002856] border border-[#eec139] hover:from-amber-300 hover:to-amber-400 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-sm hover:shadow active:scale-[0.99] transition-all duration-150 disabled:opacity-50"
        >
          {skipping ? "Loading..." : "Skip Step & Proceed"}
          <ArrowRight className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={handleRefresh}
          disabled={refreshing || skipping}
          className="w-full sm:w-auto px-5 h-11 sm:h-12 border border-slate-200 bg-white text-[#002856] hover:bg-slate-50 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-sm active:scale-[0.99] transition-all duration-150 disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      <p className="text-slate-400 text-[10px] text-center mt-3 leading-relaxed">
        You can proceed to the next stage of screening. Recruiters will continue evaluating your profile in the background.
      </p>
    </div>
  );
};

export default RecruiterStatusStep;
