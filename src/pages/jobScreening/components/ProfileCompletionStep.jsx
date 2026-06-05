import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  FileText,
  AlertCircle,
  X,
  ShieldCheck,
  RefreshCw,
  ChevronRight,
  CheckCircle,
  FileUp,
  Sparkles,
} from "lucide-react";
import { uploadProfileDocs, getProgress } from "../../../api/jobScreeningApi";

const ProfileCompletionStep = ({ progress, onComplete }) => {
  const [resume, setResume] = useState(null);
  const [cert, setCert] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [expandedDoc, setExpandedDoc] = useState("resume");

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
    if (e) e.preventDefault();
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
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 flex flex-col items-center justify-center text-center w-full">
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
            Compliance Review
          </span>
          <span className="h-4 w-px bg-slate-200" />
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-[#002856] shrink-0" />
            Verification Pending
          </span>
        </div>

        {/* Refresh button */}
        <button
          type="button"
          onClick={handleRefresh}
          disabled={refreshing}
          className="w-full sm:max-w-xs h-11 border border-slate-200 bg-white text-[#002856] hover:bg-slate-50 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50 mt-4 active:scale-[0.99]"
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

  const selectedCount = (resume ? 1 : 0) + (cert ? 1 : 0);

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 w-full font-sans max-w-xl mx-auto flex flex-col shadow-sm">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="text-left">
          <h2 className="text-xl font-extrabold text-[#002856] tracking-tight">
            Complete Your Profile
          </h2>
          <p className="text-zinc-500 text-xs font-medium mt-0.5">
            Select your credentials to start your official job evaluations.
          </p>
        </div>

        {/* Progress pill */}
        <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-full text-[10px] font-bold text-[#002856] shrink-0">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          <span>
            {selectedCount} / 2 Attached
          </span>
        </div>
      </div>

      {/* Accordion Quest Cards Queue */}
      <div className="space-y-3.5">
        {/* Card 1: Resume */}
        <motion.div
          layout
          className={`border rounded-2xl overflow-hidden bg-white transition-all duration-200 ${
            expandedDoc === "resume"
              ? "border-slate-200 shadow-sm"
              : "border-slate-100 hover:border-slate-200"
          }`}
        >
          {/* Header block */}
          <div
            onClick={() => setExpandedDoc("resume")}
            className={`p-4 flex items-center justify-between transition-colors select-none ${
              expandedDoc === "resume"
                ? "bg-slate-50/20"
                : "bg-white cursor-pointer hover:bg-slate-50/20"
            }`}
          >
            <div className="flex items-center gap-3 pr-4 min-w-0">
              {/* Status Indicator circle */}
              <div
                className={`w-6 h-6 rounded-full border flex items-center justify-center shrink-0 text-[10px] ${
                  resume
                    ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                    : "bg-slate-50 text-slate-400 border-slate-200"
                }`}
              >
                {resume ? (
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                ) : (
                  <div className="w-1.5 h-1.5 rounded-full bg-current" />
                )}
              </div>
              <div className="min-w-0 text-left">
                <p
                  className={`text-xs sm:text-sm font-bold ${
                    expandedDoc === "resume" ? "text-slate-800" : "text-slate-700"
                  } truncate`}
                >
                  Resume / CV
                </p>
                {resume && expandedDoc !== "resume" && (
                  <p className="text-[9px] text-zinc-400 font-medium truncate max-w-[200px] mt-0.5">
                    {resume.name}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span
                className={`px-2 py-0.5 rounded-full text-[9px] font-bold border uppercase tracking-wider ${
                  resume
                    ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                    : "bg-slate-50 text-slate-400 border-slate-200"
                }`}
              >
                {resume ? "Attached" : "Pending Upload"}
              </span>
              {expandedDoc !== "resume" && (
                <ChevronRight className="w-4 h-4 text-slate-400 opacity-60" />
              )}
            </div>
          </div>

          {/* Card body dropzone */}
          <AnimatePresence initial={false}>
            {expandedDoc === "resume" && (
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: "auto" }}
                exit={{ height: 0 }}
                transition={{ duration: 0.2 }}
                className="border-t border-slate-100 bg-white"
              >
                <div className="p-4 flex flex-col gap-3 text-left">
                  <p className="text-xs text-zinc-500 leading-relaxed font-medium bg-slate-50/50 p-3 rounded-xl border border-slate-100/50">
                    Upload your professional curriculum vitae (CV) detailing your work experience and education.
                  </p>

                  {/* Dropzone area */}
                  {!resume ? (
                    <div className="relative border border-dashed border-slate-200 hover:border-slate-400 rounded-xl p-6 flex flex-col items-center justify-center bg-slate-50/10 hover:bg-slate-50/30 transition-all duration-200 cursor-pointer">
                      <input
                        type="file"
                        accept=".pdf"
                        onChange={(e) => {
                          const file = e.target.files?.[0] || null;
                          if (file) {
                            setResume(file);
                            // Auto-focus next file if not selected
                            if (!cert) {
                              setExpandedDoc("cert");
                            }
                          }
                        }}
                        className="absolute inset-0 opacity-0 cursor-pointer z-10"
                      />
                      <div className="flex flex-col items-center text-center">
                        <div className="w-10 h-10 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-500 mb-3">
                          <FileUp className="w-5 h-5" />
                        </div>
                        <p className="text-xs font-bold text-slate-700">
                          Click or Drag to Select Resume
                        </p>
                        <p className="text-[10px] text-zinc-400 font-medium mt-1 leading-relaxed">
                          Supports: PDF up to 10MB
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between p-3 bg-slate-50/50 border border-slate-100 rounded-xl">
                      <div className="flex items-center gap-2.5 pr-4 min-w-0">
                        <FileText className="w-5 h-5 text-slate-400 shrink-0" />
                        <div className="min-w-0 text-left">
                          <p className="text-xs font-bold text-slate-800 truncate">
                            {resume.name}
                          </p>
                          <p className="text-[9px] text-zinc-400 font-medium mt-0.5">
                            {(resume.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setResume(null);
                        }}
                        className="w-8 h-8 rounded-lg bg-white border border-slate-200 hover:bg-rose-50 text-slate-400 hover:text-red-500 flex items-center justify-center transition-colors shrink-0 z-20 cursor-pointer shadow-sm"
                        title="Remove File"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Card 2: Certificate */}
        <motion.div
          layout
          className={`border rounded-2xl overflow-hidden bg-white transition-all duration-200 ${
            expandedDoc === "cert"
              ? "border-slate-200 shadow-sm"
              : "border-slate-100 hover:border-slate-200"
          }`}
        >
          {/* Header block */}
          <div
            onClick={() => setExpandedDoc("cert")}
            className={`p-4 flex items-center justify-between transition-colors select-none ${
              expandedDoc === "cert"
                ? "bg-slate-50/20"
                : "bg-white cursor-pointer hover:bg-slate-50/20"
            }`}
          >
            <div className="flex items-center gap-3 pr-4 min-w-0">
              {/* Status Indicator circle */}
              <div
                className={`w-6 h-6 rounded-full border flex items-center justify-center shrink-0 text-[10px] ${
                  cert
                    ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                    : "bg-slate-50 text-slate-400 border-slate-200"
                }`}
              >
                {cert ? (
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                ) : (
                  <div className="w-1.5 h-1.5 rounded-full bg-current" />
                )}
              </div>
              <div className="min-w-0 text-left">
                <p
                  className={`text-xs sm:text-sm font-bold ${
                    expandedDoc === "cert" ? "text-slate-800" : "text-slate-700"
                  } truncate`}
                >
                  Language Certificate
                </p>
                {cert && expandedDoc !== "cert" && (
                  <p className="text-[9px] text-zinc-400 font-medium truncate max-w-[200px] mt-0.5">
                    {cert.name}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span
                className={`px-2 py-0.5 rounded-full text-[9px] font-bold border uppercase tracking-wider ${
                  cert
                    ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                    : "bg-slate-50 text-slate-400 border-slate-200"
                }`}
              >
                {cert ? "Attached" : "Pending Upload"}
              </span>
              {expandedDoc !== "cert" && (
                <ChevronRight className="w-4 h-4 text-slate-400 opacity-60" />
              )}
            </div>
          </div>

          {/* Card body dropzone */}
          <AnimatePresence initial={false}>
            {expandedDoc === "cert" && (
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: "auto" }}
                exit={{ height: 0 }}
                transition={{ duration: 0.2 }}
                className="border-t border-slate-100 bg-white"
              >
                <div className="p-4 flex flex-col gap-3 text-left">
                  <p className="text-xs text-zinc-500 leading-relaxed font-medium bg-slate-50/50 p-3 rounded-xl border border-slate-100/50">
                    Upload your official B1 or B2 language certification PDF confirming your current German language proficiency level.
                  </p>

                  {/* Dropzone area */}
                  {!cert ? (
                    <div className="relative border border-dashed border-slate-200 hover:border-slate-400 rounded-xl p-6 flex flex-col items-center justify-center bg-slate-50/10 hover:bg-slate-50/30 transition-all duration-200 cursor-pointer">
                      <input
                        type="file"
                        accept=".pdf"
                        onChange={(e) => {
                          const file = e.target.files?.[0] || null;
                          if (file) {
                            setCert(file);
                            // Auto-focus next file if not selected
                            if (!resume) {
                              setExpandedDoc("resume");
                            }
                          }
                        }}
                        className="absolute inset-0 opacity-0 cursor-pointer z-10"
                      />
                      <div className="flex flex-col items-center text-center">
                        <div className="w-10 h-10 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-500 mb-3">
                          <FileUp className="w-5 h-5" />
                        </div>
                        <p className="text-xs font-bold text-slate-700">
                          Click or Drag to Select Certificate
                        </p>
                        <p className="text-[10px] text-zinc-400 font-medium mt-1 leading-relaxed">
                          Supports: PDF up to 10MB
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between p-3 bg-slate-50/50 border border-slate-100 rounded-xl">
                      <div className="flex items-center gap-2.5 pr-4 min-w-0">
                        <FileText className="w-5 h-5 text-slate-400 shrink-0" />
                        <div className="min-w-0 text-left">
                          <p className="text-xs font-bold text-slate-800 truncate">
                            {cert.name}
                          </p>
                          <p className="text-[9px] text-zinc-400 font-medium mt-0.5">
                            {(cert.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setCert(null);
                        }}
                        className="w-8 h-8 rounded-lg bg-white border border-slate-200 hover:bg-rose-50 text-slate-400 hover:text-red-500 flex items-center justify-center transition-colors shrink-0 z-20 cursor-pointer shadow-sm"
                        title="Remove File"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {error && (
        <div className="flex items-start gap-2.5 text-red-500 text-xs font-semibold p-3 bg-red-50/50 rounded-xl border border-red-100 w-full mt-5">
          <AlertCircle className="w-4.5 h-4.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Submit Button */}
      <button
        onClick={handleSubmit}
        disabled={loading || !resume || !cert}
        className="w-full sm:max-w-xs mx-auto h-11 sm:h-12 bg-[#002856] hover:bg-[#003975] text-white rounded-xl font-bold text-xs sm:text-sm shadow-sm transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 mt-6 cursor-pointer"
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Submitting Profile...
          </span>
        ) : (
          <span>Submit Documents</span>
        )}
      </button>
    </div>
  );
};

export default ProfileCompletionStep;

