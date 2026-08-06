import React, { useState } from "react";
import { Upload, CheckCircle, AlertCircle, Loader } from "lucide-react";
import { Link } from "react-router-dom";
import { uploadNoteAdmin } from "../../../api/notesApi";
import toast, { Toaster } from "react-hot-toast";

const LEVELS = ["A1", "A2", "B1", "B2", "C1", "ALL"];
const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "hi", label: "Hindi" },
  { code: "kn", label: "Kannada" },
];

const inputClass =
  "w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200/60 rounded-xl text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:ring-4 focus:ring-[#002856]/5 focus:border-[#002856] transition-all";
const fileClass =
  "w-full text-xs text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-[#eef2f6] file:text-[#002856] hover:file:bg-[#dfe6ef] border border-slate-200/60 rounded-xl p-1.5 bg-slate-50 cursor-pointer transition-colors";

export default function NotesAdd() {
  const [form, setForm] = useState({
    title: "",
    description: "",
    language_code: "en",
    proficiency_level: "ALL",
    display_order: 0,
  });
  const [pdfFile, setPdfFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusInfo, setStatusInfo] = useState(null);

  const setField = (key) => (e) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf") {
      toast.error("Please select a valid PDF file.");
      setPdfFile(null);
      return;
    }
    setPdfFile(file);
    setStatusInfo(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) {
      toast.error("Title is required.");
      return;
    }
    if (!pdfFile) {
      toast.error("PDF file is required.");
      return;
    }

    setIsSubmitting(true);
    setStatusInfo({ type: "uploading", message: "Uploading PDF note and extracting text..." });

    try {
      const formData = new FormData();
      formData.append("file", pdfFile);
      formData.append("title", form.title);
      formData.append("description", form.description);
      formData.append("language_code", form.language_code);
      formData.append("proficiency_level", form.proficiency_level);
      formData.append("display_order", form.display_order || 0);

      const res = await uploadNoteAdmin(formData);
      if (res.data?.success) {
        toast.success("Note uploaded successfully!");
        setStatusInfo({ type: "success", message: "Note uploaded and indexed successfully!" });
        setForm({
          title: "",
          description: "",
          language_code: "en",
          proficiency_level: "ALL",
          display_order: 0,
        });
        setPdfFile(null);
        const fileInput = document.getElementById("note-pdf-file-input");
        if (fileInput) fileInput.value = "";
      } else {
        throw new Error(res.data?.message || "Failed to upload note.");
      }
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.message || err.message || "Upload failed.";
      toast.error(msg);
      setStatusInfo({ type: "error", message: msg });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 p-6 max-w-3xl mx-auto">
      <Toaster position="top-right" />

      {/* Header card */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div className="space-y-1">
          <h1 className="text-xl font-bold text-slate-800">Upload Study Note</h1>
          <p className="text-xs text-slate-400">
            Upload a PDF study note and index it for candidates
          </p>
        </div>
        <Link
          to="/admin/notes/manage"
          className="inline-flex items-center justify-center gap-2 self-start md:self-auto px-4 py-2.5 border border-slate-200 hover:border-[#002856] text-slate-600 hover:text-[#002856] font-bold text-xs rounded-xl bg-white hover:bg-slate-50 transition-colors cursor-pointer"
        >
          Manage notes
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
            Title (Required)
          </label>
          <input
            type="text"
            value={form.title}
            onChange={setField("title")}
            placeholder="e.g. German Grammar A1 Cheat Sheet"
            className={inputClass}
            required
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
            Description (Optional)
          </label>
          <textarea
            rows={3}
            value={form.description}
            onChange={setField("description")}
            placeholder="Brief summary of note contents..."
            className={inputClass}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
              Language
            </label>
            <select
              value={form.language_code}
              onChange={setField("language_code")}
              className={inputClass}
            >
              {LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
              Proficiency Level
            </label>
            <select
              value={form.proficiency_level}
              onChange={setField("proficiency_level")}
              className={inputClass}
            >
              {LEVELS.map((lvl) => (
                <option key={lvl} value={lvl}>
                  {lvl}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
            Display Order
          </label>
          <input
            type="number"
            value={form.display_order}
            onChange={setField("display_order")}
            className={inputClass}
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
            PDF Document (.pdf)
          </label>
          <input
            id="note-pdf-file-input"
            type="file"
            accept="application/pdf"
            onChange={handleFileChange}
            className={fileClass}
            required
          />
        </div>

        {statusInfo && (
          <div
            className={`flex items-center gap-3 p-4 rounded-xl border text-xs font-semibold ${
              statusInfo.type === "uploading"
                ? "bg-[#eef2f6] border-[#ccd9e8] text-[#002856]"
                : statusInfo.type === "success"
                ? "bg-[#eaf7f0] border-[#c3ebc6] text-[#1e7e34]"
                : "bg-[#fff1f2] border-[#fecdd3] text-[#e11d48]"
            }`}
          >
            {statusInfo.type === "uploading" ? (
              <Loader className="w-5 h-5 animate-spin shrink-0" />
            ) : statusInfo.type === "success" ? (
              <CheckCircle className="w-5 h-5 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 shrink-0" />
            )}
            <span>{statusInfo.message}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting || !pdfFile || !form.title.trim()}
          className="w-full py-3 px-4 bg-[#002856] text-white font-bold text-sm rounded-xl hover:bg-[#001e40] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          {isSubmitting ? (
            <>
              <Loader className="w-4 h-4 animate-spin" /> Uploading...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4" /> Upload Note
            </>
          )}
        </button>
      </form>
    </div>
  );
}
