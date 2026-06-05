import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  FileText,
  AlertCircle,
  X,
  ShieldCheck,
  RefreshCw,
  CheckCircle,
  FileUp,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  Sparkles,
} from "lucide-react";
import {
  uploadAdditionalDoc,
  deleteAdditionalDoc,
  refreshAdditionalDocs,
} from "../../../api/jobScreeningApi";

const AdditionalDocumentsStep = ({ progress, onComplete }) => {
  const requiredDocs = progress?.resolvedRequiredDocs || [];
  const candidateDocs = progress?.additional_documents || {};
  const currentStep = progress?.steps_config?.find(
    (s) => s.id === "additional_documents",
  );
  const isUnderReview = currentStep?.status === "review";

  const [expandedDocId, setExpandedDocId] = useState(null);
  const [uploadingDocId, setUploadingDocId] = useState(null);
  const [deletingDocId, setDeletingDocId] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const uploadedCount = requiredDocs.filter(
    (doc) => candidateDocs[doc.id]?.key,
  ).length;

  // Auto-expand the first incomplete document on load
  useEffect(() => {
    if (!expandedDocId && requiredDocs.length > 0) {
      const firstIncomplete = requiredDocs.find(
        (doc) => !candidateDocs[doc.id]?.key,
      );
      setExpandedDocId(
        firstIncomplete ? firstIncomplete.id : requiredDocs[0].id,
      );
    }
  }, [requiredDocs, candidateDocs, expandedDocId]);

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      setError("");
      const { data } = await refreshAdditionalDocs();
      if (data?.success) {
        onComplete(data.data);
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

  const handleUpload = async (docId, file) => {
    if (!file) return;
    setError("");
    setUploadingDocId(docId);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const { data } = await uploadAdditionalDoc(docId, formData);
      if (data?.success) {
        onComplete(data.data);
        // Auto-advance to next incomplete card
        const nextIncomplete = requiredDocs.find(
          (d) => d.id !== docId && !candidateDocs[d.id]?.key,
        );
        if (nextIncomplete) {
          setExpandedDocId(nextIncomplete.id);
        }
      } else {
        setError("Failed to upload document");
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || "Error uploading document file");
    } finally {
      setUploadingDocId(null);
    }
  };

  const handleDelete = async (e, docId) => {
    e.stopPropagation();
    e.preventDefault();
    setError("");
    setDeletingDocId(docId);

    try {
      const { data } = await deleteAdditionalDoc(docId);
      if (data?.success) {
        onComplete(data.data);
        setExpandedDocId(docId); // Re-focus on the deleted document card
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

  const formatAllowedExts = (exts) => {
    const list = exts || ["pdf", "doc", "docx", "png", "jpg", "jpeg"];
    return list.map((e) => e.toUpperCase()).join(", ");
  };

  // State: Under Review Screen
  if (isUnderReview) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 flex flex-col items-center justify-center text-center w-full font-sans shadow-sm">
        {/* Verification Hub Icon */}
        <div className="w-14 h-14 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-[#002856] mb-5 shadow-sm">
          <ShieldCheck className="w-6 h-6" />
        </div>

        <h2 className="text-xl sm:text-2xl font-extrabold text-[#002856] tracking-tight mb-2">
          Supporting Documents Locked
        </h2>
        <p className="text-zinc-500 text-xs sm:text-sm max-w-md mb-6 leading-relaxed font-medium">
          Your supporting documents have been successfully locked and submitted.
          We are currently verifying your details against corporate partner
          standards.
        </p>

        {/* Locked Checklist */}
        <div className="w-full max-w-md bg-slate-50/50 border border-slate-100 rounded-2xl p-4 mb-6">
          <h4 className="text-xs font-bold text-[#002856] text-left mb-3 uppercase tracking-wider">
            Secured Documents
          </h4>
          <div className="space-y-2 text-left">
            {requiredDocs.map((doc) => {
              const fileObj = candidateDocs[doc.id];
              const isApproved = fileObj?.status === "approved";
              return (
                <div
                  key={doc.id}
                  className="flex items-center justify-between bg-white border border-slate-100 rounded-xl p-3 text-xs"
                >
                  <div className="flex items-center gap-2 pr-4 truncate">
                    <CheckCircle
                      className={`w-4 h-4 shrink-0 ${isApproved ? "text-emerald-500" : "text-amber-500"}`}
                    />
                    <span className="font-bold text-slate-700 truncate">
                      {doc.title}
                    </span>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[9px] font-bold border uppercase tracking-wider shrink-0 ${
                      isApproved
                        ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                        : "bg-amber-50 text-amber-600 border-amber-100"
                    }`}
                  >
                    {isApproved ? "Approved" : "Verifying"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Sync Info Badges */}
        <div className="w-full flex items-center justify-center gap-6 text-xs text-slate-400 font-bold border-t border-b border-slate-100 py-3 mb-2">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
            Compliance Audit
          </span>
          <span className="h-4 w-px bg-slate-200" />
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-[#002856] shrink-0" />
            Corporate Verification
          </span>
        </div>

        {/* Refresh button */}
        <button
          type="button"
          onClick={handleRefresh}
          disabled={refreshing}
          className="w-full sm:max-w-xs h-11 bg-[#002856] hover:bg-[#003975] text-white rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50 mt-4 active:scale-[0.99] cursor-pointer shadow-sm"
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

  // State: Active Checklist (Accordion Quest Deck)
  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 w-full font-sans max-w-xl mx-auto flex flex-col shadow-sm">
      {/* progress header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-extrabold text-[#002856] tracking-tight">
            Supporting Documents
          </h2>
          <p className="text-zinc-400 text-xs font-medium mt-0.5">
            Complete each document upload to secure your corporate file.
          </p>
        </div>

        {/* Progress pill */}
        <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-full text-[10px] font-bold text-[#002856]">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          <span>
            {uploadedCount} / {requiredDocs.length} Completed
          </span>
        </div>
      </div>

      {/* Accordion Quest Cards Queue */}
      <div className="space-y-3.5">
        {requiredDocs.map((doc) => {
          const fileObj = candidateDocs[doc.id];
          const isUploaded = !!fileObj?.key;
          const isExpanded = expandedDocId === doc.id;

          let statusStyle = "bg-slate-50 text-slate-400 border-slate-200";
          let statusLabel = "Pending Upload";

          if (isUploaded) {
            if (fileObj.status === "approved") {
              statusLabel = "Approved";
              statusStyle = "bg-emerald-50 text-emerald-700 border-emerald-100";
            } else if (fileObj.status === "rejected") {
              statusLabel = "Revision Required";
              statusStyle = "bg-rose-50 text-rose-600 border-rose-100";
            } else {
              statusLabel = "Under Review";
              statusStyle = "bg-amber-50 text-amber-600 border-amber-100";
            }
          }

          const hasAllowedExts = doc.allowed_extensions || [
            "pdf",
            "doc",
            "docx",
            "png",
            "jpg",
            "jpeg",
          ];
          const acceptString = hasAllowedExts.map((e) => `.${e}`).join(",");

          return (
            <motion.div
              key={doc.id}
              layout
              className={`border rounded-2xl overflow-hidden bg-white transition-all duration-200 ${
                isExpanded
                  ? "border-slate-200 shadow-sm"
                  : "border-slate-100 hover:border-slate-200"
              }`}
            >
              {/* Header block */}
              <div
                onClick={() => setExpandedDocId(doc.id)}
                className={`p-4 flex items-center justify-between transition-colors select-none ${
                  isExpanded
                    ? "bg-slate-50/20"
                    : "bg-white cursor-pointer hover:bg-slate-50/20"
                }`}
              >
                <div className="flex items-center gap-3 pr-4 min-w-0">
                  {/* Status Indicator circle */}
                  <div
                    className={`w-6 h-6 rounded-full border flex items-center justify-center shrink-0 text-[10px] ${statusStyle}`}
                  >
                    {isUploaded && fileObj.status === "approved" ? (
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-650 shrink-0" />
                    ) : (
                      <div className="w-1.5 h-1.5 rounded-full bg-current" />
                    )}
                  </div>
                  <div className="min-w-0 text-left">
                    <p
                      className={`text-xs sm:text-sm font-bold ${isExpanded ? "text-slate-800" : "text-slate-700"} truncate`}
                    >
                      {doc.title}
                    </p>
                    {isUploaded && !isExpanded && (
                      <p className="text-[9px] text-zinc-400 font-medium truncate max-w-[200px] mt-0.5">
                        {fileObj.fileName}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[9px] font-bold border uppercase tracking-wider ${statusStyle}`}
                  >
                    {statusLabel}
                  </span>
                  {!isExpanded && (
                    <ChevronRight className="w-4 h-4 text-slate-400 opacity-60" />
                  )}
                </div>
              </div>

              {/* Card body dropzone */}
              <AnimatePresence initial={false}>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: "auto" }}
                    exit={{ height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="border-t border-slate-100 bg-white"
                  >
                    <div className="p-4 flex flex-col gap-3 text-left">
                      {doc.description && (
                        <p className="text-xs text-zinc-500 leading-relaxed font-medium bg-slate-50/50 p-3 rounded-xl border border-slate-100/50">
                          {doc.description}
                        </p>
                      )}

                      {fileObj?.status === "rejected" && (
                        <div className="flex items-start gap-2.5 text-rose-600 text-xs font-semibold p-3 bg-rose-50/50 rounded-xl border border-rose-100">
                          <AlertCircle className="w-4.5 h-4.5 shrink-0 mt-0.5" />
                          <div>
                            <p className="font-bold">Document Rejected</p>
                            <p className="text-[10px] text-rose-500 mt-0.5 font-medium leading-relaxed">
                              Please review details and upload a corrected copy
                              in the requested formats.
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Dropzone area */}
                      {!isUploaded || fileObj.status === "rejected" ? (
                        <div className="relative border border-dashed border-slate-200 hover:border-slate-400 rounded-xl p-6 flex flex-col items-center justify-center bg-slate-50/10 hover:bg-slate-50/30 transition-all duration-200 cursor-pointer">
                          <input
                            type="file"
                            accept={acceptString}
                            disabled={uploadingDocId === doc.id}
                            onChange={(e) =>
                              handleUpload(doc.id, e.target.files?.[0] || null)
                            }
                            className="absolute inset-0 opacity-0 cursor-pointer z-10"
                          />
                          <div className="flex flex-col items-center text-center">
                            {uploadingDocId === doc.id ? (
                              <div className="flex flex-col items-center gap-2">
                                <div className="w-8 h-8 border-3 border-[#002856] border-t-transparent rounded-full animate-spin" />
                                <p className="text-xs font-bold text-[#002856] animate-pulse">
                                  Uploading file...
                                </p>
                              </div>
                            ) : (
                              <>
                                <div className="w-10 h-10 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-500 mb-3">
                                  <FileUp className="w-5 h-5" />
                                </div>
                                <p className="text-xs font-bold text-slate-700">
                                  Click or Drag to Upload
                                </p>
                                <p className="text-[10px] text-zinc-400 font-medium mt-1 leading-relaxed">
                                  Supports:{" "}
                                  {formatAllowedExts(doc.allowed_extensions)} up
                                  to 10MB
                                </p>
                              </>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between p-3 bg-slate-50/50 border border-slate-100 rounded-xl">
                          <div className="flex items-center gap-2.5 pr-4 min-w-0">
                            <FileText className="w-5 h-5 text-slate-400 shrink-0" />
                            <div className="min-w-0 text-left">
                              <p className="text-xs font-bold text-slate-800 truncate">
                                {fileObj.fileName}
                              </p>
                              {fileObj.uploadedAt && (
                                <p className="text-[9px] text-zinc-400 font-medium mt-0.5">
                                  Uploaded:{" "}
                                  {new Date(
                                    fileObj.uploadedAt,
                                  ).toLocaleDateString()}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {fileObj.downloadUrl && (
                              <a
                                href={fileObj.downloadUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="h-8 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 font-bold text-[10px] flex items-center gap-1 transition-colors cursor-pointer shadow-sm"
                              >
                                <span>View</span>
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                            {fileObj.status !== "approved" && (
                              <button
                                type="button"
                                disabled={deletingDocId === doc.id}
                                onClick={(e) => handleDelete(e, doc.id)}
                                className="w-8 h-8 rounded-lg bg-white border border-slate-200 hover:bg-rose-50 text-slate-400 hover:text-red-500 flex items-center justify-center transition-colors shrink-0 z-20 cursor-pointer shadow-sm"
                                title="Remove File"
                              >
                                {deletingDocId === doc.id ? (
                                  <div className="w-3.5 h-3.5 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                                ) : (
                                  <X className="w-4 h-4" />
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>

      {error && (
        <div className="flex items-start gap-2.5 text-red-500 text-xs font-semibold p-3 bg-red-50/50 rounded-xl border border-red-100 w-full mt-5">
          <AlertCircle className="w-4.5 h-4.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};

export default AdditionalDocumentsStep;
