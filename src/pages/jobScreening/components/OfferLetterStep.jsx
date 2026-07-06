import React, { useState } from "react";
import { FileDown, CheckCircle2, Award, ShieldCheck, AlertCircle, RefreshCw } from "lucide-react";
import { downloadOfferLetter, getProgress } from "../../../api/jobScreeningApi";

const OfferLetterStep = ({ progress, onComplete }) => {
  const [downloading, setDownloading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      setError("");
      const { data } = await getProgress();
      if (data?.success && onComplete) {
        onComplete(data.data);
      } else {
        setError("Failed to retrieve the download link for your offer letter.");
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

  const handleDownload = async () => {
    try {
      setDownloading(true);
      setError("");
      const { data } = await downloadOfferLetter();
      if (data?.success && data?.downloadUrl) {
        window.open(data.downloadUrl, "_blank");
      } else {
        setError("Failed to retrieve the download link for your offer letter.");
      }
    } catch (err) {
      console.error("Error downloading offer letter:", err);
      setError(
        err.response?.data?.message || "An error occurred while downloading your offer letter."
      );
    } finally {
      setDownloading(false);
    }
  };

  const hasOffer = progress?.offer_letter_url !== null && progress?.offer_letter_url !== undefined;

  if (!hasOffer) {
    return (
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm/30 p-6 sm:p-8 flex flex-col items-center justify-center text-center w-full font-sans">
        <div className="w-14 h-14 rounded-full bg-blue-50/50 flex items-center justify-center text-[#002856] mx-auto mb-5 animate-pulse">
          <FileDown className="w-7 h-7" />
        </div>
        <h2 className="text-xl sm:text-2xl font-extrabold text-[#002856] tracking-tight mb-2">Offer Letter Awaited</h2>
        <p className="text-zinc-500 text-xs sm:text-sm max-w-sm mx-auto leading-relaxed mb-6">
          Congratulations on clearing all the evaluation rounds! Our team is currently preparing your official job offer letter.
          We will notify you here as soon as it is generated and uploaded.
        </p>
        <div className="w-full max-w-xs border border-emerald-100 rounded-2xl p-4 bg-emerald-50/10 mb-6 flex flex-col gap-3.5 text-left">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600 shrink-0" />
            <span className="text-xs font-bold text-slate-800">Background Verification Cleared</span>
          </div>
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-4.5 h-4.5 text-emerald-600 shrink-0" />
            <span className="text-xs font-bold text-slate-800">Language Verification Approved</span>
          </div>
        </div>
        {error && (
          <div className="w-full sm:max-w-xs flex items-start gap-2.5 text-red-500 text-xs font-semibold p-3 bg-red-50/50 rounded-xl border border-red-100 mb-4 text-left">
            <AlertCircle className="w-4.5 h-4.5 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}
        <button
          type="button"
          onClick={handleRefresh}
          disabled={refreshing}
          className="w-full sm:max-w-xs h-11 border-2 border-zinc-200 bg-white text-[#002856] hover:bg-zinc-50 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 active:scale-[0.99] transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
          Refresh Status
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm/30 p-6 sm:p-8 flex flex-col items-center justify-center text-center w-full font-sans">
      <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 mx-auto mb-5">
        <Award className="w-7 h-7" />
      </div>

      <h2 className="text-xl sm:text-2xl font-extrabold text-[#002856] tracking-tight mb-2">Congratulations!</h2>
      <p className="text-zinc-500 text-xs sm:text-sm max-w-sm mx-auto leading-relaxed mb-6">
        You have successfully completed all the steps in our job screening process. Your official job offer letter is ready for review.
      </p>

      <div className="w-full max-w-xs border border-emerald-100 rounded-2xl p-4 bg-emerald-50/10 mb-6 flex flex-col gap-3.5 text-left">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600 shrink-0" />
          <span className="text-xs font-bold text-slate-800">Background Verification Cleared</span>
        </div>
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-4.5 h-4.5 text-emerald-600 shrink-0" />
          <span className="text-xs font-bold text-slate-800">Language Verification Approved</span>
        </div>
      </div>

      {error && (
        <div className="w-full sm:max-w-xs flex items-start gap-2.5 text-red-500 text-xs font-semibold p-3 bg-red-50/50 rounded-xl border border-red-100 mb-4 text-left">
          <AlertCircle className="w-4.5 h-4.5 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <button
        onClick={handleDownload}
        disabled={downloading}
        className="w-full sm:max-w-xs h-11 bg-gradient-to-r from-amber-200 to-amber-300 text-[#002856] border border-[#eec139] hover:from-amber-300 hover:to-amber-400 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-md shadow-amber-200/10 hover:shadow-lg hover:shadow-amber-200/20 active:scale-[0.99] transition-all disabled:opacity-50"
      >
        <FileDown className="w-4 h-4 text-[#002856]" />
        {downloading ? "Preparing Download..." : "Download Offer Letter"}
      </button>
    </div>
  );
};

export default OfferLetterStep;
