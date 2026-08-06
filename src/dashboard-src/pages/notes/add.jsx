import React, { useState } from "react";
import { Upload, CheckCircle, AlertCircle, Loader } from "lucide-react";
import { uploadNoteAdmin } from "../../../api/notesApi";
import toast, { Toaster } from "react-hot-toast";

const LEVELS = ["A1", "A2", "B1", "B2", "C1", "ALL"];
const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "hi", label: "Hindi" },
  { code: "kn", label: "Kannada" },
];

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

  const inputClass =
    "w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-900";
  const fileClass =
    "w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer";

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <Toaster position="top-right" />
      <h1 className="text-xl font-bold text-slate-900 mb-6">Upload Study Note</h1>

      <form onSubmit={handleSubmit} className="space-y-5 bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <label className="block text-sm font-semibold text-slate-800 mb-2">
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
          <label className="block text-sm font-semibold text-slate-800 mb-2">
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
            <label className="block text-sm font-semibold text-slate-800 mb-2">
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
            <label className="block text-sm font-semibold text-slate-800 mb-2">
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
          <label className="block text-sm font-semibold text-slate-800 mb-2">
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
          <label className="block text-sm font-semibold text-slate-800 mb-2">
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
            className={`flex items-center gap-3 p-4 rounded-lg border text-sm font-medium ${
              statusInfo.type === "uploading"
                ? "bg-blue-50 border-blue-200 text-blue-700"
                : statusInfo.type === "success"
                ? "bg-green-50 border-green-200 text-green-700"
                : "bg-red-50 border-red-200 text-red-700"
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
          className="w-full py-2.5 px-4 bg-[#002856] text-white font-semibold rounded-lg hover:bg-blue-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 cursor-pointer"
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
