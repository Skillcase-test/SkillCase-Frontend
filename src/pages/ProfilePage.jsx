import React, { useState, useEffect, useRef, useCallback } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { setUser, logout } from "../redux/auth/authSlice";
import { resetArticleEducation } from "../utils/articleUtils";
import api from "../api/axios";
import { trackFeatureEvent } from "../telemetry/events";
import {
  getProgress,
  uploadProfileDocs,
  uploadAdditionalDoc,
  deleteAdditionalDoc,
} from "../api/jobScreeningApi";
import { Document, Page, pdfjs } from "react-pdf";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import * as LucideIcons from "lucide-react";
import mayaSad from "../assets/onboarding/mayaSad.webp";

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker;

// Icon fallbacks for requested Figma design icons
const FileCheckCornerIcon =
  LucideIcons.FileCheck || LucideIcons.FileText || LucideIcons.File;

const MessageCircleQuestionMarkIcon =
  LucideIcons.MessageCircleQuestionMark ||
  LucideIcons.HelpCircle ||
  LucideIcons.MessageSquare;

const ArrowLeftIcon = LucideIcons.ArrowLeft || LucideIcons.ChevronLeft;
const CheckIcon = LucideIcons.Check;
const XIcon = LucideIcons.X;
const UploadIcon = LucideIcons.Upload;
const ExternalLinkIcon = LucideIcons.ExternalLink;
const RefreshCwIcon = LucideIcons.RefreshCw;
const CameraIcon = LucideIcons.Camera;
const ChevronDownIcon = LucideIcons.ChevronDown;
const InfoIcon = LucideIcons.Info || LucideIcons.HelpCircle;
const FileTextIcon = LucideIcons.FileText || LucideIcons.File;
const Maximize2Icon = LucideIcons.Maximize2 || LucideIcons.Expand;

const CORE_DOCUMENT_TYPES = new Set(["resume", "certificate"]);
const CORE_DOCUMENT_ACCEPT = ".pdf,application/pdf";
const ADDITIONAL_DOCUMENT_ACCEPT =
  ".pdf,.doc,.docx,.png,.jpg,.jpeg,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/png,image/jpeg";

function isAllowedDocumentFile(file, docType) {
  if (!file) return false;
  const fileName = file.name?.toLowerCase() || "";
  if (CORE_DOCUMENT_TYPES.has(docType)) {
    return file.type === "application/pdf" || fileName.endsWith(".pdf");
  }
  return (
    file.type === "application/pdf" ||
    file.type === "application/msword" ||
    file.type ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    [".pdf", ".doc", ".docx", ".png", ".jpg", ".jpeg"].some((ext) =>
      fileName.endsWith(ext),
    )
  );
}

const DEFAULT_AVATAR = (
  <svg viewBox="0 0 100 100" className="w-full h-full" fill="none">
    <circle cx="50" cy="50" r="50" fill="#D1D5DB" />
    <circle cx="50" cy="38" r="16" fill="#9CA3AF" />
    <ellipse cx="50" cy="78" rx="28" ry="20" fill="#9CA3AF" />
  </svg>
);

const QUALIFICATION_OPTIONS = [
  { value: "GNM Nursing", label: "GNM Nursing" },
  { value: "BSc Nursing", label: "BSc Nursing" },
  { value: "Post Basic BSc Nursing", label: "Post Basic BSc Nursing" },
  { value: "MSc Nursing", label: "MSc Nursing" },
  { value: "ANM Nursing", label: "ANM Nursing" },
  { value: "Physiotherapist", label: "Physiotherapist" },
  { value: "Doctors", label: "Doctors" },
  { value: "Pharmacists", label: "Pharmacists" },
  { value: "Dentists", label: "Dentists" },
  { value: "Others", label: "Others" },
];

const EXPERIENCE_OPTIONS = [
  { value: "Fresher", label: "Fresher" },
  { value: "Less than 1 year", label: "Less than 1 year" },
  { value: "1-2 years", label: "1-2 years" },
  { value: "2-3 years", label: "2-3 years" },
  { value: "3-5 years", label: "3-5 years" },
  { value: "5-10 years", label: "5-10 years" },
  { value: "10+ years", label: "10+ years" },
];

const GENDER_OPTIONS = [
  { value: "Male", label: "Male" },
  { value: "Female", label: "Female" },
  { value: "Other", label: "Other" },
];

// Custom Select Component (No OS native blue menus)
function CustomSelect({
  value,
  onChange,
  options,
  placeholder,
  disabled = false,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  const selectedOption = options.find((opt) => opt.value === value);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (disabled) {
    return (
      <div className="w-full h-11 px-3.5 bg-white border border-slate-300 rounded-lg text-sm font-normal text-slate-900 flex items-center justify-between shadow-2xs select-none cursor-not-allowed">
        <span>{selectedOption?.label || value || placeholder}</span>
        <ChevronDownIcon className="w-4 h-4 text-slate-500" />
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative w-full select-none">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full h-11 px-3.5 bg-white border border-slate-300 rounded-lg text-sm font-normal text-slate-900 flex items-center justify-between shadow-2xs hover:border-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-all cursor-pointer text-left"
      >
        <span
          className={
            selectedOption?.value ? "text-slate-900" : "text-slate-400"
          }
        >
          {selectedOption?.label || placeholder}
        </span>
        <ChevronDownIcon
          className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${
            isOpen ? "rotate-180 text-blue-[#002856]" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-white border border-slate-200 rounded-xl shadow-xl max-h-56 overflow-y-auto py-1 animate-in fade-in zoom-in-95 duration-100">
          {options.map((opt) => (
            <div
              key={opt.value}
              onClick={() => {
                onChange(opt.value);
                setIsOpen(false);
              }}
              className={`px-3.5 py-2.5 text-sm cursor-pointer transition-colors flex items-center justify-between ${
                opt.value === value
                  ? "bg-blue-50 text-[#002856] font-semibold"
                  : "text-slate-700 hover:bg-slate-50 font-normal"
              }`}
            >
              <span>{opt.label}</span>
              {opt.value === value && (
                <CheckIcon className="w-4 h-4 text-[#002856]" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PdfCanvasPreview({ fileUrl }) {
  return (
    <div className="w-full h-full flex items-center justify-center overflow-hidden rounded-xl">
      <Document
        file={fileUrl}
        loading={
          <div className="flex flex-col items-center gap-2 text-[#002856]">
            <RefreshCwIcon className="w-6 h-6 animate-spin text-[#002856]" />
            <span className="text-xs font-medium">Loading Document...</span>
          </div>
        }
        error={
          <div className="flex flex-col items-center gap-2 text-slate-400">
            <FileTextIcon className="w-8 h-8 text-slate-400" />
            <span className="text-xs font-medium">
              Unable to load PDF preview
            </span>
          </div>
        }
      >
        <Page
          pageNumber={1}
          renderTextLayer={false}
          renderAnnotationLayer={false}
          height={290}
          className="rounded-xl overflow-hidden shadow-sm flex items-center justify-center"
        />
      </Document>
    </div>
  );
}

export default function ProfilePage() {
  const { user, isAuthenticated } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const modalFileInputRef = useRef(null);
  const aliveRef = useRef(true);

  // Active view tab inside ProfilePage ("profile" | "documents")
  const [activeTab, setActiveTab] = useState("profile");

  // Upload Modal & Preview Modal States
  const [uploadModal, setUploadModal] = useState({
    open: false,
    docType: null, // 'resume' | 'certificate' | docId
    docTitle: "",
  });
  const [selectedFileForUpload, setSelectedFileForUpload] = useState(null);

  const [previewModal, setPreviewModal] = useState({
    open: false,
    docType: null,
    docTitle: "",
    url: "",
    fileName: "",
  });

  // Form state
  const [form, setForm] = useState({
    fullname: "",
    email: "",
    dob: "",
    gender: "",
    qualification: "",
    language_level: "",
    experience: "",
  });

  const [profilePicUrl, setProfilePicUrl] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");

  // Documents State
  const [docProgress, setDocProgress] = useState(null);
  const [uploadingResume, setUploadingResume] = useState(false);
  const [uploadingCert, setUploadingCert] = useState(false);
  const [uploadingDocId, setUploadingDocId] = useState(null);
  const [deletingDocId, setDeletingDocId] = useState(null);

  // Loading & Action UI States
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [toast, setToast] = useState({ show: false, msg: "", type: "" });
  const [cancelling, setCancelling] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  function showToast(msg, type = "success") {
    setToast({ show: true, msg, type });
    setTimeout(() => {
      if (aliveRef.current) {
        setToast({ show: false, msg: "", type: "" });
      }
    }, 3500);
  }

  const fetchProfileData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get("/user/profile");
      if (!aliveRef.current) return;
      const p = res.data.profile;
      const germanLevel = p.current_profeciency_level || p.language_level || "";
      setForm({
        fullname: p.fullname || "",
        email: p.email || "",
        dob: p.dob ? p.dob.split("T")[0] : "",
        gender: p.gender || "",
        qualification: p.qualification || "",
        language_level: p.language_level || germanLevel,
        experience: p.experience || "",
      });
      setProfilePicUrl(p.profile_pic_url || "");
      setPhoneNumber(p.number || "");

      trackFeatureEvent("profile", "loaded", {
        lifecycle: "succeeded",
        attributes: { status: String(p.status || 0) },
      });
    } catch (err) {
      console.error("Error fetching profile:", err);
      trackFeatureEvent("profile", "load_failed", {
        lifecycle: "failed",
        reasonCode: "api_failed",
      });
      if (aliveRef.current)
        showToast("Failed to load profile details", "error");
    } finally {
      if (aliveRef.current) setLoading(false);
    }
  }, []);

  const fetchDocProgressData = useCallback(async () => {
    try {
      const { data } = await getProgress();
      if (!aliveRef.current) return;
      if (data?.success) {
        setDocProgress(data.data);
      }
    } catch (err) {
      console.error("Error fetching document progress:", err);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    fetchProfileData();
    fetchDocProgressData();
  }, [isAuthenticated, navigate, fetchProfileData, fetchDocProgressData]);

  const handleSelectChange = (fieldName, val) => {
    setForm((prev) => ({ ...prev, [fieldName]: val }));
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.fullname.trim()) {
      showToast("Full name is required", "error");
      return;
    }

    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      showToast("Please enter a valid email address", "error");
      return;
    }

    try {
      setSaving(true);
      trackFeatureEvent("profile", "save_started", { lifecycle: "started" });
      const res = await api.put("/user/profile", form);
      const updatedProfile = res.data.profile;

      dispatch(
        setUser({
          ...user,
          fullname: updatedProfile.fullname,
          profile_pic_url: updatedProfile.profile_pic_url,
        }),
      );

      showToast("Profile updated successfully", "success");
      trackFeatureEvent("profile", "saved", { lifecycle: "succeeded" });
    } catch (err) {
      console.error("Profile save error:", err);
      const errMsg = err.response?.data?.msg || "Failed to update profile";
      showToast(errMsg, "error");
    } finally {
      if (aliveRef.current) setSaving(false);
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      showToast("Image must be less than 5MB", "error");
      return;
    }

    const formData = new FormData();
    formData.append("photo", file);

    try {
      setUploadingPhoto(true);
      const res = await api.post("/upload/user-profile-photo", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (res.data.success) {
        setProfilePicUrl(res.data.url);
        dispatch(setUser({ ...user, profile_pic_url: res.data.url }));
        showToast("Profile photo updated", "success");
      }
    } catch (err) {
      console.error("Photo upload error:", err);
      showToast("Failed to upload photo", "error");
    } finally {
      if (aliveRef.current) setUploadingPhoto(false);
    }
  };

  // Document Upload Handlers
  const handleUploadResume = async (file) => {
    if (!file) return;

    try {
      setUploadingResume(true);
      const formData = new FormData();
      formData.append("resume", file);
      const { data } = await uploadProfileDocs(formData);
      if (data?.success) {
        setDocProgress(data.data);
        showToast("Resume uploaded successfully", "success");
        setUploadModal({ open: false, docType: null, docTitle: "" });
        setSelectedFileForUpload(null);
      } else {
        showToast("Failed to upload resume", "error");
      }
    } catch (err) {
      console.error("Resume upload error:", err);
      showToast(
        err.response?.data?.message || "Error uploading resume",
        "error",
      );
    } finally {
      if (aliveRef.current) setUploadingResume(false);
    }
  };

  const handleUploadCert = async (file) => {
    if (!file) return;

    try {
      setUploadingCert(true);
      const formData = new FormData();
      formData.append("certificate", file);
      const { data } = await uploadProfileDocs(formData);
      if (data?.success) {
        setDocProgress(data.data);
        showToast("Language certificate uploaded successfully", "success");
        setUploadModal({ open: false, docType: null, docTitle: "" });
        setSelectedFileForUpload(null);
      } else {
        showToast("Failed to upload language certificate", "error");
      }
    } catch (err) {
      console.error("Cert upload error:", err);
      showToast(
        err.response?.data?.message || "Error uploading certificate",
        "error",
      );
    } finally {
      if (aliveRef.current) setUploadingCert(false);
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
        setDocProgress(data.data);
        showToast("Supporting document uploaded", "success");
        setUploadModal({ open: false, docType: null, docTitle: "" });
        setSelectedFileForUpload(null);
      } else {
        showToast("Failed to upload document", "error");
      }
    } catch (err) {
      console.error("Additional doc upload error:", err);
      showToast(
        err.response?.data?.message || "Error uploading document",
        "error",
      );
    } finally {
      if (aliveRef.current) setUploadingDocId(null);
    }
  };

  const handleDeleteAdditional = async (docId) => {
    setDeletingDocId(docId);
    try {
      const { data } = await deleteAdditionalDoc(docId);
      if (data?.success) {
        setDocProgress(data.data);
        showToast("Supporting document removed", "success");
      } else {
        showToast("Failed to delete document", "error");
      }
    } catch (err) {
      console.error("Delete doc error:", err);
      showToast(
        err.response?.data?.message || "Error removing document",
        "error",
      );
    } finally {
      if (aliveRef.current) setDeletingDocId(null);
    }
  };

  const openUploadModalFor = (docType, docTitle) => {
    setSelectedFileForUpload(null);
    setUploadModal({ open: true, docType, docTitle });
  };

  const handleModalFileSelect = (e) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (selectedFile.size > 10 * 1024 * 1024) {
      setSelectedFileForUpload(null);
      showToast("Maximum file size is 10MB", "error");
      return;
    }

    if (!isAllowedDocumentFile(selectedFile, uploadModal.docType)) {
      setSelectedFileForUpload(null);
      showToast(
        CORE_DOCUMENT_TYPES.has(uploadModal.docType)
          ? "Only PDF files are allowed"
          : "Supported files are PDF, DOC, DOCX, JPG, and PNG",
        "error",
      );
      return;
    }

    setSelectedFileForUpload(selectedFile);
  };

  const handleModalSubmit = () => {
    if (!selectedFileForUpload) {
      showToast("Please select a file to upload", "error");
      return;
    }

    if (uploadModal.docType === "resume") {
      handleUploadResume(selectedFileForUpload);
    } else if (uploadModal.docType === "certificate") {
      handleUploadCert(selectedFileForUpload);
    } else if (uploadModal.docType) {
      handleUploadAdditional(uploadModal.docType, selectedFileForUpload);
    }
  };

  const openPreviewModalFor = (docType, docTitle, url, fileName = "") => {
    setPreviewModal({
      open: true,
      docType,
      docTitle,
      url,
      fileName,
    });
  };

  const handleDisableAutopay = async () => {
    setCancelling(true);
    try {
      const res = await api.post("/user/disable-autopay");
      dispatch(setUser(res.data.user));
      showToast("Subscription cancelled successfully", "success");
    } catch (err) {
      console.error("Cancel subscription error:", err);
      showToast(
        err.response?.data?.msg || "Failed to cancel subscription",
        "error",
      );
    } finally {
      if (aliveRef.current) {
        setCancelling(false);
        setShowCancelModal(false);
      }
    }
  };

  const openSupportDrawer = () => {
    window.dispatchEvent(new CustomEvent("skillcase:open-support"));
  };

  const handleLogout = () => {
    resetArticleEducation(user?.user_id);
    dispatch(logout());
    navigate("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-8 h-8 border-3 border-[#002856] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const displayName = form.fullname || user?.username || "Amélie Laurent";
  const displayPhone = phoneNumber || user?.number || "8240951870";
  const isAutopayActive = user && user.autopay_enabled === true;

  // Check if candidate is a job screening candidate (for displaying review status pills)
  const isJobScreeningCandidate =
    user?.lg_preferred_mode === "job_screening" ||
    user?.german_preference === "3" ||
    Boolean(docProgress?.candidate_profile_id);

  const resumeStatus = docProgress?.resume_status || "pending";
  const certStatus = docProgress?.lang_cert_status || "pending";

  const requiredDocs =
    isJobScreeningCandidate && Array.isArray(docProgress?.resolvedRequiredDocs)
      ? docProgress.resolvedRequiredDocs
      : [];
  const candidateDocs = docProgress?.additional_documents || {};

  return (
    <div className="min-h-screen bg-black/5 font-sans pb-12">
      {/* Toast Notification */}
      {toast.show && (
        <div
          className={`fixed top-5 right-5 z-[999] px-4 py-3 rounded-xl shadow-lg text-white text-xs font-semibold flex items-center gap-2 transition-all ${
            toast.type === "success" ? "bg-emerald-600" : "bg-rose-600"
          }`}
        >
          <span>{toast.msg}</span>
        </div>
      )}

      {/* Main Profile View vs Your Documents View */}
      {activeTab === "profile" ? (
        <>
          {/* Top Bar Sub-Header for Profile */}
          <div className="bg-white border-b border-slate-200 sticky top-0 z-30">
            <div className="max-w-xl mx-auto px-4 h-12 flex items-center justify-start gap-3">
              <button
                onClick={() => navigate(-1)}
                className="w-7 h-7 flex items-center justify-center rounded-md border-2 border-slate-400 text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                title="Go Back"
              >
                <ArrowLeftIcon className="w-4 h-4 text-slate-500" />
              </button>
              <h1 className="text-base font-semibold text-[#002856] font-['Poppins']">
                Profile
              </h1>
            </div>
          </div>

          <div className="max-w-xl mx-auto px-4 pt-5 flex flex-col gap-6">
            {/* User Avatar Header & Quick Action Buttons */}
            <div className="flex flex-col gap-5">
              <div className="flex items-center gap-4">
                {/* Original Avatar with Camera Overlay */}
                <div className="relative w-20 h-20 shrink-0">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingPhoto}
                    className="w-full h-full rounded-full overflow-hidden border-2 border-slate-200 hover:border-[#002856] transition-colors cursor-pointer relative group bg-white shadow-2xs"
                  >
                    {profilePicUrl ? (
                      <img
                        src={profilePicUrl}
                        alt="Profile"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      DEFAULT_AVATAR
                    )}
                    {uploadingPhoto && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-full">
                        <RefreshCwIcon className="w-5 h-5 text-white animate-spin" />
                      </div>
                    )}
                  </button>
                  {!uploadingPhoto && (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute bottom-0 right-0 w-6.5 h-6.5 bg-white rounded-full border border-slate-300 flex items-center justify-center shadow-xs cursor-pointer hover:bg-slate-50 transition-colors"
                    >
                      <CameraIcon className="w-3.5 h-3.5 text-slate-600" />
                    </button>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handlePhotoUpload}
                  />
                </div>

                {/* Name & Phone */}
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-semibold text-[#101828] truncate leading-7">
                    {displayName}
                  </h2>
                  <p className="text-base font-normal text-slate-600 truncate leading-6">
                    {displayPhone}
                  </p>
                </div>
              </div>

              {/* Quick Action Row: Your Documents & Help & Support */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setActiveTab("documents")}
                  className="px-3 py-3.5 bg-white rounded-lg inline-flex justify-center items-center gap-2 border border-transparent shadow-xs hover:bg-slate-50 cursor-pointer transition-colors"
                >
                  <FileCheckCornerIcon className="w-5 h-5 text-black shrink-0" />
                  <span className="text-center text-black text-xs font-medium font-['Poppins']">
                    Your Documents
                  </span>
                </button>

                <button
                  onClick={openSupportDrawer}
                  className="px-3 py-3.5 bg-white rounded-lg inline-flex justify-center items-center gap-2 border border-transparent shadow-xs hover:bg-slate-50 cursor-pointer transition-colors"
                >
                  <MessageCircleQuestionMarkIcon className="w-5 h-5 text-black shrink-0" />
                  <span className="text-center text-black text-xs font-medium font-['Poppins']">
                    Help & Support
                  </span>
                </button>
              </div>
            </div>

            {/* Your Information Card */}
            <div className="flex flex-col gap-3">
              <h3 className="text-base font-semibold text-[#101828] leading-6">
                Your information
              </h3>

              <div className="p-4 sm:p-5 bg-white rounded-xl border border-slate-300/80 shadow-2xs flex flex-col gap-6">
                <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                  {/* Full Name */}
                  <div className="flex flex-col gap-1.5">
                    <div className="inline-flex items-center gap-0.5">
                      <span className="text-sm font-medium text-slate-700">
                        Full name
                      </span>
                      <span className="text-purple-600 text-sm font-medium">
                        *
                      </span>
                    </div>
                    <input
                      type="text"
                      name="fullname"
                      value={form.fullname}
                      onChange={handleInputChange}
                      placeholder="Avinash Rai"
                      className="w-full h-11 px-3.5 bg-white border border-slate-300 rounded-lg text-sm font-normal text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 shadow-2xs transition-all"
                    />
                  </div>

                  {/* Phone Number with IN Flag Badge */}
                  <div className="flex flex-col gap-1.5">
                    <div className="inline-flex items-center gap-0.5">
                      <span className="text-sm font-medium text-slate-700">
                        Phone Number
                      </span>
                      <span className="text-purple-600 text-sm font-medium">
                        *
                      </span>
                    </div>
                    <div className="flex items-center w-full h-11 bg-white border border-slate-300 rounded-lg shadow-2xs overflow-hidden focus-within:border-blue-600 focus-within:ring-1 focus-within:ring-blue-600 transition-all">
                      <div className="pl-3.5 pr-2.5 h-full bg-slate-50/70 border-r border-slate-200 text-sm font-medium text-slate-600 flex items-center gap-1 shrink-0 select-none">
                        <span>IN</span>
                        <ChevronDownIcon className="w-3.5 h-3.5 text-slate-400" />
                      </div>
                      <input
                        type="text"
                        value={displayPhone}
                        readOnly
                        disabled
                        className="flex-1 h-full px-3 text-sm font-normal text-slate-700 bg-transparent outline-none focus:outline-none cursor-not-allowed select-none border-none ring-0"
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div className="flex flex-col gap-1.5">
                    <div className="inline-flex items-center gap-0.5">
                      <span className="text-sm font-medium text-slate-700">
                        Email
                      </span>
                      <span className="text-purple-600 text-sm font-medium">
                        *
                      </span>
                    </div>
                    <input
                      type="email"
                      name="email"
                      value={form.email}
                      onChange={handleInputChange}
                      placeholder="you@company.com"
                      className="w-full h-11 px-3.5 bg-white border border-slate-300 rounded-lg text-sm font-normal text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 shadow-2xs transition-all"
                    />
                  </div>

                  {/* Educational Qualification Custom Select */}
                  <div className="flex flex-col gap-1.5">
                    <div className="inline-flex items-center gap-0.5">
                      <span className="text-sm font-medium text-slate-700">
                        Educational Qualification
                      </span>
                      <span className="text-purple-600 text-sm font-medium">
                        *
                      </span>
                    </div>
                    <CustomSelect
                      value={form.qualification}
                      onChange={(val) =>
                        handleSelectChange("qualification", val)
                      }
                      options={QUALIFICATION_OPTIONS}
                      placeholder="Select your qualification"
                    />
                  </div>

                  {/* German Language Proficiency (Disabled & Read-Only) */}
                  <div className="flex flex-col gap-1.5">
                    <div className="inline-flex items-center gap-0.5">
                      <span className="text-sm font-medium text-slate-700">
                        German Language Proficiency
                      </span>
                      <span className="text-purple-600 text-sm font-medium">
                        *
                      </span>
                    </div>
                    <CustomSelect
                      value={form.language_level}
                      onChange={() => {}}
                      options={[]}
                      placeholder="Not Set"
                      disabled={true}
                    />
                    <div className="flex items-center gap-1.5 mt-1 text-xs font-medium text-slate-600">
                      <InfoIcon className="w-4 h-4 text-emerald-700 shrink-0" />
                      <span>
                        Raise a support ticket to change your German level
                      </span>
                    </div>
                  </div>

                  {/* Work Experience Custom Select */}
                  <div className="flex flex-col gap-1.5">
                    <div className="inline-flex items-center gap-0.5">
                      <span className="text-sm font-medium text-slate-700">
                        Work Experience
                      </span>
                      <span className="text-purple-600 text-sm font-medium">
                        *
                      </span>
                    </div>
                    <CustomSelect
                      value={form.experience}
                      onChange={(val) => handleSelectChange("experience", val)}
                      options={EXPERIENCE_OPTIONS}
                      placeholder="Select your qualification"
                    />
                  </div>

                  {/* Gender Custom Select */}
                  <div className="flex flex-col gap-1.5">
                    <div className="inline-flex items-center gap-0.5">
                      <span className="text-sm font-medium text-slate-700">
                        Gender
                      </span>
                      <span className="text-purple-600 text-sm font-medium">
                        *
                      </span>
                    </div>
                    <CustomSelect
                      value={form.gender}
                      onChange={(val) => handleSelectChange("gender", val)}
                      options={GENDER_OPTIONS}
                      placeholder="Select your gender"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full h-11 bg-[#002856] hover:bg-[#001e40] text-white text-sm font-semibold rounded-lg shadow-sm transition-colors cursor-pointer disabled:opacity-50 mt-2"
                  >
                    {saving ? "Updating..." : "Update Details"}
                  </button>
                </form>
              </div>
            </div>

            {/* Subscription Card - Only rendered when user has an active subscription */}
            {isAutopayActive && (
              <div className="p-4 sm:p-5 bg-white rounded-xl border border-slate-300/80 shadow-2xs flex flex-col gap-5">
                <div className="flex justify-between items-center">
                  <h3 className="text-base font-semibold text-slate-900">
                    Subscription
                  </h3>
                  <div className="px-2.5 py-0.5 bg-emerald-50 rounded-full border border-emerald-200 flex justify-center items-center">
                    <span className="text-center text-emerald-700 text-xs font-medium">
                      active
                    </span>
                  </div>
                </div>

                <div className="p-4 bg-black/5 rounded-xl flex flex-col gap-4">
                  <div className="text-center">
                    <span className="text-[#002856] text-4xl font-bold">
                      ₹99{" "}
                    </span>
                    <span className="text-[#002856] text-base font-normal">
                      / month
                    </span>
                  </div>

                  <div className="w-full border-t border-stone-300" />

                  <div className="flex flex-col gap-2">
                    {[
                      "Streak Challenges",
                      "German Lessons",
                      "Flashcards",
                      "Pronunciation practice",
                      "Chapter tests",
                    ].map((feature, idx) => (
                      <div
                        key={idx}
                        className="flex justify-between items-center text-xs"
                      >
                        <span className="text-[#002856] font-normal">
                          {feature}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-[#002856] font-medium">
                            Unlimited
                          </span>
                          <div className="w-3.5 h-3.5 bg-green-600 rounded-full flex items-center justify-center text-white shrink-0">
                            <CheckIcon className="w-2.5 h-2.5 stroke-[3]" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowCancelModal(true)}
                  disabled={cancelling}
                  className="w-full h-11 bg-white border border-red-500 text-red-500 hover:bg-red-50 text-sm font-semibold rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                >
                  {cancelling ? "Processing..." : "Cancel subscription"}
                </button>
              </div>
            )}

            {/* Logout Button */}
            <button
              type="button"
              onClick={handleLogout}
              className="w-full h-[48px] rounded-lg text-[16px] font-semibold transition-all bg-gradient-to-r from-amber-200 to-amber-300 text-black shadow-md active:scale-[0.98] border border-[#eec139] cursor-pointer"
            >
              <span>Logout</span>
            </button>
          </div>
        </>
      ) : (
        /* Your Documents View */
        <>
          {/* Sub-Header for Your Documents with Back Arrow */}
          <div className="bg-white border-b border-slate-200 sticky top-0 z-30">
            <div className="max-w-xl mx-auto px-4 h-12 flex items-center justify-start gap-3">
              <button
                onClick={() => setActiveTab("profile")}
                className="w-7 h-7 flex items-center justify-center rounded-md border-2 border-slate-400 text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                title="Back to Profile"
              >
                <ArrowLeftIcon className="w-4 h-4 text-slate-500" />
              </button>
              <h1 className="text-base font-semibold text-[#002856]">
                Your Documents
              </h1>
            </div>
          </div>

          <div className="max-w-xl mx-auto px-4 pt-5 flex flex-col gap-6">
            {/* Resume Section */}
            <div className="flex flex-col gap-2">
              <h3 className="text-base font-semibold text-[#101828] leading-6">
                Resume
              </h3>
              <div className="p-4 sm:p-5 bg-white rounded-xl border border-slate-300/80 shadow-2xs flex flex-col gap-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-slate-700">
                    {docProgress?.resume_url
                      ? "Uploaded Resume"
                      : "Upload Resume"}
                  </span>
                  {/* Status pill rendered ONLY for Job Screening candidates */}
                  {isJobScreeningCandidate && (
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                        resumeStatus === "approved"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : resumeStatus === "rejected"
                            ? "bg-rose-50 text-rose-600 border-rose-200"
                            : docProgress?.resume_url
                              ? "bg-amber-50 text-amber-600 border-amber-200"
                              : "bg-slate-50 text-slate-400 border-slate-200"
                      }`}
                    >
                      {resumeStatus === "approved"
                        ? "Approved"
                        : resumeStatus === "rejected"
                          ? "Revision Required"
                          : docProgress?.resume_url
                            ? "Under Review"
                            : "Pending"}
                    </span>
                  )}
                </div>

                {/* Document Box: If uploaded (Screenshot 2), show icon + filename + View link. If not, show Upload trigger */}
                <div className="relative w-full h-11 px-3.5 bg-white border border-slate-300 rounded-lg flex items-center justify-between shadow-2xs focus-within:border-blue-600 focus-within:ring-1 focus-within:ring-blue-600 transition-all">
                  {docProgress?.resume_url ? (
                    <>
                      <div className="flex items-center gap-2 truncate pr-2">
                        <FileTextIcon className="w-5 h-5 text-slate-900 shrink-0" />
                        <span className="text-sm font-normal text-slate-800 truncate">
                          Resume.pdf
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          openPreviewModalFor(
                            "resume",
                            "Uploaded Resume",
                            docProgress.resumeDownloadUrl,
                            "Resume.pdf",
                          )
                        }
                        className="text-sm font-semibold text-blue-600 hover:text-blue-800 underline cursor-pointer shrink-0"
                      >
                        View
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="text-sm font-normal text-slate-400 truncate">
                        Upload PDF
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          openUploadModalFor("resume", "Upload Resume")
                        }
                        className="cursor-pointer text-slate-700 hover:text-[#002856] transition-colors p-1 shrink-0"
                      >
                        {uploadingResume ? (
                          <RefreshCwIcon className="w-5 h-5 animate-spin text-[#002856]" />
                        ) : (
                          <UploadIcon className="w-5 h-5" />
                        )}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Certificates Section */}
            <div className="flex flex-col gap-2">
              <h3 className="text-base font-semibold text-[#101828] leading-6">
                Certificates
              </h3>

              <div className="p-4 sm:p-5 bg-white rounded-xl border border-slate-300/80 shadow-2xs flex flex-col gap-5">
                {/* Language Certificate */}
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-slate-700">
                      {docProgress?.lang_cert_url
                        ? "Uploaded Language Certificate"
                        : "Language Certificate"}
                    </span>
                    {/* Status pill rendered ONLY for Job Screening candidates */}
                    {isJobScreeningCandidate && (
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                          certStatus === "approved"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : certStatus === "rejected"
                              ? "bg-rose-50 text-rose-600 border-rose-200"
                              : docProgress?.lang_cert_url
                                ? "bg-amber-50 text-amber-600 border-amber-200"
                                : "bg-slate-50 text-slate-400 border-slate-200"
                        }`}
                      >
                        {certStatus === "approved"
                          ? "Approved"
                          : certStatus === "rejected"
                            ? "Revision Required"
                            : docProgress?.lang_cert_url
                              ? "Under Review"
                              : "Pending"}
                      </span>
                    )}
                  </div>

                  <div className="relative w-full h-11 px-3.5 bg-white border border-slate-300 rounded-lg flex items-center justify-between shadow-2xs focus-within:border-blue-600 focus-within:ring-1 focus-within:ring-blue-600 transition-all">
                    {docProgress?.lang_cert_url ? (
                      <>
                        <div className="flex items-center gap-2 truncate pr-2">
                          <FileTextIcon className="w-5 h-5 text-slate-900 shrink-0" />
                          <span className="text-sm font-normal text-slate-800 truncate">
                            Language_Certificate.pdf
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            openPreviewModalFor(
                              "certificate",
                              "Uploaded Language Certificate",
                              docProgress.certDownloadUrl,
                              "Language_Certificate.pdf",
                            )
                          }
                          className="text-sm font-semibold text-blue-600 hover:text-blue-800 underline cursor-pointer shrink-0"
                        >
                          View
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="text-sm font-normal text-slate-400 truncate">
                          Upload PDF
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            openUploadModalFor(
                              "certificate",
                              "Upload Language Certificate",
                            )
                          }
                          className="cursor-pointer text-slate-700 hover:text-[#002856] transition-colors p-1 shrink-0"
                        >
                          {uploadingCert ? (
                            <RefreshCwIcon className="w-5 h-5 animate-spin text-[#002856]" />
                          ) : (
                            <UploadIcon className="w-5 h-5" />
                          )}
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Additional Dynamic Assigned Certificates (Job Screening candidates) */}
                {requiredDocs.map((doc) => {
                  const fileObj = candidateDocs[doc.id];
                  const isUploaded = !!fileObj?.key;
                  const docStatus = fileObj?.status || "pending";
                  const canModify = isUploaded && docStatus !== "approved";

                  return (
                    <div key={doc.id} className="flex flex-col gap-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-slate-700">
                          {isUploaded ? `Uploaded ${doc.title}` : doc.title}
                        </span>
                        {isJobScreeningCandidate && (
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                              docStatus === "approved"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : docStatus === "rejected"
                                  ? "bg-rose-50 text-rose-600 border-rose-200"
                                  : isUploaded
                                    ? "bg-amber-50 text-amber-600 border-amber-200"
                                    : "bg-slate-50 text-slate-400 border-slate-200"
                            }`}
                          >
                            {docStatus === "approved"
                              ? "Approved"
                              : docStatus === "rejected"
                                ? "Revision Required"
                                : isUploaded
                                  ? "Under Review"
                                  : "Pending"}
                          </span>
                        )}
                      </div>

                      {docStatus === "rejected" && (
                        <p className="text-xs font-medium text-rose-600 bg-rose-50 border border-rose-100 rounded-lg px-3 py-2">
                          Please re-upload this document in an accepted format.
                        </p>
                      )}

                      <div className="relative w-full min-h-11 px-3.5 py-2 bg-white border border-slate-300 rounded-lg flex items-center justify-between gap-2 shadow-2xs focus-within:border-blue-600 focus-within:ring-1 focus-within:ring-blue-600 transition-all">
                        {isUploaded ? (
                          <>
                            <div className="flex items-center gap-2 truncate pr-2">
                              <FileTextIcon className="w-5 h-5 text-slate-900 shrink-0" />
                              <span className="text-sm font-normal text-slate-800 truncate">
                                {fileObj.fileName || doc.title}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                type="button"
                                onClick={() =>
                                  openPreviewModalFor(
                                    doc.id,
                                    `Uploaded ${doc.title}`,
                                    fileObj.downloadUrl,
                                    fileObj.fileName,
                                  )
                                }
                                className="text-sm font-semibold text-blue-600 hover:text-blue-800 underline cursor-pointer"
                              >
                                View
                              </button>
                              {canModify && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      openUploadModalFor(
                                        doc.id,
                                        `Replace ${doc.title}`,
                                      )
                                    }
                                    className="text-sm font-semibold text-[#002856] hover:text-blue-800 underline cursor-pointer"
                                  >
                                    Replace
                                  </button>
                                  <button
                                    type="button"
                                    disabled={deletingDocId === doc.id}
                                    onClick={() =>
                                      handleDeleteAdditional(doc.id)
                                    }
                                    className="text-sm font-semibold text-rose-600 hover:text-rose-800 underline cursor-pointer disabled:opacity-50"
                                  >
                                    {deletingDocId === doc.id
                                      ? "Removing..."
                                      : "Remove"}
                                  </button>
                                </>
                              )}
                            </div>
                          </>
                        ) : (
                          <>
                            <span className="text-sm font-normal text-slate-400 truncate">
                              Upload PDF/DOC/DOCX/JPG/PNG
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                openUploadModalFor(
                                  doc.id,
                                  `Upload ${doc.title}`,
                                )
                              }
                              className="cursor-pointer text-slate-700 hover:text-[#002856] transition-colors p-1 shrink-0"
                            >
                              {uploadingDocId === doc.id ? (
                                <RefreshCwIcon className="w-5 h-5 animate-spin text-[#002856]" />
                              ) : (
                                <UploadIcon className="w-5 h-5" />
                              )}
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Upload Modal (Matching Screenshot 1) */}
      {uploadModal.open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 select-none font-sans">
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl p-6 flex flex-col items-center gap-5 relative animate-in fade-in zoom-in-95 duration-150">
            <button
              onClick={() => {
                setUploadModal({ open: false, docType: null, docTitle: "" });
                setSelectedFileForUpload(null);
              }}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/5 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors cursor-pointer"
            >
              <XIcon className="w-4 h-4" />
            </button>

            <h3 className="text-lg font-semibold text-[#002856] text-center font-['Poppins']">
              {uploadModal.docTitle}
            </h3>

            {/* Dropzone Box */}
            <div
              onClick={() => modalFileInputRef.current?.click()}
              className="w-full border-2 border-dashed border-slate-200 hover:border-[#002856] rounded-2xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors bg-black/5"
            >
              <div className="w-12 h-12 bg-[#002856] rounded-xl flex items-center justify-center text-white shrink-0 shadow-md">
                <UploadIcon className="w-6 h-6" />
              </div>
              <span className="text-[#002856] text-sm font-semibold">
                {selectedFileForUpload
                  ? selectedFileForUpload.name
                  : "Tap to upload"}
              </span>
              <span className="text-slate-400 text-xs font-normal">
                {CORE_DOCUMENT_TYPES.has(uploadModal.docType)
                  ? "Supported files: PDF"
                  : "Supported files: PDF, DOC, DOCX, JPG, PNG"}
              </span>
              <input
                ref={modalFileInputRef}
                type="file"
                accept={
                  CORE_DOCUMENT_TYPES.has(uploadModal.docType)
                    ? CORE_DOCUMENT_ACCEPT
                    : ADDITIONAL_DOCUMENT_ACCEPT
                }
                onChange={handleModalFileSelect}
                className="hidden"
              />
            </div>

            <div className="flex flex-col gap-2.5 w-full">
              <button
                type="button"
                onClick={handleModalSubmit}
                disabled={
                  !selectedFileForUpload ||
                  uploadingResume ||
                  uploadingCert ||
                  Boolean(uploadingDocId)
                }
                className="w-full py-3 bg-[#002856] hover:bg-[#001e40] text-white rounded-xl font-semibold text-sm transition-colors cursor-pointer disabled:opacity-40"
              >
                {uploadingResume || uploadingCert || uploadingDocId
                  ? "Uploading..."
                  : uploadModal.docTitle}
              </button>
              <button
                type="button"
                onClick={() => {
                  setUploadModal({ open: false, docType: null, docTitle: "" });
                  setSelectedFileForUpload(null);
                }}
                className="w-full py-3 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-xl font-semibold text-sm transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Uploaded Document Preview Modal (Matching Screenshot 3) */}
      {previewModal.open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 select-none font-sans">
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl p-6 flex flex-col items-center gap-5 relative animate-in fade-in zoom-in-95 duration-150">
            <button
              onClick={() =>
                setPreviewModal({
                  open: false,
                  docType: null,
                  docTitle: "",
                  url: "",
                  fileName: "",
                })
              }
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors cursor-pointer"
            >
              <XIcon className="w-4 h-4" />
            </button>

            <h3 className="text-lg font-semibold text-[#002856] text-center font-['Poppins']">
              {previewModal.docTitle}
            </h3>

            {/* Document Preview Container */}
            <div className="w-full h-80 rounded-2xl bg-black/5 overflow-hidden relative border border-slate-200 flex items-center justify-center p-2">
              {previewModal.url ? (
                previewModal.fileName.toLowerCase().endsWith(".pdf") ? (
                  <PdfCanvasPreview fileUrl={previewModal.url} />
                ) : (
                  <img
                    src={previewModal.url}
                    alt={previewModal.docTitle}
                    className="w-full h-full object-contain rounded-xl"
                  />
                )
              ) : (
                <div className="flex flex-col items-center gap-2 text-slate-400">
                  <FileTextIcon className="w-10 h-10" />
                  <span className="text-xs font-medium">
                    Document Preview Unavailable
                  </span>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-2.5 w-full">
              <button
                type="button"
                onClick={() =>
                  setPreviewModal({
                    open: false,
                    docType: null,
                    docTitle: "",
                    url: "",
                    fileName: "",
                  })
                }
                className="w-full py-3 bg-[#002856] hover:bg-[#001e40] text-white rounded-xl font-semibold text-sm transition-colors cursor-pointer"
              >
                Okay
              </button>
              <button
                type="button"
                onClick={() => {
                  const type = previewModal.docType;
                  const title = previewModal.docTitle.replace(
                    "Uploaded ",
                    "Upload ",
                  );
                  setPreviewModal({
                    open: false,
                    docType: null,
                    docTitle: "",
                    url: "",
                    fileName: "",
                  });
                  openUploadModalFor(type, title);
                }}
                className="w-full py-3 bg-white border border-slate-300 text-[#002856] hover:bg-slate-50 rounded-xl font-semibold text-sm transition-colors cursor-pointer"
              >
                Re-upload {previewModal.docTitle.replace("Uploaded ", "")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Subscription Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 select-none font-sans">
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl p-6 flex flex-col items-center gap-5 relative">
            <button
              onClick={() => setShowCancelModal(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors cursor-pointer"
            >
              <XIcon className="w-4 h-4" />
            </button>

            <div className="w-20 h-20 rounded-full bg-blue-100 overflow-hidden flex items-center justify-center shrink-0">
              <img
                src={mayaSad}
                alt="Maya mascot"
                className="w-full h-full object-cover"
              />
            </div>

            <h3 className="text-xl font-bold text-[#002856] text-center">
              Please don't leave us
            </h3>

            <p className="text-slate-600 text-center text-xs font-semibold leading-relaxed px-2">
              You have covered a long way in your German journey.
              <br /> Once cancelled, your monthly plan will not renew.
            </p>

            <div className="flex flex-col gap-2.5 w-full">
              <button
                onClick={() => setShowCancelModal(false)}
                disabled={cancelling}
                className="w-full py-3 bg-[#002856] hover:bg-[#001e40] text-white rounded-xl font-bold text-xs transition-colors cursor-pointer"
              >
                Continue subscription
              </button>
              <button
                onClick={handleDisableAutopay}
                disabled={cancelling}
                className="w-full text-center text-rose-600 hover:text-rose-800 font-bold text-xs cursor-pointer py-1.5 disabled:opacity-50"
              >
                {cancelling ? "Processing..." : "Cancel Subscription"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
