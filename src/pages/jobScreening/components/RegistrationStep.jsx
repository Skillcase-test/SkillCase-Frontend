import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FileSignature, ArrowRight, RefreshCw } from "lucide-react";
import { checkAgreement, startAgreement, getProgress } from "../../../api/jobScreeningApi";

const RegistrationStep = ({ progress, onComplete }) => {
  const navigate = useNavigate();
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

  const handleStartSigning = async () => {
    try {
      setLoading(true);
      setError("");
      const { data } = await startAgreement();
      if (data?.success) {
        if (data.alreadySigned) {
          const progressRes = await checkAgreement();
          if (progressRes.data?.success) {
            onComplete(progressRes.data.data);
          }
          return;
        }
        navigate(`/terms/sign/${data.token}?source=job_screening`);
      } else {
        setError("Failed to initialize signing process. Please try again.");
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || "An error occurred while starting the signing process.");
    } finally {
      setLoading(false);
    }
  };

  const hasAgreement = !!(progress?.assigned_agreement_template_id || progress?.globalSettings?.default_agreement_template_id);

  if (!hasAgreement) {
    return (
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 sm:p-8 flex flex-col items-center justify-center text-center w-full">
        {/* Visual Pulse Circle */}
        <div className="relative mb-5 flex items-center justify-center">
          <div className="absolute w-16 h-16 bg-blue-50/50 rounded-full blur-xl -z-10" />
          <div className="w-12 h-12 rounded-full bg-blue-50/30 border border-blue-50 flex items-center justify-center text-[#002856] animate-pulse">
            <FileSignature className="w-6 h-6" />
          </div>
        </div>

        <h2 className="text-xl sm:text-2xl font-extrabold text-[#002856] tracking-tight mb-2">
          Preparing Registration Form
        </h2>
        <p className="text-zinc-500 text-xs sm:text-sm max-w-md leading-relaxed mb-6">
          Our team is preparing your registration form.
          We will notify you here once it is ready for signature.
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
        <FileSignature className="w-6 h-6" />
      </div>

      <h2 className="text-xl sm:text-2xl font-extrabold text-[#002856] tracking-tight mb-1.5">
        Registration Form
      </h2>
      <p className="text-zinc-500 text-xs sm:text-sm max-w-md leading-relaxed mb-5">
        We have generated your registration form. Please review and sign it directly inside the app.
      </p>

      {/* Info Block */}
      <div className="w-full sm:max-w-xs bg-slate-50/30 border border-slate-100 rounded-2xl p-4 mb-5 text-left">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
          Document Template
        </span>
        <span className="text-xs sm:text-sm font-bold text-[#002856] truncate block">
          {progress.assigned_agreement_title || "Registration Form"}
        </span>
      </div>

      {/* Action Buttons */}
      <div className="w-full flex flex-col items-center gap-3 max-w-xs">
        <button
          type="button"
          onClick={handleStartSigning}
          disabled={loading}
          className="w-full h-11 bg-gradient-to-r from-amber-200 to-amber-300 text-[#002856] border border-[#eec139] hover:from-amber-300 hover:to-amber-400 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-md shadow-amber-200/10 hover:shadow-lg hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-4 w-4 text-[#002856]" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Preparing Document...
            </span>
          ) : (
            <>
              <span>Start Signing</span>
              <ArrowRight className="w-4 h-4 text-[#002856]" />
            </>
          )}
        </button>

        {error && (
          <p className="text-red-500 text-[11px] font-semibold text-center mt-1">{error}</p>
        )}
      </div>
    </div>
  );
};

export default RegistrationStep;
