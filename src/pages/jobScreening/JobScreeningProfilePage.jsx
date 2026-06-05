import React, { useState, useEffect } from "react";
import {
  User,
  Mail,
  Phone,
  Award,
  ShieldCheck,
  FileText,
  CheckCircle,
  AlertCircle,
  Upload,
  ExternalLink,
  RefreshCw,
  ChevronRight,
  X,
  Sparkles,
} from "lucide-react";
import {
  getProgress,
  uploadProfileDocs,
  uploadAdditionalDoc,
  deleteAdditionalDoc,
} from "../../api/jobScreeningApi";
import { toast } from "react-hot-toast";

export default function JobScreeningProfilePage() {
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Form fields
  const [fullname, setFullname] = useState("");
  const [email, setEmail] = useState("");
  const [level, setLevel] = useState("");

  // Upload fields
  const [resumeFile, setResumeFile] = useState(null);
  const [certFile, setCertFile] = useState(null);
  const [uploadingDocId, setUploadingDocId] = useState(null);
  const [deletingDocId, setDeletingDocId] = useState(null);

  const fetchProgress = async () => {
    try {
      setLoading(true);
      setError("");
      const { data } = await getProgress();
      if (data?.success) {
        setProgress(data.data);
        setFullname(data.data.candidate_name || "");
        setEmail(data.data.candidate_email || "");
        setLevel(data.data.language_level || data.data.current_profeciency_level || "");
      } else {
        setError("Failed to load profile details");
      }
    } catch (err) {
      console.error(err);
      setError("Failed to fetch profile settings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProgress();
  }, []);

  const handleSaveInfo = async (e) => {
    e.preventDefault();
    if (!fullname.trim()) {
      toast.error("Full name is required");
      return;
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Please enter a valid email address");
      return;
    }

    try {
      setSaving(true);
      const formData = new FormData();
      formData.append("fullname", fullname.trim());
      formData.append("email", email.trim());
      formData.append("current_profeciency_level", level);

      const { data } = await uploadProfileDocs(formData);
      if (data?.success) {
        setProgress(data.data);
        toast.success("Profile details updated successfully");
      } else {
        toast.error("Failed to update profile");
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to update profile info");
    } finally {
      setSaving(false);
    }
  };

  const handleUploadResume = async (file) => {
    if (!file) return;
    try {
      setSaving(true);
      const formData = new FormData();
      formData.append("resume", file);
      const { data } = await uploadProfileDocs(formData);
      if (data?.success) {
        setProgress(data.data);
        setResumeFile(null);
        toast.success("Resume updated successfully");
      } else {
        toast.error("Failed to upload resume");
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Error uploading resume");
    } finally {
      setSaving(false);
    }
  };

  const handleUploadCert = async (file) => {
    if (!file) return;
    try {
      setSaving(true);
      const formData = new FormData();
      formData.append("certificate", file);
      const { data } = await uploadProfileDocs(formData);
      if (data?.success) {
        setProgress(data.data);
        setCertFile(null);
        toast.success("Language certificate updated successfully");
      } else {
        toast.error("Failed to upload language certificate");
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Error uploading certificate");
    } finally {
      setSaving(false);
    }
  };

  const handleUploadAdditional = async (docId, file) => {
    if (!file) return;
    setUploadingDocId(docId);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const { data } = await uploadAdditionalDoc(docId, formData);
      if (data?.success) {
        setProgress(data.data);
        toast.success("Supporting document uploaded");
      } else {
        toast.error("Failed to upload document");
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Error uploading document");
    } finally {
      setUploadingDocId(null);
    }
  };

  const handleDeleteAdditional = async (docId) => {
    setDeletingDocId(docId);
    try {
      const { data } = await deleteAdditionalDoc(docId);
      if (data?.success) {
        setProgress(data.data);
        toast.success("Supporting document removed");
      } else {
        toast.error("Failed to delete document");
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Error removing document");
    } finally {
      setDeletingDocId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-8 h-8 border-3 border-[#002856] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white p-4">
        <div className="max-w-md w-full bg-white p-6 rounded-2xl shadow-sm border border-slate-200 text-center">
          <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-[#002856] mb-2">Error Loading Profile</h2>
          <p className="text-zinc-500 text-xs mb-6">{error}</p>
          <button
            onClick={fetchProgress}
            className="w-full py-2.5 bg-[#002856] text-white rounded-xl text-xs font-bold transition-all"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const resumeStatus = progress?.resume_status || "pending";
  const certStatus = progress?.lang_cert_status || "pending";
  const requiredDocs = progress?.resolvedRequiredDocs || [];
  const candidateDocs = progress?.additional_documents || {};

  return (
    <div className="min-h-screen bg-slate-50/50 py-8 font-sans">
      <div className="max-w-3xl mx-auto px-4 flex flex-col gap-6">
        {/* Profile Title Header */}
        <div className="flex justify-between items-center bg-white border border-slate-200/80 p-5 rounded-2xl shadow-sm">
          <div>
            <h1 className="text-xl font-extrabold text-[#002856]">
              Job Screening Profile
            </h1>
            <p className="text-xs text-zinc-400 mt-1 font-medium">
              Manage your personal details, credentials, and verify supporting files.
            </p>
          </div>
          <button
            onClick={fetchProgress}
            className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors text-slate-500"
            title="Refresh Profile"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Basic Info Details */}
        <div className="bg-white border border-slate-200/85 rounded-2xl p-6 shadow-sm">
          <h2 className="text-sm font-bold text-[#002856] uppercase tracking-wider mb-5 flex items-center gap-2">
            <User className="w-4 h-4 text-slate-400" />
            Basic Candidate Information
          </h2>

          <form onSubmit={handleSaveInfo} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Full Name */}
              <div className="flex flex-col gap-1.5 text-left">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Full Name
                </label>
                <input
                  type="text"
                  value={fullname}
                  onChange={(e) => setFullname(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-[#002856] focus:ring-1 focus:ring-[#002856] transition-colors"
                  placeholder="Enter your name"
                />
              </div>

              {/* Email Address */}
              <div className="flex flex-col gap-1.5 text-left">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-[#002856] focus:ring-1 focus:ring-[#002856] transition-colors"
                  placeholder="Enter your email"
                />
              </div>

              {/* Phone (Read only) */}
              <div className="flex flex-col gap-1.5 text-left">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Phone Number
                </label>
                <div className="w-full border border-slate-200 bg-slate-50/50 rounded-xl px-3.5 py-2.5 text-xs text-slate-500 flex items-center gap-2 select-none">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  {progress?.candidate_phone || ""}
                </div>
              </div>

              {/* Proficiency Level */}
              <div className="flex flex-col gap-1.5 text-left">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Proficiency Level
                </label>
                <div className="relative">
                  <select
                    value={level}
                    onChange={(e) => setLevel(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-[#002856] focus:ring-1 focus:ring-[#002856] transition-colors appearance-none bg-white"
                  >
                    <option value="">Select Level</option>
                    <option value="B1">B1</option>
                    <option value="B2">B2</option>
                  </select>
                  <ChevronRight className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 rotate-90 pointer-events-none" />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2.5 bg-[#002856] text-white rounded-xl text-xs font-bold hover:bg-[#003975] transition-colors disabled:opacity-50"
              >
                {saving ? "Saving Changes..." : "Save Basic Info"}
              </button>
            </div>
          </form>
        </div>

        {/* Profile Documents */}
        <div className="bg-white border border-slate-200/85 rounded-2xl p-6 shadow-sm">
          <h2 className="text-sm font-bold text-[#002856] uppercase tracking-wider mb-5 flex items-center gap-2">
            <Award className="w-4 h-4 text-slate-400" />
            Core Credentials
          </h2>

          <div className="space-y-4">
            {/* Resume / CV Card */}
            <div className="border border-slate-100 rounded-2xl p-4 flex flex-col gap-3.5 bg-white">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <FileText className="w-4.5 h-4.5 text-[#002856]" />
                  <span className="text-xs font-bold text-slate-800">Resume / CV</span>
                </div>
                <span
                  className={`px-2 py-0.5 rounded-full text-[9px] font-bold border uppercase tracking-wider ${
                    resumeStatus === "approved"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                      : resumeStatus === "rejected"
                        ? "bg-rose-50 text-rose-600 border-rose-100"
                        : "bg-amber-50 text-amber-600 border-amber-100"
                  }`}
                >
                  {resumeStatus === "approved"
                    ? "Approved"
                    : resumeStatus === "rejected"
                      ? "Revision Required"
                      : "Under Review"}
                </span>
              </div>

              {resumeStatus === "rejected" && progress?.profile_rejection_reason && (
                <div className="flex items-start gap-2 text-rose-600 text-xs font-medium p-3 bg-rose-50/50 rounded-xl border border-rose-100">
                  <AlertCircle className="w-4.5 h-4.5 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">Rejection Feedback:</p>
                    <p className="text-[10px] text-rose-500 mt-0.5 leading-relaxed">
                      {progress.profile_rejection_reason}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                <div className="text-[10px] text-zinc-500 truncate max-w-md">
                  {progress?.resume_url ? (
                    <span className="font-semibold text-slate-700">Uploaded Resume PDF</span>
                  ) : (
                    "No resume file uploaded yet."
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {progress?.resumeDownloadUrl && (
                    <a
                      href={progress.resumeDownloadUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="h-8 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 font-bold text-[10px] flex items-center gap-1 transition-colors shadow-sm"
                    >
                      <span>View</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}

                  {resumeStatus !== "approved" && (
                    <div className="relative h-8 px-3 rounded-lg bg-[#002856] hover:bg-[#003975] text-white font-bold text-[10px] flex items-center justify-center gap-1 transition-colors cursor-pointer shadow-sm">
                      <input
                        type="file"
                        accept=".pdf"
                        onChange={(e) => handleUploadResume(e.target.files?.[0])}
                        className="absolute inset-0 opacity-0 cursor-pointer z-10"
                      />
                      <Upload className="w-3.5 h-3.5" />
                      <span>{progress?.resume_url ? "Replace" : "Upload"}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Language Certificate Card */}
            <div className="border border-slate-100 rounded-2xl p-4 flex flex-col gap-3.5 bg-white">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <FileText className="w-4.5 h-4.5 text-[#002856]" />
                  <span className="text-xs font-bold text-slate-800">Language Certificate</span>
                </div>
                <span
                  className={`px-2 py-0.5 rounded-full text-[9px] font-bold border uppercase tracking-wider ${
                    certStatus === "approved"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                      : certStatus === "rejected"
                        ? "bg-rose-50 text-rose-600 border-rose-100"
                        : "bg-amber-50 text-amber-600 border-amber-100"
                  }`}
                >
                  {certStatus === "approved"
                    ? "Approved"
                    : certStatus === "rejected"
                      ? "Revision Required"
                      : "Under Review"}
                </span>
              </div>

              {certStatus === "rejected" && progress?.profile_rejection_reason && (
                <div className="flex items-start gap-2 text-rose-600 text-xs font-medium p-3 bg-rose-50/50 rounded-xl border border-rose-100">
                  <AlertCircle className="w-4.5 h-4.5 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">Rejection Feedback:</p>
                    <p className="text-[10px] text-rose-500 mt-0.5 leading-relaxed">
                      {progress.profile_rejection_reason}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                <div className="text-[10px] text-zinc-500 truncate max-w-md">
                  {progress?.lang_cert_url ? (
                    <span className="font-semibold text-slate-700">Uploaded Certificate PDF</span>
                  ) : (
                    "No certificate file uploaded yet."
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {progress?.certDownloadUrl && (
                    <a
                      href={progress.certDownloadUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="h-8 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 font-bold text-[10px] flex items-center gap-1 transition-colors shadow-sm"
                    >
                      <span>View</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}

                  {certStatus !== "approved" && (
                    <div className="relative h-8 px-3 rounded-lg bg-[#002856] hover:bg-[#003975] text-white font-bold text-[10px] flex items-center justify-center gap-1 transition-colors cursor-pointer shadow-sm">
                      <input
                        type="file"
                        accept=".pdf"
                        onChange={(e) => handleUploadCert(e.target.files?.[0])}
                        className="absolute inset-0 opacity-0 cursor-pointer z-10"
                      />
                      <Upload className="w-3.5 h-3.5" />
                      <span>{progress?.lang_cert_url ? "Replace" : "Upload"}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Supporting Documents (Additional Documents) */}
        {requiredDocs.length > 0 && (
          <div className="bg-white border border-slate-200/85 rounded-2xl p-6 shadow-sm">
            <h2 className="text-sm font-bold text-[#002856] uppercase tracking-wider mb-5 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-slate-400" />
              Required Supporting Documents
            </h2>

            <div className="space-y-4">
              {requiredDocs.map((doc) => {
                const fileObj = candidateDocs[doc.id];
                const isUploaded = !!fileObj?.key;
                
                let docStatus = "pending";
                let docBadge = "Awaiting Upload";
                let badgeStyle = "bg-slate-50 text-slate-400 border-slate-200";

                if (isUploaded) {
                  docStatus = fileObj.status || "pending";
                  if (docStatus === "approved") {
                    docBadge = "Approved";
                    badgeStyle = "bg-emerald-50 text-emerald-700 border-emerald-100";
                  } else if (docStatus === "rejected") {
                    docBadge = "Revision Required";
                    badgeStyle = "bg-rose-50 text-rose-600 border-rose-100";
                  } else {
                    docBadge = "Under Review";
                    badgeStyle = "bg-amber-50 text-amber-600 border-amber-100";
                  }
                }

                const allowedExts = doc.allowed_extensions || ["pdf", "png", "jpg", "jpeg"];
                const acceptString = allowedExts.map((e) => `.${e}`).join(",");

                return (
                  <div key={doc.id} className="border border-slate-100 rounded-2xl p-4 flex flex-col gap-3.5 bg-white text-left">
                    <div className="flex justify-between items-center gap-3">
                      <div>
                        <span className="text-xs font-bold text-slate-800 block">{doc.title}</span>
                        {doc.description && (
                          <span className="text-[10px] text-zinc-400 font-medium block mt-0.5">
                            {doc.description}
                          </span>
                        )}
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border uppercase tracking-wider shrink-0 ${badgeStyle}`}>
                        {docBadge}
                      </span>
                    </div>

                    {docStatus === "rejected" && (
                      <div className="flex items-start gap-2 text-rose-600 text-xs font-medium p-3 bg-rose-50/50 rounded-xl border border-rose-100">
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold">Rejection Feedback:</p>
                          <p className="text-[10px] text-rose-500 mt-0.5 leading-relaxed">
                            Please check file layout and re-upload in permitted formats: {allowedExts.join(", ").toUpperCase()}
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                      <div className="text-[10px] text-zinc-500 truncate max-w-md">
                        {isUploaded ? (
                          <span className="font-semibold text-slate-700">{fileObj.fileName}</span>
                        ) : (
                          "Awaiting file submission."
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {isUploaded && fileObj.downloadUrl && (
                          <a
                            href={fileObj.downloadUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="h-8 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 font-bold text-[10px] flex items-center gap-1 transition-colors shadow-sm"
                          >
                            <span>View</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}

                        {isUploaded && docStatus !== "approved" && (
                          <button
                            type="button"
                            disabled={deletingDocId === doc.id}
                            onClick={() => handleDeleteAdditional(doc.id)}
                            className="w-8 h-8 rounded-lg bg-white border border-slate-200 hover:bg-rose-50 text-slate-400 hover:text-red-500 flex items-center justify-center transition-colors shrink-0 shadow-sm"
                          >
                            {deletingDocId === doc.id ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <X className="w-4 h-4" />
                            )}
                          </button>
                        )}

                        {(!isUploaded || docStatus === "rejected") && (
                          <div className="relative h-8 px-3 rounded-lg bg-[#002856] hover:bg-[#003975] text-white font-bold text-[10px] flex items-center justify-center gap-1 transition-colors cursor-pointer shadow-sm">
                            <input
                              type="file"
                              accept={acceptString}
                              disabled={uploadingDocId === doc.id}
                              onChange={(e) => handleUploadAdditional(doc.id, e.target.files?.[0])}
                              className="absolute inset-0 opacity-0 cursor-pointer z-10"
                            />
                            {uploadingDocId === doc.id ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Upload className="w-3.5 h-3.5" />
                            )}
                            <span>{isUploaded ? "Replace" : "Upload"}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
