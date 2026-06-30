import React, { useState, useRef, useEffect } from "react";
import {
  Upload,
  FileText,
  AlertCircle,
  X,
  ArrowLeft,
  Check,
  RefreshCw,
  FileSearch,
  ExternalLink,
} from "lucide-react";
import {
  uploadAdditionalDoc,
  deleteAdditionalDoc,
  refreshAdditionalDocs,
} from "../../../api/jobScreeningApi";
import mayaShocked from "../../../assets/onboarding/mayaShocked.webp";
import { motion } from "framer-motion";

const AdditionalDocumentsStep = ({ progress, onComplete, onBack }) => {
  const requiredDocs = progress?.resolvedRequiredDocs || [];
  const candidateDocs = progress?.additional_documents || {};
  const currentStep = progress?.steps_config?.find(
    (s) => s.id === "additional_documents",
  );
  const isUnderReview = currentStep?.status === "review";
  const isCompleted = currentStep?.status === "completed";
  const isShowReviewScreen = isUnderReview || isCompleted;

  useEffect(() => {
    if (isCompleted) {
      const timer = setTimeout(() => {
        onComplete(progress, true);
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [isCompleted, progress, onComplete]);

  useEffect(() => {
    let active = true;
    if (isUnderReview) {
      refreshAdditionalDocs()
        .then(({ data }) => {
          if (!active) return;
          if (data?.success) {
            const updatedStep = data.data?.steps_config?.find(
              (s) => s.id === "additional_documents",
            );
            const isNowCompleted = updatedStep?.status === "completed";
            if (isNowCompleted) {
              onComplete(data.data, false);
            }
          }
        })
        .catch((err) => console.error("Silent sync failed:", err));
    }
    return () => {
      active = false;
    };
  }, []);

  const [selectedFiles, setSelectedFiles] = useState({});
  const [loading, setLoading] = useState(false);
  const [deletingDocId, setDeletingDocId] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const fileInputRefs = useRef({});

  const handleUploadClick = (docId) => {
    if (fileInputRefs.current[docId]) {
      fileInputRefs.current[docId].click();
    }
  };

  const handleFileChange = (e, docId, allowedExtensions) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileExt = file.name.split(".").pop().toLowerCase();
    const hasAllowedExts = allowedExtensions || [
      "pdf",
      "doc",
      "docx",
      "png",
      "jpg",
      "jpeg",
    ];
    if (!hasAllowedExts.includes(fileExt)) {
      setError(
        `Only ${hasAllowedExts.map((e) => e.toUpperCase()).join(", ")} files are supported`,
      );
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError("File size must be under 10MB");
      return;
    }

    setError("");
    setSelectedFiles((prev) => ({
      ...prev,
      [docId]: file,
    }));
  };

  const handleRemoveLocalFile = (docId) => {
    setSelectedFiles((prev) => {
      const updated = { ...prev };
      delete updated[docId];
      return updated;
    });
    if (fileInputRefs.current[docId]) {
      fileInputRefs.current[docId].value = "";
    }
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();

    const selectedKeys = Object.keys(selectedFiles);
    if (selectedKeys.length === 0) return;

    try {
      setLoading(true);
      setError("");

      let lastResponseData = null;

      // Upload files sequentially
      for (const docId of selectedKeys) {
        const file = selectedFiles[docId];
        const formData = new FormData();
        formData.append("file", file);

        const { data } = await uploadAdditionalDoc(docId, formData);
        if (data?.success) {
          lastResponseData = data.data;
        } else {
          throw new Error(`Failed to upload ${file.name}`);
        }
      }

      setSelectedFiles({});
      setError("");

      // Clear file inputs
      Object.keys(fileInputRefs.current).forEach((key) => {
        if (fileInputRefs.current[key]) {
          fileInputRefs.current[key].value = "";
        }
      });

      if (lastResponseData) {
        const updatedStep = lastResponseData.steps_config?.find(
          (s) => s.id === "additional_documents",
        );
        const isNowCompleted = updatedStep?.status === "completed";
        onComplete(lastResponseData, isNowCompleted);
      }
    } catch (err) {
      console.error(err);
      setError(
        err.response?.data?.message ||
          err.message ||
          "Failed to upload one or more documents",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (docId) => {
    setError("");
    setDeletingDocId(docId);

    try {
      const { data } = await deleteAdditionalDoc(docId);
      if (data?.success) {
        onComplete(data.data, false);
      } else {
        setError("Failed to delete document");
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || "Error deleting document file");
    } finally {
      setDeletingDocId(null);
    }
  };

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      setError("");
      const { data } = await refreshAdditionalDocs();
      if (data?.success) {
        onComplete(data.data, false);
      } else {
        setError("Failed to refresh document status");
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || "Failed to sync status");
    } finally {
      setRefreshing(false);
    }
  };

  const getDocDetails = (doc) => {
    const localFile = selectedFiles[doc.id];
    const serverFile = candidateDocs[doc.id];

    if (localFile) {
      return {
        name: localFile.name,
        info: `Selected | ${(localFile.size / 1024 / 1024).toFixed(2)} MB`,
        isLocal: true,
      };
    }
    if (serverFile && serverFile.key) {
      return {
        name: serverFile.fileName || "document.pdf",
        info: serverFile.uploadedAt
          ? `Uploaded | ${new Date(serverFile.uploadedAt).toLocaleDateString()}`
          : "Uploaded",
        isLocal: false,
        status: serverFile.status,
        downloadUrl: serverFile.downloadUrl,
      };
    }
    return null;
  };

  const canSubmit = Object.keys(selectedFiles).length > 0 && !loading;

  // View state 1: Under Review Screen
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
            {isCompleted ? (
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className="w-12 h-12 bg-green-600 rounded-xl flex items-center justify-center text-white border border-green-700 shadow-sm"
              >
                <motion.svg
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  className="w-6 h-6 stroke-[3.5] text-white"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                >
                  <motion.path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                  />
                </motion.svg>
              </motion.div>
            ) : (
              <FileSearch className="w-6 h-6" />
            )}
          </div>

          {/* Heading */}
          <div className="text-center w-full">
            <h2 className="text-[#002856] text-2xl font-bold tracking-tight">
              {isCompleted ? "Documents verified!" : "Documents under review"}
            </h2>
            <p className="text-[#002856]/70 text-xs sm:text-sm font-medium mt-2 max-w-[280px] mx-auto leading-relaxed">
              {isCompleted
                ? "Your supporting documents have been successfully verified by our team."
                : "Your files have been successfully uploaded and sent for verification. We are checking the documents."}
            </p>
          </div>

          {/* Timeline checklist */}
          <div className="w-full flex flex-col pl-4 mt-2">
            {/* Step 1: Sent for review (done) */}
            <div className="flex gap-3.5 w-full items-stretch">
              <div className="flex flex-col items-center shrink-0">
                <div className="w-6 h-6 bg-[#15803d] rounded-full flex items-center justify-center text-white shadow-sm">
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </div>
                <div className={`w-[1.5px] ${isCompleted ? "bg-[#15803d]" : "bg-[#002856]/20"} flex-1 my-1`} />
              </div>
              <div className="pb-5 text-left flex-1 min-w-0 pr-2">
                <h4 className="text-[#002856] text-sm font-semibold leading-tight">
                  Sent for review
                </h4>
                <p className="text-slate-500 text-[11px] sm:text-xs mt-1 leading-normal">
                  Your supporting documents have been submitted.
                </p>
              </div>
            </div>

            {/* Step 2: Verification (pending/done) */}
            <div className="flex gap-3.5 w-full items-stretch">
              <div className="flex flex-col items-center shrink-0">
                {isCompleted ? (
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
                  Verification in progress
                </h4>
                <p className="text-slate-500 text-[11px] sm:text-xs mt-1 leading-normal">
                  {isCompleted
                    ? "Our team has completed the verification of your documents."
                    : "Our team will verify your credentials shortly."}
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
                {isCompleted ? "Verification complete" : "Please note"}
              </h5>
              <p className="text-slate-500 text-[10px] sm:text-xs mt-0.5 leading-normal">
                {isCompleted
                  ? "Your document verification is completed. Redirecting you shortly..."
                  : "Typically takes around 24- 48 hrs. You will be notified."}
              </p>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <p className="text-red-500 text-xs font-semibold">{error}</p>
          )}

          {/* Action Button */}
          {isCompleted ? (
            <button
              onClick={() => onComplete(progress, true)}
              className="w-full h-12 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold text-sm sm:text-base flex items-center justify-center gap-2 transition-all shadow-sm cursor-pointer border-none"
            >
              <span>Proceeding...</span>
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
          Upload supporting documents
        </h2>
        <p className="text-[#002856]/70 text-xs sm:text-sm font-medium leading-relaxed">
          Please upload the requested credentials below to verify eligibility
          for placement.
        </p>
      </div>

      {/* Checklist cards */}
      <div className="w-full flex flex-col gap-4 mb-6">
        {requiredDocs.map((doc) => {
          const fileDetails = getDocDetails(doc);
          const isUploadedOrSelected = !!fileDetails;
          const hasAllowedExts = doc.allowed_extensions || [
            "pdf",
            "doc",
            "docx",
            "png",
            "jpg",
            "jpeg",
          ];
          const acceptString = hasAllowedExts.map((e) => `.${e}`).join(",");

          let statusLabel = "pending";
          let statusBadgeClass = "bg-amber-50 text-[#d97706] border-amber-100";
          let statusIconClass =
            "bg-green-50 border border-green-100 text-[#15803d]";

          if (fileDetails) {
            if (fileDetails.isLocal) {
              statusLabel = "pending upload";
              statusBadgeClass = "bg-amber-50 text-[#d97706] border-amber-100";
              statusIconClass =
                "bg-amber-50 border border-amber-100 text-[#d97706]";
            } else {
              if (fileDetails.status === "approved") {
                statusLabel = "approved";
                statusBadgeClass =
                  "bg-green-50 text-[#15803d] border-green-100";
                statusIconClass =
                  "bg-green-50 border border-green-100 text-[#15803d]";
              } else if (fileDetails.status === "rejected") {
                statusLabel = "rejected";
                statusBadgeClass = "bg-red-50 text-red-650 border-red-100";
                statusIconClass =
                  "bg-red-50 border border-red-100 text-red-650";
              } else {
                statusLabel = "review";
                statusBadgeClass = "bg-blue-50 text-blue-650 border-blue-100";
                statusIconClass =
                  "bg-blue-50 border border-blue-100 text-blue-650";
              }
            }
          }

          return (
            <div
              key={doc.id}
              className="w-full p-4 bg-white rounded-2xl border border-slate-200 flex flex-col gap-3.5 text-left"
            >
              {/* File Input */}
              <input
                type="file"
                ref={(el) => {
                  if (el) fileInputRefs.current[doc.id] = el;
                  else delete fileInputRefs.current[doc.id];
                }}
                accept={acceptString}
                onChange={(e) =>
                  handleFileChange(e, doc.id, doc.allowed_extensions)
                }
                className="hidden"
              />

              <div className="flex justify-between items-center w-full">
                <h3 className="text-[#002856] text-base font-semibold leading-tight truncate pr-2">
                  {doc.title}
                </h3>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border shrink-0 ${statusBadgeClass}`}
                >
                  {statusLabel}
                </span>
              </div>

              {doc.description && (
                <p className="text-slate-500 text-[11px] sm:text-xs font-normal leading-relaxed">
                  {doc.description}
                </p>
              )}

              {/* Uploaded details block or dropzone */}
              {isUploadedOrSelected ? (
                <div className="p-4 bg-slate-50/50 rounded-xl border border-slate-200/60 flex items-center justify-between gap-3 w-full">
                  <div className="flex items-center gap-3.5 min-w-0 flex-1">
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${statusIconClass}`}
                    >
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-slate-700 text-xs sm:text-sm font-semibold truncate">
                        {fileDetails.name}
                      </p>
                      <p className="text-[#002856]/50 text-[10px] sm:text-xs font-normal mt-0.5">
                        {fileDetails.info}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {/* View server file */}
                    {!fileDetails.isLocal && fileDetails.downloadUrl && (
                      <a
                        href={fileDetails.downloadUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1.5 bg-white hover:bg-slate-50 text-[#002856] border border-slate-200 rounded-lg text-[10px] font-bold cursor-pointer flex items-center gap-1"
                      >
                        <span>View</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}

                    {/* Remove local selected file */}
                    {fileDetails.isLocal && (
                      <button
                        type="button"
                        onClick={() => handleRemoveLocalFile(doc.id)}
                        className="w-7 h-7 bg-white hover:bg-rose-50 text-slate-400 hover:text-red-500 rounded-lg border border-slate-200 flex items-center justify-center transition-colors cursor-pointer"
                        title="Remove selected file"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}

                    {/* Replace / Delete server file */}
                    {!fileDetails.isLocal &&
                      fileDetails.status !== "approved" && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleUploadClick(doc.id)}
                            className="px-2.5 py-1.5 bg-white hover:bg-slate-50 text-[#002856] border border-slate-200 rounded-lg text-[10px] font-bold cursor-pointer"
                          >
                            Replace
                          </button>
                          <button
                            type="button"
                            disabled={deletingDocId === doc.id || loading}
                            onClick={() => handleDelete(doc.id)}
                            className="w-7 h-7 bg-white hover:bg-rose-50 text-slate-400 hover:text-red-500 rounded-lg border border-slate-200 flex items-center justify-center transition-colors cursor-pointer"
                            title="Delete server file"
                          >
                            {deletingDocId === doc.id ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <X className="w-4 h-4" />
                            )}
                          </button>
                        </>
                      )}
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => handleUploadClick(doc.id)}
                  className="p-6 bg-slate-50/20 hover:bg-slate-50/55 rounded-xl border border-dashed border-slate-200 hover:border-slate-350 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200"
                >
                  <div className="w-10 h-10 rounded-lg bg-black/5 flex items-center justify-center text-slate-500 mb-2">
                    <Upload className="w-5 h-5" />
                  </div>
                  <span className="text-[#002856] text-xs sm:text-sm font-semibold">
                    Click to upload
                  </span>
                  <span className="text-[#002856]/50 text-[10px] sm:text-xs font-normal mt-0.5">
                    Supported files:{" "}
                    {hasAllowedExts.map((e) => e.toUpperCase()).join(", ")}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

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
        className="w-full h-12 bg-[#002856] hover:bg-[#07192f] text-white rounded-xl font-bold text-sm sm:text-base transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm cursor-pointer border-none"
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

export default AdditionalDocumentsStep;
