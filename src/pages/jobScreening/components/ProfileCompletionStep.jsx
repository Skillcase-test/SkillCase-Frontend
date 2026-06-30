import React, { useState, useRef } from "react";
import {
  Upload,
  FileText,
  AlertCircle,
  X,
  ArrowLeft,
  Check,
  RefreshCw,
  FileSearch,
} from "lucide-react";
import { uploadProfileDocs, getProgress } from "../../../api/jobScreeningApi";
import mayaShocked from "../../../assets/onboarding/mayaShocked.webp";

const ProfileCompletionStep = ({ progress, onComplete, onBack }) => {
  const [selectedResume, setSelectedResume] = useState(null);
  const [selectedCert, setSelectedCert] = useState(null);

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const resumeInputRef = useRef(null);
  const certInputRef = useRef(null);

  const hasServerResume = !!progress?.resume_url;
  const hasServerCert = !!progress?.lang_cert_url;

  const handleFileChange = (e, type) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isPDF =
      file.type === "application/pdf" ||
      file.name.toLowerCase().endsWith(".pdf");
    if (!isPDF) {
      setError("Only PDF files are supported");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError("File size must be under 10MB");
      return;
    }

    setError("");
    if (type === "resume") {
      setSelectedResume(file);
    } else {
      setSelectedCert(file);
    }
  };

  const handleRemoveFile = (type) => {
    if (type === "resume") {
      setSelectedResume(null);
      if (resumeInputRef.current) resumeInputRef.current.value = "";
    } else {
      setSelectedCert(null);
      if (certInputRef.current) certInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!selectedResume && !selectedCert) return;

    try {
      setLoading(true);
      setError("");

      const formData = new FormData();
      if (selectedResume) {
        formData.append("resume", selectedResume);
      }
      if (selectedCert) {
        formData.append("certificate", selectedCert);
      }

      const { data } = await uploadProfileDocs(formData);
      if (data?.success) {
        onComplete(data.data, false);
      } else {
        setError("Failed to upload documents");
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || "Failed to upload files");
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      setError("");
      const { data } = await getProgress();
      if (data?.success) {
        const updatedProfileStep = data.data?.steps_config?.find(
          (s) => s.id === "profile_completion",
        );
        const isNowCompleted =
          updatedProfileStep?.status === "completed" ||
          !!data.data?.email_verified;
        onComplete(data.data, isNowCompleted);
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

  // Helper to get file display name and info
  const getFileDetails = (type) => {
    if (type === "resume") {
      if (selectedResume) {
        return {
          name: selectedResume.name,
          info: `Selected | ${(selectedResume.size / 1024 / 1024).toFixed(2)} MB | PDF`,
        };
      }
      if (hasServerResume) {
        return {
          name: "resume_document.pdf",
          info: "Uploaded | PDF",
        };
      }
    } else {
      if (selectedCert) {
        return {
          name: selectedCert.name,
          info: `Selected | ${(selectedCert.size / 1024 / 1024).toFixed(2)} MB | PDF`,
        };
      }
      if (hasServerCert) {
        return {
          name: "language_certificate.pdf",
          info: "Uploaded | PDF",
        };
      }
    }
    return null;
  };

  const profileStep = progress?.steps_config?.find(
    (s) => s.id === "profile_completion",
  );
  const isProfileCompleted =
    profileStep?.status === "completed" || !!progress?.email_verified;
  const isUnderReview =
    progress?.resume_url && progress?.lang_cert_url && !isProfileCompleted;

  const isShowReviewScreen = isUnderReview || isProfileCompleted;

  // View state 1: Profile Under Review Dashboard
  if (isShowReviewScreen) {
    return (
      <div className="w-full bg-white text-[#002856] flex flex-col items-center justify-start relative font-sans">
        {/* Sub-Header bar */}
        <div className="w-full flex items-center justify-between mb-4">
          <button
            onClick={onBack}
            className="flex items-center gap-1 text-slate-800 text-sm font-semibold hover:text-black cursor-pointer bg-transparent border-none p-0"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>
          <span className="text-slate-400 text-sm font-semibold">
            Job Progress
          </span>
        </div>

        {/* Blue Review Card block */}
        <div className="w-full px-5 pt-8 pb-5 bg-gradient-to-b from-[#e0f2fe] to-[#f0f9ff] rounded-2xl border border-white/20 flex flex-col items-center gap-6">
          {/* Review Icon */}
          <div className="w-12 h-12 bg-blue-950 rounded-xl flex items-center justify-center text-white shrink-0">
            <FileSearch className="w-6 h-6" />
          </div>

          {/* Heading */}
          <div className="text-center w-full">
            <h2 className="text-[#002856] text-2xl font-bold tracking-tight">
              {isProfileCompleted
                ? "Profile verified!"
                : "Profile under review"}
            </h2>
            <p className="text-[#002856]/70 text-xs sm:text-sm font-medium mt-2 max-w-[280px] mx-auto leading-relaxed">
              {isProfileCompleted
                ? "Your documents have been successfully verified. You can now proceed."
                : "Your files have been successfully uploaded and sent for verification. We are checking the documents."}
            </p>
          </div>

          {/* Timeline checklist */}
          <div className="w-full flex flex-col pl-4 mt-2">
            {/* Step 1: Send for review (done) */}
            <div className="flex gap-3.5 w-full items-stretch">
              <div className="flex flex-col items-center shrink-0">
                <div className="w-6 h-6 bg-[#15803d] rounded-full flex items-center justify-center text-white shadow-sm">
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </div>
                <div className="w-[1.5px] bg-[#002856]/20 flex-1 my-1" />
              </div>
              <div className="pb-5 text-left flex-1 min-w-0 pr-2">
                <h4 className="text-[#002856] text-sm font-semibold leading-tight">
                  Sent for review
                </h4>
                <p className="text-slate-500 text-[11px] sm:text-xs mt-1 leading-normal">
                  Your resume and language certificate have been submitted.
                </p>
              </div>
            </div>

            {/* Step 2: Your profile is reviewed (pending/completed) */}
            <div className="flex gap-3.5 w-full items-stretch">
              <div className="flex flex-col items-center shrink-0">
                {isProfileCompleted ? (
                  <div className="w-6 h-6 bg-[#15803d] rounded-full flex items-center justify-center text-white shadow-sm">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                ) : (
                  <div className="w-6 h-6 bg-blue-950 rounded-full flex items-center justify-center text-white shadow-sm">
                    <div className="w-2.5 h-2.5 bg-white rounded-full" />
                  </div>
                )}
              </div>
              <div className="pb-5 text-left flex-1 min-w-0 pr-2">
                <h4 className="text-[#002856] text-sm font-semibold leading-tight">
                  Your profile is reviewed
                </h4>
                <p className="text-slate-500 text-[11px] sm:text-xs mt-1 leading-normal">
                  Our recruiting team will verify your credentials shortly.
                </p>
              </div>
            </div>
          </div>

          {/* Please note card */}
          <div className="w-full bg-white rounded-2xl border border-slate-200/80 flex items-center gap-3.5 shadow-sm text-left">
            <img
              src={mayaShocked}
              alt="Mascot Alert"
              className="w-20 h-20 object-contain shrink-0 select-none"
              draggable="false"
            />
            <div className="min-w-0 flex-1">
              <h5 className="text-slate-800 text-xs sm:text-sm font-bold">
                {isProfileCompleted ? "Verification complete" : "Please note"}
              </h5>
              <p className="text-slate-500 text-[10px] sm:text-xs mt-0.5 leading-normal">
                {isProfileCompleted
                  ? "Our recruiting team has approved your profile details. Feel free to continue."
                  : "Typically takes around 24- 48 hrs. You will be notified."}
              </p>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <p className="text-red-500 text-xs font-semibold">{error}</p>
          )}

          {/* Refresh / Action Button */}
          {isProfileCompleted ? (
            <button
              onClick={() => onComplete(progress, true)}
              className="w-full h-12 bg-[#002856] hover:bg-[#001f42] text-white rounded-xl font-bold text-sm sm:text-base flex items-center justify-center gap-2 transition-all shadow-sm cursor-pointer border-none"
            >
              <span>Move to next step</span>
            </button>
          ) : (
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="w-full h-12 bg-white hover:bg-slate-50 text-[#002856] border border-[#002856] rounded-xl font-bold text-sm sm:text-base flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-sm cursor-pointer"
            >
              {refreshing ? (
                <>
                  <RefreshCw className="animate-spin w-4 h-4 text-[#002856]" />
                  <span>Syncing status...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 text-[#002856]" />
                  <span>Refresh status</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    );
  }

  const resumeDetails = getFileDetails("resume");
  const certDetails = getFileDetails("cert");

  const isResumeUploaded = !!selectedResume || hasServerResume;
  const isCertUploaded = !!selectedCert || hasServerCert;

  const canSubmit = (selectedResume || selectedCert) && !loading;

  // View state 2: Upload Documents Form view
  return (
    <div className="w-full bg-white text-[#002856] flex flex-col items-center justify-start relative font-sans">
      {/* Sub-Header bar */}
      <div className="w-full flex items-center justify-between mb-4">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-slate-800 text-sm font-semibold hover:text-black cursor-pointer bg-transparent border-none p-0"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>
        <span className="text-slate-400 text-sm font-semibold">
          Job Progress
        </span>
      </div>

      {/* Main Title section */}
      <div className="text-left w-full mb-6">
        <h2 className="text-[#002856] text-2xl font-bold tracking-tight mb-2">
          Upload your documents
        </h2>
        <p className="text-[#002856]/70 text-xs sm:text-sm font-medium leading-relaxed">
          Please upload your resume and language certificate below to verify
          your eligibility.
        </p>
      </div>

      {/* Hidden File Inputs */}
      <input
        type="file"
        ref={resumeInputRef}
        onChange={(e) => handleFileChange(e, "resume")}
        accept=".pdf"
        className="hidden"
      />
      <input
        type="file"
        ref={certInputRef}
        onChange={(e) => handleFileChange(e, "cert")}
        accept=".pdf"
        className="hidden"
      />

      {/* Document checklist cards */}
      <div className="w-full flex flex-col gap-4 mb-6">
        {/* Card 1: Resume */}
        <div className="w-full p-4 bg-white rounded-2xl border border-slate-200 flex flex-col gap-3.5 text-left">
          <div className="flex justify-between items-center w-full">
            <h3 className="text-[#002856] text-base font-semibold leading-tight">
              Resume
            </h3>
            <span
              className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${
                isResumeUploaded
                  ? "bg-green-50 text-[#15803d] border-green-100"
                  : "bg-amber-50 text-[#d97706] border-amber-100"
              }`}
            >
              {isResumeUploaded ? "uploaded" : "pending"}
            </span>
          </div>

          <p className="text-slate-500 text-[11px] sm:text-xs font-normal leading-relaxed">
            Provide your latest curriculum vitae (CV) detailing your education
            and experience.
          </p>

          {/* Upload trigger or file details block */}
          {resumeDetails ? (
            <div className="p-4 bg-slate-50/50 rounded-xl border border-slate-200/60 flex items-center justify-between gap-3 w-full">
              <div className="flex items-center gap-3.5 min-w-0 flex-1">
                <div className="w-10 h-10 rounded-lg bg-green-50 border border-green-100 flex items-center justify-center text-[#15803d] shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-slate-700 text-xs sm:text-sm font-semibold truncate">
                    {resumeDetails.name}
                  </p>
                  <p className="text-[#002856]/50 text-[10px] sm:text-xs font-normal mt-0.5">
                    {resumeDetails.info}
                  </p>
                </div>
              </div>

              {/* Reset select button (if we have a local selected file) */}
              {selectedResume && (
                <button
                  onClick={() => handleRemoveFile("resume")}
                  className="w-7 h-7 bg-white hover:bg-rose-50 text-slate-400 hover:text-red-500 rounded-lg border border-slate-200 flex items-center justify-center transition-colors cursor-pointer"
                  title="Remove local file"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              {/* Replace trigger if S3 exists */}
              {!selectedResume && hasServerResume && (
                <button
                  onClick={() => resumeInputRef.current?.click()}
                  className="px-2.5 py-1 bg-white hover:bg-slate-50 text-[#002856] border border-slate-200 rounded-lg text-[10px] font-bold cursor-pointer"
                >
                  Replace
                </button>
              )}
            </div>
          ) : (
            <div
              onClick={() => resumeInputRef.current?.click()}
              className="p-6 bg-slate-50/20 hover:bg-slate-50/55 rounded-xl border border-dashed border-slate-200 hover:border-slate-350 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200"
            >
              <div className="w-10 h-10 rounded-lg bg-black/5 flex items-center justify-center text-slate-500 mb-2">
                <Upload className="w-5 h-5" />
              </div>
              <span className="text-[#002856] text-xs sm:text-sm font-semibold">
                Click to upload
              </span>
              <span className="text-[#002856]/50 text-[10px] sm:text-xs font-normal mt-0.5">
                Supported files: PDF
              </span>
            </div>
          )}
        </div>

        {/* Card 2: Language Certificates */}
        <div className="w-full p-4 bg-white rounded-2xl border border-slate-200 flex flex-col gap-3.5 text-left">
          <div className="flex justify-between items-center w-full">
            <h3 className="text-[#002856] text-base font-semibold leading-tight">
              Language Certificates
            </h3>
            <span
              className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${
                isCertUploaded
                  ? "bg-green-50 text-[#15803d] border-green-100"
                  : "bg-amber-50 text-[#d97706] border-amber-100"
              }`}
            >
              {isCertUploaded ? "uploaded" : "pending"}
            </span>
          </div>

          <p className="text-slate-500 text-[11px] sm:text-xs font-normal leading-relaxed">
            Provide your official B1 or B2 language certification PDF confirming
            your proficiency.
          </p>

          {/* Upload trigger or file details block */}
          {certDetails ? (
            <div className="p-4 bg-slate-50/50 rounded-xl border border-slate-200/60 flex items-center justify-between gap-3 w-full">
              <div className="flex items-center gap-3.5 min-w-0 flex-1">
                <div className="w-10 h-10 rounded-lg bg-green-50 border border-green-100 flex items-center justify-center text-[#15803d] shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-slate-700 text-xs sm:text-sm font-semibold truncate">
                    {certDetails.name}
                  </p>
                  <p className="text-[#002856]/50 text-[10px] sm:text-xs font-normal mt-0.5">
                    {certDetails.info}
                  </p>
                </div>
              </div>

              {/* Reset select button (if we have a local selected file) */}
              {selectedCert && (
                <button
                  onClick={() => handleRemoveFile("cert")}
                  className="w-7 h-7 bg-white hover:bg-rose-50 text-slate-400 hover:text-red-500 rounded-lg border border-slate-200 flex items-center justify-center transition-colors cursor-pointer"
                  title="Remove local file"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              {/* Replace trigger if S3 exists */}
              {!selectedCert && hasServerCert && (
                <button
                  onClick={() => certInputRef.current?.click()}
                  className="px-2.5 py-1 bg-white hover:bg-slate-50 text-[#002856] border border-slate-200 rounded-lg text-[10px] font-bold cursor-pointer"
                >
                  Replace
                </button>
              )}
            </div>
          ) : (
            <div
              onClick={() => certInputRef.current?.click()}
              className="p-6 bg-slate-50/20 hover:bg-slate-50/55 rounded-xl border border-dashed border-slate-200 hover:border-slate-350 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200"
            >
              <div className="w-10 h-10 rounded-lg bg-black/5 flex items-center justify-center text-slate-500 mb-2">
                <Upload className="w-5 h-5" />
              </div>
              <span className="text-[#002856] text-xs sm:text-sm font-semibold">
                Click to upload
              </span>
              <span className="text-[#002856]/50 text-[10px] sm:text-xs font-normal mt-0.5">
                Supported files: PDF
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex items-start gap-2.5 text-red-500 text-xs font-semibold p-3 bg-red-50/50 rounded-xl border border-red-100 w-full mb-6">
          <AlertCircle className="w-4.5 h-4.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Submit Button */}
      <button
        onClick={handleSubmit}
        disabled={!canSubmit}
        className="w-full h-12 bg-[#002856] hover:bg-[#07192f] text-white rounded-xl font-bold text-sm sm:text-base transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm cursor-pointer"
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <RefreshCw className="animate-spin h-4 w-4 text-white" />
            Uploading documents...
          </span>
        ) : (
          <span>Submit</span>
        )}
      </button>
    </div>
  );
};

export default ProfileCompletionStep;
