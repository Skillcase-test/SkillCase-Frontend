import { useState, useEffect, useRef } from "react";
import {
  X,
  Sparkles,
  Download,
  CheckCircle,
  Circle,
  Loader2,
  Upload,
  Plus,
  Trash2,
  RefreshCw,
  Edit3,
  FileText,
  Link2,
} from "lucide-react";
import toast from "react-hot-toast";
import { exploreCandidatesAdminApi } from "../../../../api/exploreCandidatesAdminApi";
import { PrimaryButton, SecondaryButton } from "../controls";
import { EuropassProgressPreview } from "./EuropassProgressPreview";

const CONVERT_STEPS = [
  { key: "send", label: "Sending resume" },
  { key: "parse", label: "Extracting text" },
  { key: "ocr", label: "OCR scanned pages" },
  { key: "ai", label: "AI structuring Europass CV" },
];

function emptyEuropassData(candidateForm = {}) {
  return {
    personalInfo: {
      fullName: candidateForm.fullname || "",
      email: candidateForm.email || "",
      phone: candidateForm.phone || "",
      address: "",
      nationality: "",
      dob: candidateForm.dob || "",
      gender: candidateForm.gender || "",
      photo: typeof candidateForm.photo === "string" ? candidateForm.photo : "",
      aboutMe: "",
    },
    education: [],
    experience: [],
    skills: [],
    languageSkills: {
      motherTongues: [],
      otherLanguages: [],
    },
  };
}

function hasRenderableContent(data) {
  const p = data.personalInfo || {};
  return Boolean(
    String(p.fullName || "").trim() ||
      (Array.isArray(data.education) && data.education.length) ||
      (Array.isArray(data.experience) && data.experience.length) ||
      (Array.isArray(data.skills) && data.skills.filter(Boolean).length),
  );
}

async function extractServerMessage(err) {
  const d = err?.response?.data;
  try {
    if (d instanceof Blob) return JSON.parse(await d.text())?.message;
    if (typeof d === "string") return JSON.parse(d)?.message;
    return d?.message;
  } catch (_e) {
    return null;
  }
}

export function EuropassGeneratorModal({
  isOpen,
  onClose,
  candidateForm = {},
  currentResume = null,
  onAttach,
}) {
  const [sourceMode, setSourceMode] = useState("file"); // "file" | "url" | "form"
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [attaching, setAttaching] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [editSection, setEditSection] = useState("personal");
  const [convertStep, setConvertStep] = useState(null);
  const [ocrSeen, setOcrSeen] = useState(false);

  const [europassData, setEuropassData] = useState(() => emptyEuropassData(candidateForm));

  const containerRef = useRef(null);
  const fileInputRef = useRef(null);
  const photoInputRef = useRef(null);

  useEffect(() => {
    if (currentResume instanceof File) {
      setSelectedFile(currentResume);
      setSourceMode("file");
    } else if (typeof currentResume === "string" && currentResume) {
      setSourceMode("url");
    } else {
      setSourceMode("form");
    }
  }, [currentResume]);

  if (!isOpen) return null;

  const busy = loading || downloading || attaching;
  const handleAttemptClose = () => {
    if (!busy) onClose();
  };

  const closeOnKey = (e) => {
    if (e.key === "Escape") {
      handleAttemptClose();
      return;
    }
    if (e.key === "Tab" && containerRef.current) {
      const focusables = containerRef.current.querySelectorAll(
        'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])',
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  };

  const handlePhotoPicked = (e) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      toast.error("Profile photo must be an image (JPG, PNG, WebP).");
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      toast.error("Profile photo must be 5MB or smaller.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setEuropassData((prev) => ({
        ...prev,
        personalInfo: { ...prev.personalInfo, photo: String(reader.result || "") },
      }));
      toast.success("Photo added — it will appear on the CV.");
    };
    reader.onerror = () => toast.error("Could not read that image file.");
    reader.readAsDataURL(f);
  };

  const handleConvert = async () => {
    if (sourceMode === "file" && !selectedFile) {
      toast.error("Choose a PDF resume first, or switch source.");
      return;
    }
    setLoading(true);
    setOcrSeen(false);
    setConvertStep("send");
    try {
      const payload = {
        candidateContext: {
          fullname: candidateForm.fullname,
          email: candidateForm.email,
          phone: candidateForm.phone,
          dob: candidateForm.dob,
          gender: candidateForm.gender,
          qualification: candidateForm.qualification,
          experience: candidateForm.experience,
          language: candidateForm.language,
          specialization: candidateForm.specialization,
          photo: typeof candidateForm.photo === "string" ? candidateForm.photo : "",
        },
      };

      if (sourceMode === "file" && selectedFile) {
        payload.resume_file = selectedFile;
      } else if (sourceMode === "url" && typeof currentResume === "string") {
        payload.fileUrl = currentResume;
      }

      const res = await exploreCandidatesAdminApi.convertEuropassResume(payload, {
        onUploadProgress: (e) => {
          if (e?.total && e.loaded >= e.total) return;
        },
        onPhase: (ev) => {
          if (!ev?.phase) return;
          if (ev.phase === "ocr_fallback") {
            setOcrSeen(true);
            setConvertStep("ocr");
          } else if (ev.phase === "structuring") {
            setConvertStep("ai");
          } else if (ev.phase === "parsing" || ev.phase === "downloading") {
            setConvertStep("parse");
          } else if (ev.phase === "received") {
            setConvertStep((prev) => (prev === "send" ? "parse" : prev));
          }
        },
      });

      if (res.data?.data) {
        setEuropassData(res.data.data);
        toast.success(res.data.message || "Europass CV generated successfully");
      } else {
        toast.error("Conversion returned no data. Please try again.");
      }
    } catch (err) {
      toast.error(
        err?.message ||
          err?.response?.data?.message ||
          "Failed to convert resume to Europass format",
      );
    } finally {
      setLoading(false);
      setConvertStep(null);
    }
  };

  const handleDownloadPdf = async () => {
    if (!hasRenderableContent(europassData)) {
      toast.error("Add a name or at least one section before downloading.");
      return;
    }
    setDownloading(true);
    try {
      const res = await exploreCandidatesAdminApi.generateEuropassPdf(europassData);
      const blob = new Blob([res.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      const cleanName = (europassData.personalInfo?.fullName || "Candidate").replace(/[^a-zA-Z0-9_-]/g, "_");
      a.href = url;
      a.download = `${cleanName}_Europass_CV.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success("Europass PDF downloaded");
    } catch (err) {
      toast.error((await extractServerMessage(err)) || "Could not download Europass PDF");
    } finally {
      setDownloading(false);
    }
  };

  const handleAttachToProfile = async () => {
    if (!hasRenderableContent(europassData)) {
      toast.error("Add a name or at least one section before attaching.");
      return;
    }
    if (currentResume) {
      const replace = window.confirm(
        "This replaces the existing resume on this candidate form with the generated Europass CV. Continue?",
      );
      if (!replace) return;
    }
    setAttaching(true);
    try {
      const res = await exploreCandidatesAdminApi.generateEuropassPdf(europassData);
      const blob = new Blob([res.data], { type: "application/pdf" });
      const cleanName = (europassData.personalInfo?.fullName || "Candidate").replace(/[^a-zA-Z0-9_-]/g, "_");
      const file = new File([blob], `${cleanName}_Europass_CV.pdf`, {
        type: "application/pdf",
      });

      if (onAttach) {
        onAttach(file);
      }
      toast.success("Europass CV staged as resume — press Save Changes to store it.");
      onClose();
    } catch (err) {
      toast.error((await extractServerMessage(err)) || "Failed to attach Europass CV to profile");
    } finally {
      setAttaching(false);
    }
  };

  const hasAttachedResume = Boolean(currentResume);
  const isAttachedActive =
    hasAttachedResume &&
    ((sourceMode === "file" && selectedFile === currentResume) ||
      (sourceMode === "url" && typeof currentResume === "string"));
  const isCustomUploadActive =
    sourceMode === "file" && selectedFile && selectedFile !== currentResume;

  const isConverted = hasRenderableContent(europassData);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-label="Europass CV Generator"
      onKeyDown={closeOnKey}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) handleAttemptClose();
      }}
    >
      <div
        ref={containerRef}
        className="bg-white w-full max-w-5xl max-h-[94vh] rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden"
      >
        {/* 1. Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#083262]/5 border border-[#083262]/10 flex items-center justify-center text-[#083262] shadow-xs">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-slate-900 tracking-tight">
                  1-Click Europass CV Generator
                </h2>
                <span className="inline-flex rounded-md bg-[#083262]/10 px-2 py-0.5 text-[10px] font-bold text-[#083262]">
                  Progress Template
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Official EU Europass format with CEFR language assessment grid.
              </p>
            </div>
          </div>

          <button
            onClick={handleAttemptClose}
            aria-label="Close generator"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* 2. Top Action Bar */}
        <div className="px-6 py-3 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Resume Source:
            </span>

            {/* Attached Resume Button */}
            {hasAttachedResume ? (
              <button
                type="button"
                onClick={() => {
                  if (currentResume instanceof File) {
                    setSelectedFile(currentResume);
                    setSourceMode("file");
                  } else if (typeof currentResume === "string") {
                    setSelectedFile(null);
                    setSourceMode("url");
                  }
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition cursor-pointer shadow-xs ${
                  isAttachedActive
                    ? "bg-[#083262] text-white border-[#083262]"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                }`}
              >
                <FileText className={`h-3.5 w-3.5 ${isAttachedActive ? "text-white" : "text-[#083262]"}`} />
                <span className="truncate max-w-[200px]">
                  {isAttachedActive
                    ? currentResume instanceof File
                      ? `Using Attached: ${currentResume.name}`
                      : "Using Attached Resume"
                    : currentResume instanceof File
                      ? `Use Attached: ${currentResume.name}`
                      : "Use Attached Resume"}
                </span>
              </button>
            ) : (
              <button
                type="button"
                disabled
                title="No resume attached"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-100/80 text-slate-400 text-xs font-bold opacity-60 cursor-not-allowed"
              >
                <FileText className="h-3.5 w-3.5 text-slate-400" />
                <span>No Attached Resume</span>
              </button>
            )}

            {/* Upload New PDF Button */}
            <button
              type="button"
              onClick={() => {
                setSourceMode("file");
                setSelectedFile(null);
                fileInputRef.current?.click();
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition cursor-pointer shadow-xs ${
                isCustomUploadActive
                  ? "bg-[#083262] text-white border-[#083262]"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
              }`}
            >
              <Upload className={`h-3.5 w-3.5 ${isCustomUploadActive ? "text-white" : "text-slate-500"}`} />
              <span className="truncate max-w-[180px]">
                {isCustomUploadActive ? selectedFile.name : "Upload New PDF"}
              </span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,application/pdf"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) {
                  setSelectedFile(f);
                  setSourceMode("file");
                }
              }}
            />
          </div>

          <div className="flex items-center gap-2.5">
            {isConverted && (
              <button
                type="button"
                onClick={() => setShowEditor((v) => !v)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition border cursor-pointer ${
                  showEditor
                    ? "bg-[#083262] text-white border-[#083262]"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                }`}
              >
                <Edit3 className="h-3.5 w-3.5" />
                <span>{showEditor ? "Hide Editor" : "Edit Details"}</span>
              </button>
            )}

            <PrimaryButton
              icon={RefreshCw}
              loading={loading}
              onClick={handleConvert}
            >
              Convert via AI
            </PrimaryButton>
          </div>
        </div>

        {/* Real server phases streamed via NDJSON */}
        {loading && convertStep && (() => {
          const visibleSteps = CONVERT_STEPS.filter(
            (s) => s.key !== "ocr" || ocrSeen || convertStep === "ocr",
          );
          const currentIdx = visibleSteps.findIndex((s) => s.key === convertStep);
          return (
            <div className="px-6 py-2.5 bg-[#083262]/5 border-b border-[#083262]/10 flex flex-wrap items-center gap-x-5 gap-y-1.5 shrink-0">
              <span className="text-[11px] font-black uppercase tracking-wider text-[#083262]">
                Converting:
              </span>
              {visibleSteps.map((step, stepIdx) => {
                const status =
                  stepIdx < currentIdx ? "done" : stepIdx === currentIdx ? "active" : "pending";
                const StepIcon =
                  status === "done" ? CheckCircle : status === "active" ? Loader2 : Circle;
                return (
                  <span
                    key={step.key}
                    className={`inline-flex items-center gap-1.5 text-[11px] font-bold transition ${
                      status === "done"
                        ? "text-emerald-600"
                        : status === "active"
                          ? "text-[#083262]"
                          : "text-slate-400"
                    }`}
                  >
                    <StepIcon className={`h-3.5 w-3.5 ${status === "active" ? "animate-spin" : ""}`} />
                    {step.label}
                  </span>
                );
              })}
            </div>
          );
        })()}

        {/* 3. Main Center Workspace: Seamless DOM Live Preview */}
        <div className="flex-1 overflow-hidden flex min-h-0 bg-slate-100/70">
          {/* Optional Collapsible Editor Drawer */}
          {showEditor && (
            <div className="w-80 md:w-96 bg-white border-r border-slate-200 flex flex-col min-h-0 overflow-y-auto p-4 space-y-4 animate-in slide-in-from-left-4 duration-150 shrink-0">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="flex flex-wrap gap-1">
                  {["personal", "education", "experience", "skills", "languages"].map((sec) => (
                    <button
                      key={sec}
                      type="button"
                      onClick={() => setEditSection(sec)}
                      className={`px-2.5 py-1 text-[11px] font-bold rounded-lg capitalize transition cursor-pointer ${
                        editSection === sec
                          ? "bg-[#083262] text-white shadow-xs"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {sec}
                    </button>
                  ))}
                </div>
              </div>

              {/* Personal Section */}
              {editSection === "personal" && (
                <div className="space-y-3 text-xs">
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">Full Name</label>
                    <input
                      className="w-full rounded-xl border border-slate-200 px-3 py-1.5 font-bold text-slate-900 focus:border-[#083262] outline-none"
                      value={europassData.personalInfo?.fullName || ""}
                      onChange={(e) => {
                        setEuropassData((prev) => ({
                          ...prev,
                          personalInfo: { ...prev.personalInfo, fullName: e.target.value },
                        }));
                      }}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">Email</label>
                    <input
                      className="w-full rounded-xl border border-slate-200 px-3 py-1.5 text-slate-900 focus:border-[#083262] outline-none"
                      value={europassData.personalInfo?.email || ""}
                      onChange={(e) => {
                        setEuropassData((prev) => ({
                          ...prev,
                          personalInfo: { ...prev.personalInfo, email: e.target.value },
                        }));
                      }}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">Phone</label>
                    <input
                      className="w-full rounded-xl border border-slate-200 px-3 py-1.5 text-slate-900 focus:border-[#083262] outline-none"
                      value={europassData.personalInfo?.phone || ""}
                      onChange={(e) => {
                        setEuropassData((prev) => ({
                          ...prev,
                          personalInfo: { ...prev.personalInfo, phone: e.target.value },
                        }));
                      }}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">Profile Photo</label>
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full border border-slate-200 bg-slate-100 overflow-hidden flex items-center justify-center shrink-0">
                        {europassData.personalInfo?.photo ? (
                          <img
                            src={europassData.personalInfo.photo}
                            alt="Profile"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <FileText className="h-4 w-4 text-slate-400" />
                        )}
                      </div>
                      <div className="flex flex-col gap-1">
                        <button
                          type="button"
                          onClick={() => photoInputRef.current?.click()}
                          className="inline-flex items-center gap-1.5 self-start px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-[11px] font-bold text-slate-700 transition cursor-pointer shadow-xs"
                        >
                          <Upload className="h-3 w-3 text-slate-500" />
                          {europassData.personalInfo?.photo ? "Change Photo" : "Upload Photo"}
                        </button>
                        {europassData.personalInfo?.photo && (
                          <button
                            type="button"
                            onClick={() =>
                              setEuropassData((prev) => ({
                                ...prev,
                                personalInfo: { ...prev.personalInfo, photo: "" },
                              }))
                            }
                            className="self-start text-[10px] font-bold text-rose-500 hover:text-rose-700 cursor-pointer"
                          >
                            Remove
                          </button>
                        )}
                        <span className="text-[9px] text-slate-400 leading-tight">
                          JPG, PNG or WebP · max 5MB · embedded in the CV
                        </span>
                      </div>
                    </div>
                    <input
                      ref={photoInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/gif"
                      className="hidden"
                      onChange={handlePhotoPicked}
                    />
                  </div>
                </div>
              )}

              {/* Education Section */}
              {editSection === "education" && (
                <div className="space-y-3 text-xs">
                  {(europassData.education || []).map((edu, idx) => (
                    <div key={edu.id || idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2 relative">
                      <button
                        type="button"
                        onClick={() => {
                          setEuropassData((prev) => ({
                            ...prev,
                            education: prev.education.filter((_, i) => i !== idx),
                          }));
                        }}
                        className="absolute top-2 right-2 text-rose-500 hover:text-rose-700"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase block">Degree</label>
                        <input
                          className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 font-bold text-slate-900"
                          value={edu.degree || ""}
                          onChange={(e) => {
                            const next = [...europassData.education];
                            next[idx] = { ...next[idx], degree: e.target.value };
                            setEuropassData((prev) => ({ ...prev, education: next }));
                          }}
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase block">Institution</label>
                        <input
                          className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-slate-800"
                          value={edu.institution || ""}
                          onChange={(e) => {
                            const next = [...europassData.education];
                            next[idx] = { ...next[idx], institution: e.target.value };
                            setEuropassData((prev) => ({ ...prev, education: next }));
                          }}
                        />
                      </div>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() =>
                      setEuropassData((prev) => ({
                        ...prev,
                        education: [
                          ...(prev.education || []),
                          { id: `edu-${Date.now()}`, degree: "", institution: "", period: "", location: "", eqfLevel: "" },
                        ],
                      }))
                    }
                    className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl flex items-center justify-center gap-1.5 transition text-xs"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Education
                  </button>
                </div>
              )}

              {/* Experience Section */}
              {editSection === "experience" && (
                <div className="space-y-3 text-xs">
                  {(europassData.experience || []).map((exp, idx) => (
                    <div key={exp.id || idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2 relative">
                      <button
                        type="button"
                        onClick={() => {
                          setEuropassData((prev) => ({
                            ...prev,
                            experience: prev.experience.filter((_, i) => i !== idx),
                          }));
                        }}
                        className="absolute top-2 right-2 text-rose-500 hover:text-rose-700"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase block">Position</label>
                        <input
                          className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 font-bold text-slate-900"
                          value={exp.position || ""}
                          onChange={(e) => {
                            const next = [...europassData.experience];
                            next[idx] = { ...next[idx], position: e.target.value };
                            setEuropassData((prev) => ({ ...prev, experience: next }));
                          }}
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase block">Employer</label>
                        <input
                          className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-slate-800"
                          value={exp.employer || ""}
                          onChange={(e) => {
                            const next = [...europassData.experience];
                            next[idx] = { ...next[idx], employer: e.target.value };
                            setEuropassData((prev) => ({ ...prev, experience: next }));
                          }}
                        />
                      </div>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() =>
                      setEuropassData((prev) => ({
                        ...prev,
                        experience: [
                          ...(prev.experience || []),
                          { id: `exp-${Date.now()}`, position: "", employer: "", period: "", location: "", responsibilities: [] },
                        ],
                      }))
                    }
                    className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl flex items-center justify-center gap-1.5 transition text-xs"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Experience
                  </button>
                </div>
              )}

              {/* Skills Section */}
              {editSection === "skills" && (
                <div className="space-y-2 text-xs">
                  <label className="text-[10px] font-bold text-slate-600 uppercase block">Skills (Pipe or Comma Delimited)</label>
                  <textarea
                    rows={6}
                    className="w-full rounded-xl border border-slate-200 p-2.5 font-medium text-slate-900 focus:border-[#083262] outline-none"
                    value={(europassData.skills || []).join(" | ")}
                    onChange={(e) => {
                      const parsed = e.target.value.split(/\||,/).map((s) => s.trim()).filter(Boolean);
                      setEuropassData((prev) => ({ ...prev, skills: parsed }));
                    }}
                  />
                </div>
              )}

              {/* Languages Section */}
              {editSection === "languages" && (
                <div className="space-y-3 text-xs">
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">Mother Tongue(s)</label>
                    <input
                      className="w-full rounded-xl border border-slate-200 px-3 py-1.5 font-bold text-slate-900"
                      value={(europassData.languageSkills?.motherTongues || []).join(" | ")}
                      onChange={(e) => {
                        const list = e.target.value.split(/\||,/).map((s) => s.trim().toUpperCase()).filter(Boolean);
                        setEuropassData((prev) => ({
                          ...prev,
                          languageSkills: { ...prev.languageSkills, motherTongues: list },
                        }));
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Centered Document Live Preview Canvas */}
          <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center justify-start min-h-0">
            {isConverted ? (
              <div className="w-full max-w-xl shadow-2xl ring-1 ring-slate-900/10 transition-all">
                <EuropassProgressPreview data={europassData} />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center my-auto p-12 text-center max-w-md">
                <div className="w-16 h-16 rounded-2xl bg-[#083262]/5 border border-[#083262]/10 flex items-center justify-center text-[#083262] mb-4 shadow-xs">
                  <Sparkles className="h-8 w-8" />
                </div>
                <h3 className="text-base font-black text-slate-900 mb-1">
                  Ready to Generate Europass CV
                </h3>
                <p className="text-xs text-slate-500 font-medium leading-relaxed mb-6">
                  Click &quot;Convert via AI&quot; in the toolbar above to generate the official Europass CV from this candidate&apos;s resume.
                </p>
                <PrimaryButton
                  icon={RefreshCw}
                  loading={loading}
                  onClick={handleConvert}
                >
                  Generate Europass CV
                </PrimaryButton>
              </div>
            )}
          </div>
        </div>

        {/* 4. Clean Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-white shrink-0">
          <div className="text-xs text-slate-500 font-medium">
            Official EU Europass Progress Template.
          </div>

          <div className="flex items-center gap-2.5">
            <SecondaryButton
              icon={Download}
              loading={downloading}
              disabled={!isConverted}
              onClick={handleDownloadPdf}
            >
              Download PDF
            </SecondaryButton>

            <PrimaryButton
              icon={CheckCircle}
              loading={attaching}
              disabled={!isConverted}
              onClick={handleAttachToProfile}
            >
              Attach to Candidate Profile
            </PrimaryButton>
          </div>
        </div>
      </div>
    </div>
  );
}
