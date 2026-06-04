import React, { useState } from "react";
import {
  Upload,
  FileText,
  AlertCircle,
  X,
  ShieldCheck,
  RefreshCw,
} from "lucide-react";
import { uploadProfileDocs, getProgress } from "../../../api/jobScreeningApi";

const ProfileCompletionStep = ({ progress, onComplete }) => {
  const [resume, setResume] = useState(null);
  const [cert, setCert] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const handleRefresh = async () => {
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
      setError(err.response?.data?.message || "Failed to sync status");
    } finally {
      setRefreshing(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!resume || !cert) {
      setError("Please select both your resume and language certificate PDFs");
      return;
    }
    setError("");
    setLoading(true);

    const formData = new FormData();
    formData.append("resume", resume);
    formData.append("certificate", cert);

    try {
      const { data } = await uploadProfileDocs(formData);
      if (data?.success) {
        onComplete(data.data);
      } else {
        setError("Failed to upload profile documents");
      }
    } catch (err) {
      console.error(err);
      setError(
        err.response?.data?.message || "Error occurred while uploading files",
      );
    } finally {
      setLoading(false);
    }
  };

  const isUnderReview =
    progress?.resume_url &&
    progress?.lang_cert_url &&
    !progress?.email_verified;

  if (isUnderReview) {
    return (
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm/30 p-6 sm:p-8 flex flex-col items-center justify-center text-center w-full">
        {/* Previous Gold Shield Icon */}
        <div className="w-14 h-14 rounded-full bg-amber-50 flex items-center justify-center text-amber-500 mx-auto mb-5">
          <svg
            className="w-7 h-7"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
            />
          </svg>
        </div>

        <h2 className="text-xl sm:text-2xl font-extrabold text-[#002856] tracking-tight mb-2">
          Profile Under Review
        </h2>
        <p className="text-zinc-500 text-xs sm:text-sm max-w-md mb-6 leading-relaxed">
          Thank you for submitting your documents. We have successfully received
          your resume and language certificate. Our team is currently verifying
          your details. We will notify you once verification is completed.
        </p>

        {/* Verification Info Badges */}
        <div className="w-full flex items-center justify-center gap-6 text-xs text-slate-400 font-bold border-t border-b border-slate-100 py-3 mb-2">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
            German Standards Sync
          </span>
          <span className="h-4 w-px bg-slate-200" />
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-[#002856] shrink-0" />
            Recruiter Match Prep
          </span>
        </div>

        {/* Refresh button */}
        <button
          type="button"
          onClick={handleRefresh}
          disabled={refreshing}
          className="w-full sm:max-w-xs h-11 border-2 border-zinc-200 bg-white text-[#002856] hover:bg-zinc-50 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50 mt-4 active:scale-[0.99]"
        >
          <RefreshCw
            className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`}
          />
          <span>Refresh Verification Status</span>
        </button>

        {error && (
          <p className="text-red-500 text-xs font-semibold mt-3">{error}</p>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm/30 p-6 sm:p-8 w-full font-sans">
      <div className="text-center max-w-md mx-auto mb-6">
        <h2 className="text-xl sm:text-2xl font-extrabold text-[#002856] tracking-tight">
          Complete Your Profile
        </h2>
        <p className="text-zinc-500 text-xs sm:text-sm mt-1.5">
          Upload your credentials to start your official job evaluations.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-4 max-w-md mx-auto"
      >
        {/* Resume Upload Horizontal Row */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-slate-700">
            Resume (PDF only)
          </label>
          <div className="relative border border-slate-100 hover:border-slate-300 rounded-xl p-3.5 flex items-center justify-between bg-slate-50/20 hover:bg-slate-50/50 transition-all duration-200 cursor-pointer">
            <input
              type="file"
              accept=".pdf"
              onChange={(e) => setResume(e.target.files?.[0] || null)}
              className="absolute inset-0 opacity-0 cursor-pointer z-10"
            />
            <div className="flex items-center gap-3 min-w-0 pr-4">
              <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center text-[#002856] shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div className="min-w-0 text-left">
                {resume ? (
                  <>
                    <p className="text-xs font-bold text-slate-800 truncate">
                      {resume.name}
                    </p>
                    <p className="text-[10px] text-zinc-400 font-medium">
                      {(resume.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-xs font-bold text-slate-700">
                      Select Resume File
                    </p>
                    <p className="text-[10px] text-zinc-400 font-medium">
                      PDF up to 10MB
                    </p>
                  </>
                )}
              </div>
            </div>
            {resume ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  setResume(null);
                }}
                className="w-6 h-6 rounded-full bg-slate-100 hover:bg-red-50 text-slate-400 hover:text-red-500 flex items-center justify-center transition-colors shrink-0 z-20"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : (
              <Upload className="w-4.5 h-4.5 text-slate-400 shrink-0" />
            )}
          </div>
        </div>

        {/* Certificate Upload Horizontal Row */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-slate-700">
            Language Certificate (PDF only)
          </label>
          <div className="relative border border-slate-100 hover:border-slate-300 rounded-xl p-3.5 flex items-center justify-between bg-slate-50/20 hover:bg-slate-50/50 transition-all duration-200 cursor-pointer">
            <input
              type="file"
              accept=".pdf"
              onChange={(e) => setCert(e.target.files?.[0] || null)}
              className="absolute inset-0 opacity-0 cursor-pointer z-10"
            />
            <div className="flex items-center gap-3 min-w-0 pr-4">
              <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center text-[#002856] shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div className="min-w-0 text-left">
                {cert ? (
                  <>
                    <p className="text-xs font-bold text-slate-800 truncate">
                      {cert.name}
                    </p>
                    <p className="text-[10px] text-zinc-400 font-medium">
                      {(cert.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-xs font-bold text-slate-700">
                      Select Certificate File
                    </p>
                    <p className="text-[10px] text-zinc-400 font-medium">
                      PDF up to 10MB
                    </p>
                  </>
                )}
              </div>
            </div>
            {cert ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  setCert(null);
                }}
                className="w-6 h-6 rounded-full bg-slate-100 hover:bg-red-50 text-slate-400 hover:text-red-500 flex items-center justify-center transition-colors shrink-0 z-20"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : (
              <Upload className="w-4.5 h-4.5 text-slate-400 shrink-0" />
            )}
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-2.5 text-red-500 text-xs font-semibold p-3 bg-red-50/50 rounded-xl border border-red-100">
            <AlertCircle className="w-4.5 h-4.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full h-11 bg-gradient-to-r from-amber-200 to-amber-300 text-[#002856] border border-[#eec139] hover:from-amber-300 hover:to-amber-400 rounded-xl font-bold text-xs sm:text-sm shadow-md shadow-amber-200/20 hover:shadow-lg hover:shadow-amber-200/30 hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 mt-2"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <svg
                className="animate-spin h-4 w-4 text-[#002856]"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Uploading Documents...
            </span>
          ) : (
            <span>Submit Documents</span>
          )}
        </button>
      </form>
    </div>
  );
};

export default ProfileCompletionStep;
