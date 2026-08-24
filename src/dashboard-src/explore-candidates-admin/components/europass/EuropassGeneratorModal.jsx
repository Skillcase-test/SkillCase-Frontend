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
  SlidersHorizontal,
} from "lucide-react";
import toast from "react-hot-toast";
import { exploreCandidatesAdminApi } from "../../../../api/exploreCandidatesAdminApi";
import { PrimaryButton, SecondaryButton } from "../controls";
import { EuropassProgressPreview } from "./EuropassProgressPreview";

const CEFR_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];
const GENDER_OPTIONS = ["Male", "Female", "Others"];

const CONVERT_STEPS = [
  { key: "send", label: "Sending resume" },
  { key: "parse", label: "Reading & extracting text" },
  { key: "ocr", label: "OCR on scanned pages" },
  { key: "ai", label: "AI structuring Europass CV" },
];

function emptyEuropassData(candidateForm = {}) {
  const germanLevel =
    candidateForm.language && candidateForm.language !== "Yet to start"
      ? candidateForm.language
      : "";
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
      otherLanguages: germanLevel
        ? [
            {
              id: "lang-1",
              language: "GERMAN",
              listening: germanLevel,
              reading: germanLevel,
              spokenProduction: germanLevel,
              spokenInteraction: germanLevel,
              writing: germanLevel,
            },
          ]
        : [],
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
  const [editSection, setEditSection] = useState("personal"); // "personal" | "education" | "experience" | "skills" | "languages"
  const [convertStep, setConvertStep] = useState(null); // "send" | "parse" | "ocr" | "ai"
  const [ocrSeen, setOcrSeen] = useState(false);

  const [europassData, setEuropassData] = useState(() => emptyEuropassData(candidateForm));
  const containerRef = useRef(null);

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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
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
        className="bg-white w-full max-w-5xl max-h-[92vh] rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden"
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[#083262] shadow-xs">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-slate-900 tracking-tight">
                  1-Click Europass CV Generator
                </h2>
                <span className="inline-flex rounded-md bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-[#083262]">
                  Progress Template
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Official EU Europass format with CEFR language assessment grid.
              </p>
            </div>
          </div>

          <button
            onClick={handleAttemptClose}
            aria-label="Close generator"
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 transition cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Source Selector Bar */}
        <div className="px-6 py-3 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
              Source:
            </span>
            <div className="inline-flex rounded-xl bg-slate-100 p-1 text-xs">
              {currentResume instanceof File && (
                <button
                  onClick={() => setSourceMode("file")}
                  className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                    sourceMode === "file" && selectedFile === currentResume
                      ? "bg-white text-[#083262] shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Attached File
                </button>
              )}
              {typeof currentResume === "string" && currentResume && (
                <button
                  onClick={() => setSourceMode("url")}
                  className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                    sourceMode === "url"
                      ? "bg-white text-[#083262] shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Existing URL
                </button>
              )}
              <button
                onClick={() => setSourceMode("file")}
                className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                  sourceMode === "file" && selectedFile !== currentResume
                    ? "bg-white text-[#083262] shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Upload New PDF
              </button>
              <button
                onClick={() => setSourceMode("form")}
                className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                  sourceMode === "form"
                    ? "bg-white text-[#083262] shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                From Form Details
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {sourceMode === "file" && (
              <label className="text-xs font-medium text-slate-600 flex items-center gap-2 cursor-pointer bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl hover:bg-slate-100 transition">
                <Upload className="h-3.5 w-3.5 text-[#083262]" />
                <span className="truncate max-w-[150px]">
                  {selectedFile ? selectedFile.name : "Choose PDF..."}
                </span>
                <input
                  type="file"
                  accept=".pdf,application/pdf"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) setSelectedFile(f);
                  }}
                />
              </label>
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

        {/* Live conversion progress (real server phases streamed via NDJSON) */}
        {loading && convertStep && (() => {
          const visibleSteps = CONVERT_STEPS.filter(
            (s) => s.key !== "ocr" || ocrSeen || convertStep === "ocr",
          );
          const currentIdx = visibleSteps.findIndex((s) => s.key === convertStep);
          return (
            <div className="px-6 py-2.5 bg-blue-50/70 border-b border-blue-100 flex flex-wrap items-center gap-x-5 gap-y-1.5 shrink-0">
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

        {/* Main Body Area: Preview & Editor */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-12 min-h-0 bg-slate-100">
          {/* Left Editor Panel */}
          <div className="md:col-span-5 bg-white border-r border-slate-200 flex flex-col min-h-0 overflow-y-auto p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
                <SlidersHorizontal className="h-3.5 w-3.5 text-[#083262]" />
                Customize Europass Sections
              </h3>
            </div>

            {/* Sub-tabs for editing */}
            <div className="flex flex-wrap gap-1 border-b border-slate-100 pb-2">
              {["personal", "education", "experience", "skills", "languages"].map(
                (sec) => (
                  <button
                    key={sec}
                    onClick={() => setEditSection(sec)}
                    className={`px-2.5 py-1 text-[11px] font-bold rounded-md capitalize transition cursor-pointer ${
                      editSection === sec
                        ? "bg-[#083262] text-white shadow-xs"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {sec}
                  </button>
                ),
              )}
            </div>

            {/* Personal Section Editor */}
            {editSection === "personal" && (
              <div className="space-y-3 text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Full Name</label>
                  <input
                    className="w-full rounded-xl border border-slate-300 px-3 py-1.5 font-medium text-slate-900"
                    value={europassData.personalInfo?.fullName || ""}
                    onChange={(e) =>
                      setEuropassData((prev) => ({
                        ...prev,
                        personalInfo: { ...prev.personalInfo, fullName: e.target.value },
                      }))
                    }
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Email</label>
                    <input
                      className="w-full rounded-xl border border-slate-300 px-3 py-1.5 font-medium text-slate-900"
                      value={europassData.personalInfo?.email || ""}
                      onChange={(e) =>
                        setEuropassData((prev) => ({
                          ...prev,
                          personalInfo: { ...prev.personalInfo, email: e.target.value },
                        }))
                      }
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Phone</label>
                    <input
                      className="w-full rounded-xl border border-slate-300 px-3 py-1.5 font-medium text-slate-900"
                      value={europassData.personalInfo?.phone || ""}
                      onChange={(e) =>
                        setEuropassData((prev) => ({
                          ...prev,
                          personalInfo: { ...prev.personalInfo, phone: e.target.value },
                        }))
                      }
                    />
                  </div>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Address / Location</label>
                  <input
                    className="w-full rounded-xl border border-slate-300 px-3 py-1.5 font-medium text-slate-900"
                    value={europassData.personalInfo?.address || ""}
                    onChange={(e) =>
                      setEuropassData((prev) => ({
                        ...prev,
                        personalInfo: { ...prev.personalInfo, address: e.target.value },
                      }))
                    }
                  />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Nationality</label>
                    <input
                      className="w-full rounded-lg border border-slate-300 px-2 py-1 text-slate-800"
                      value={europassData.personalInfo?.nationality || ""}
                      onChange={(e) =>
                        setEuropassData((prev) => ({
                          ...prev,
                          personalInfo: { ...prev.personalInfo, nationality: e.target.value },
                        }))
                      }
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Date of Birth</label>
                    <input
                      type="date"
                      className="w-full rounded-lg border border-slate-300 px-2 py-1 text-slate-800"
                      value={europassData.personalInfo?.dob || ""}
                      onChange={(e) =>
                        setEuropassData((prev) => ({
                          ...prev,
                          personalInfo: { ...prev.personalInfo, dob: e.target.value },
                        }))
                      }
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Gender</label>
                    <select
                      className="w-full rounded-lg border border-slate-300 px-2 py-1 bg-white text-slate-800"
                      value={europassData.personalInfo?.gender || ""}
                      onChange={(e) =>
                        setEuropassData((prev) => ({
                          ...prev,
                          personalInfo: { ...prev.personalInfo, gender: e.target.value },
                        }))
                      }
                    >
                      <option value="">—</option>
                      {GENDER_OPTIONS.map((g) => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">About Me / Professional Summary</label>
                  <textarea
                    rows={3}
                    className="w-full rounded-xl border border-slate-300 p-2.5 font-medium text-slate-800 leading-relaxed"
                    value={europassData.personalInfo?.aboutMe || ""}
                    onChange={(e) =>
                      setEuropassData((prev) => ({
                        ...prev,
                        personalInfo: { ...prev.personalInfo, aboutMe: e.target.value },
                      }))
                    }
                  />
                </div>
              </div>
            )}

            {/* Education Section Editor */}
            {editSection === "education" && (
              <div className="space-y-3 text-xs">
                {(europassData.education || []).map((edu, idx) => (
                  <div
                    key={edu.id || idx}
                    className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2 relative"
                  >
                    <button
                      onClick={() =>
                        setEuropassData((prev) => ({
                          ...prev,
                          education: prev.education.filter((_, i) => i !== idx),
                        }))
                      }
                      aria-label="Remove education entry"
                      className="absolute top-2 right-2 text-rose-500 hover:text-rose-700 cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                    <div>
                      <label className="font-bold text-slate-600 block text-[10px]">Degree / Qualification</label>
                      <input
                        className="w-full rounded-lg border border-slate-300 px-2 py-1 font-bold text-slate-900 pr-6"
                        value={edu.degree || ""}
                        onChange={(e) => {
                          const next = [...europassData.education];
                          next[idx] = { ...next[idx], degree: e.target.value };
                          setEuropassData((prev) => ({ ...prev, education: next }));
                        }}
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-600 block text-[10px]">Institution</label>
                      <input
                        className="w-full rounded-lg border border-slate-300 px-2 py-1 text-slate-800 pr-6"
                        value={edu.institution || ""}
                        onChange={(e) => {
                          const next = [...europassData.education];
                          next[idx] = { ...next[idx], institution: e.target.value };
                          setEuropassData((prev) => ({ ...prev, education: next }));
                        }}
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="font-bold text-slate-600 block text-[10px]">Period</label>
                        <input
                          className="w-full rounded-lg border border-slate-300 px-2 py-1 text-slate-800"
                          value={edu.period || ""}
                          onChange={(e) => {
                            const next = [...europassData.education];
                            next[idx] = { ...next[idx], period: e.target.value };
                            setEuropassData((prev) => ({ ...prev, education: next }));
                          }}
                        />
                      </div>
                      <div>
                        <label className="font-bold text-slate-600 block text-[10px]">Location</label>
                        <input
                          className="w-full rounded-lg border border-slate-300 px-2 py-1 text-slate-800"
                          value={edu.location || ""}
                          onChange={(e) => {
                            const next = [...europassData.education];
                            next[idx] = { ...next[idx], location: e.target.value };
                            setEuropassData((prev) => ({ ...prev, education: next }));
                          }}
                        />
                      </div>
                      <div>
                        <label className="font-bold text-slate-600 block text-[10px]">EQF Level</label>
                        <input
                          className="w-full rounded-lg border border-slate-300 px-2 py-1 text-slate-800"
                          value={edu.eqfLevel || ""}
                          onChange={(e) => {
                            const next = [...europassData.education];
                            next[idx] = { ...next[idx], eqfLevel: e.target.value };
                            setEuropassData((prev) => ({ ...prev, education: next }));
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
                <button
                  onClick={() =>
                    setEuropassData((prev) => ({
                      ...prev,
                      education: [
                        ...(prev.education || []),
                        {
                          id: `edu-${Date.now()}`,
                          degree: "",
                          institution: "",
                          period: "",
                          location: "",
                          eqfLevel: "",
                        },
                      ],
                    }))
                  }
                  className="w-full py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer text-xs"
                >
                  <Plus className="h-3.5 w-3.5" /> Add Education
                </button>
              </div>
            )}

            {/* Experience Section Editor */}
            {editSection === "experience" && (
              <div className="space-y-3 text-xs">
                {(europassData.experience || []).map((exp, idx) => (
                  <div
                    key={exp.id || idx}
                    className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2 relative"
                  >
                    <button
                      onClick={() =>
                        setEuropassData((prev) => ({
                          ...prev,
                          experience: prev.experience.filter((_, i) => i !== idx),
                        }))
                      }
                      aria-label="Remove experience entry"
                      className="absolute top-2 right-2 text-rose-500 hover:text-rose-700 cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                    <div>
                      <label className="font-bold text-slate-600 block text-[10px]">Position Title</label>
                      <input
                        className="w-full rounded-lg border border-slate-300 px-2 py-1 font-bold text-slate-900 pr-6"
                        value={exp.position || ""}
                        onChange={(e) => {
                          const next = [...europassData.experience];
                          next[idx] = { ...next[idx], position: e.target.value };
                          setEuropassData((prev) => ({ ...prev, experience: next }));
                        }}
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-600 block text-[10px]">Employer / Company</label>
                      <input
                        className="w-full rounded-lg border border-slate-300 px-2 py-1 text-slate-800 pr-6"
                        value={exp.employer || ""}
                        onChange={(e) => {
                          const next = [...europassData.experience];
                          next[idx] = { ...next[idx], employer: e.target.value };
                          setEuropassData((prev) => ({ ...prev, experience: next }));
                        }}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="font-bold text-slate-600 block text-[10px]">Period</label>
                        <input
                          className="w-full rounded-lg border border-slate-300 px-2 py-1 text-slate-800"
                          value={exp.period || ""}
                          onChange={(e) => {
                            const next = [...europassData.experience];
                            next[idx] = { ...next[idx], period: e.target.value };
                            setEuropassData((prev) => ({ ...prev, experience: next }));
                          }}
                        />
                      </div>
                      <div>
                        <label className="font-bold text-slate-600 block text-[10px]">Location</label>
                        <input
                          className="w-full rounded-lg border border-slate-300 px-2 py-1 text-slate-800"
                          value={exp.location || ""}
                          onChange={(e) => {
                            const next = [...europassData.experience];
                            next[idx] = { ...next[idx], location: e.target.value };
                            setEuropassData((prev) => ({ ...prev, experience: next }));
                          }}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="font-bold text-slate-600 block text-[10px]">
                        Responsibilities (one per line)
                      </label>
                      <textarea
                        rows={3}
                        className="w-full rounded-lg border border-slate-300 px-2 py-1 text-slate-800 pr-6"
                        value={(exp.responsibilities || []).join("\n")}
                        onChange={(e) => {
                          const next = [...europassData.experience];
                          next[idx] = {
                            ...next[idx],
                            responsibilities: e.target.value
                              .split("\n")
                              .map((s) => s.trim())
                              .filter(Boolean),
                          };
                          setEuropassData((prev) => ({ ...prev, experience: next }));
                        }}
                      />
                    </div>
                  </div>
                ))}
                <button
                  onClick={() =>
                    setEuropassData((prev) => ({
                      ...prev,
                      experience: [
                        ...(prev.experience || []),
                        {
                          id: `exp-${Date.now()}`,
                          position: "",
                          employer: "",
                          period: "",
                          location: "",
                          responsibilities: [],
                        },
                      ],
                    }))
                  }
                  className="w-full py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer text-xs"
                >
                  <Plus className="h-3.5 w-3.5" /> Add Experience
                </button>
              </div>
            )}

            {/* Skills Section Editor */}
            {editSection === "skills" && (
              <div className="space-y-3 text-xs">
                <label className="font-bold text-slate-700 block">
                  Skills List (Comma or pipe separated)
                </label>
                <textarea
                  rows={6}
                  className="w-full rounded-xl border border-slate-300 p-3 font-medium text-slate-800 leading-relaxed"
                  value={(europassData.skills || []).join(" | ")}
                  onChange={(e) => {
                    const parsed = e.target.value
                      .split(/\||,/)
                      .map((s) => s.trim())
                      .filter(Boolean);
                    setEuropassData((prev) => ({ ...prev, skills: parsed }));
                  }}
                />
              </div>
            )}

            {/* Language Skills Editor */}
            {editSection === "languages" && (
              <div className="space-y-4 text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Mother Tongue(s)</label>
                  <input
                    className="w-full rounded-xl border border-slate-300 px-3 py-1.5 font-bold text-slate-900"
                    placeholder="e.g. HINDI | ENGLISH"
                    value={(europassData.languageSkills?.motherTongues || []).join(" | ")}
                    onChange={(e) => {
                      const list = e.target.value
                        .split(/\||,/)
                        .map((s) => s.trim().toUpperCase())
                        .filter(Boolean);
                      setEuropassData((prev) => ({
                        ...prev,
                        languageSkills: { ...prev.languageSkills, motherTongues: list },
                      }));
                    }}
                  />
                </div>

                <div className="space-y-3 pt-2 border-t border-slate-100">
                  <span className="font-bold text-slate-700 block uppercase tracking-wide text-[10px]">
                    Foreign Languages (CEFR Scale A1 - C2)
                  </span>
                  {(europassData.languageSkills?.otherLanguages || []).map((ol, idx) => (
                    <div
                      key={ol.id || idx}
                      className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2 relative"
                    >
                      <button
                        onClick={() => {
                          const next = europassData.languageSkills.otherLanguages.filter(
                            (_, i) => i !== idx,
                          );
                          setEuropassData((prev) => ({
                            ...prev,
                            languageSkills: { ...prev.languageSkills, otherLanguages: next },
                          }));
                        }}
                        aria-label="Remove language entry"
                        className="absolute top-2 right-2 text-rose-500 hover:text-rose-700 cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                      <div>
                        <label className="font-bold text-slate-600 block text-[10px]">Language</label>
                        <input
                          className="w-full rounded-lg border border-slate-300 px-2 py-1 font-bold text-slate-900 pr-6"
                          value={ol.language || ""}
                          onChange={(e) => {
                            const next = [...europassData.languageSkills.otherLanguages];
                            next[idx] = { ...next[idx], language: e.target.value.toUpperCase() };
                            setEuropassData((prev) => ({
                              ...prev,
                              languageSkills: { ...prev.languageSkills, otherLanguages: next },
                            }));
                          }}
                        />
                      </div>
                      <div className="grid grid-cols-5 gap-1.5 text-[10px]">
                        {["listening", "reading", "spokenProduction", "spokenInteraction", "writing"].map(
                          (field) => (
                            <div key={field}>
                              <label className="font-bold text-slate-500 block truncate" title={field}>
                                {field === "spokenProduction" ? "Spoken Prod" : field === "spokenInteraction" ? "Spoken Inter" : field}
                              </label>
                              <select
                                className="w-full rounded-md border border-slate-300 py-1 bg-white font-bold text-center text-slate-800"
                                value={CEFR_LEVELS.includes(ol[field]) ? ol[field] : ""}
                                onChange={(e) => {
                                  const next = [...europassData.languageSkills.otherLanguages];
                                  next[idx] = { ...next[idx], [field]: e.target.value };
                                  setEuropassData((prev) => ({
                                    ...prev,
                                    languageSkills: { ...prev.languageSkills, otherLanguages: next },
                                  }));
                                }}
                              >
                                <option value="">—</option>
                                {CEFR_LEVELS.map((lvl) => (
                                  <option key={lvl} value={lvl}>{lvl}</option>
                                ))}
                              </select>
                            </div>
                          ),
                        )}
                      </div>
                    </div>
                  ))}

                  <button
                    onClick={() => {
                      const next = [
                        ...(europassData.languageSkills?.otherLanguages || []),
                        {
                          id: `lang-${Date.now()}`,
                          language: "",
                          listening: "",
                          reading: "",
                          spokenProduction: "",
                          spokenInteraction: "",
                          writing: "",
                        },
                      ];
                      setEuropassData((prev) => ({
                        ...prev,
                        languageSkills: { ...prev.languageSkills, otherLanguages: next },
                      }));
                    }}
                    className="w-full py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer text-xs"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Language
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right Live Preview Panel */}
          <div className="md:col-span-7 bg-slate-200/80 p-6 overflow-y-auto flex justify-center items-start min-h-0">
            <div className="w-full max-w-xl shadow-xl">
              <EuropassProgressPreview data={europassData} />
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-white shrink-0">
          <div className="text-xs text-slate-500 font-medium">
            Generated using official Europass Progress standards.
          </div>

          <div className="flex items-center gap-2">
            <SecondaryButton
              icon={Download}
              loading={downloading}
              onClick={handleDownloadPdf}
            >
              Download PDF
            </SecondaryButton>

            <PrimaryButton
              icon={CheckCircle}
              loading={attaching}
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
