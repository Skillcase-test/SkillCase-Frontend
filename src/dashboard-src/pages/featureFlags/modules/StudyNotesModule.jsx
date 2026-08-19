import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  Check,
  Edit2,
  FileText,
  Loader2,
  Plus,
  RefreshCw,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import {
  getNotesAdmin,
  uploadNoteAdmin,
  updateNoteAdmin,
  deleteNoteAdmin,
} from "../../../../api/notesApi";

const LEVELS = ["A1", "A2", "B1", "B2", "C1", "ALL"];
const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "hi", label: "Hindi" },
  { code: "kn", label: "Kannada" },
];

const EMPTY_FORM = {
  title: "",
  description: "",
  language_code: "en",
  proficiency_level: "ALL",
  display_order: 0,
};

const inputClass =
  "w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200/60 rounded-xl text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:ring-4 focus:ring-[#002856]/5 focus:border-[#002856] transition-all";
const inlineInputClass =
  "px-2.5 py-1.5 bg-slate-50 border border-slate-200/60 rounded-lg text-xs text-slate-700 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#002856]/20 focus:border-[#002856] transition-all";
const labelClass =
  "block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider";
const pillClass =
  "text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#eef2f6] text-[#002856] border border-[#ccd9e8]";

function formatSize(bytes) {
  if (!bytes) return "0 KB";
  const kb = bytes / 1024;
  return kb < 1024 ? `${Math.round(kb)} KB` : `${(kb / 1024).toFixed(1)} MB`;
}

export default function StudyNotesModule({ canEdit = false }) {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);

  const [form, setForm] = useState(EMPTY_FORM);
  const [pdfFile, setPdfFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});

  const loadNotes = async () => {
    try {
      setLoading(true);
      const res = await getNotesAdmin();
      setNotes(res.data?.data || []);
    } catch {
      toast.error("Failed to load study notes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotes();
  }, []);

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
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !pdfFile) {
      toast.error("Title and a PDF file are required.");
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append("file", pdfFile);
      Object.entries(form).forEach(([key, value]) => formData.append(key, value));

      const res = await uploadNoteAdmin(formData);
      if (!res.data?.success) throw new Error(res.data?.message || "Upload failed.");

      toast.success("Note uploaded and indexed successfully");
      setForm(EMPTY_FORM);
      setPdfFile(null);
      setShowUpload(false);
      loadNotes();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const startEdit = (note) => {
    setEditingId(note.note_id);
    setEditForm({
      title: note.title,
      description: note.description || "",
      language_code: note.language_code,
      proficiency_level: note.proficiency_level,
      display_order: note.display_order || 0,
    });
  };

  const saveEdit = async (noteId) => {
    try {
      const res = await updateNoteAdmin(noteId, editForm);
      if (!res.data?.success) throw new Error(res.data?.message);
      toast.success("Note updated successfully");
      setEditingId(null);
      loadNotes();
    } catch (err) {
      toast.error(err.response?.data?.message || "Error updating note");
    }
  };

  const handleDelete = async (note) => {
    if (!window.confirm(`Are you sure you want to delete note "${note.title}"?`)) return;
    try {
      const res = await deleteNoteAdmin(note.note_id);
      if (!res.data?.success) throw new Error(res.data?.message);
      toast.success("Note deleted successfully");
      loadNotes();
    } catch (err) {
      toast.error(err.response?.data?.message || "Error deleting note");
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
      <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 shrink-0">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Study Notes Library{" "}
              <span className="text-xs font-semibold text-slate-400">({notes.length})</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              PDF content served to students who have this feature enabled.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={loadNotes}
            disabled={loading}
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors cursor-pointer disabled:opacity-50"
            title="Reload notes"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-blue-950" : ""}`} />
          </button>
          <button
            type="button"
            disabled={!canEdit}
            onClick={() => setShowUpload((prev) => !prev)}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
              !canEdit
                ? "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
                : "bg-[#002856] text-white hover:bg-[#001e40] cursor-pointer"
            }`}
            title={
              canEdit
                ? "Upload a new study note"
                : "Requires the Notes Content permission"
            }
          >
            {showUpload ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
            {showUpload ? "Cancel" : "Upload Note"}
          </button>
        </div>
      </div>

      {showUpload && canEdit && (
        <form onSubmit={handleUpload} className="p-5 space-y-4 bg-slate-50/60 border-b border-slate-100">
          <div>
            <label className={labelClass}>Title (Required)</label>
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
            <label className={labelClass}>Description (Optional)</label>
            <textarea
              rows={2}
              value={form.description}
              onChange={setField("description")}
              placeholder="Brief summary of note contents..."
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>Language</label>
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
              <label className={labelClass}>Proficiency Level</label>
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
            <div>
              <label className={labelClass}>Display Order</label>
              <input
                type="number"
                value={form.display_order}
                onChange={setField("display_order")}
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>PDF Document (.pdf)</label>
            <input
              type="file"
              accept="application/pdf"
              onChange={handleFileChange}
              className="w-full text-xs text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-[#eef2f6] file:text-[#002856] hover:file:bg-[#dfe6ef] border border-slate-200/60 rounded-xl p-1.5 bg-white cursor-pointer transition-colors"
              required
            />
          </div>

          <button
            type="submit"
            disabled={uploading || !pdfFile || !form.title.trim()}
            className="w-full py-3 px-4 bg-[#002856] text-white font-bold text-sm rounded-xl hover:bg-[#001e40] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Uploading and extracting text...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" /> Upload Note
              </>
            )}
          </button>
        </form>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-[#002856] mb-3" />
          <span className="text-xs">Loading notes...</span>
        </div>
      ) : notes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <FileText className="w-10 h-10 text-slate-300 mb-3" />
          <h3 className="text-slate-600 font-bold text-sm">No notes yet</h3>
          <p className="text-xs text-slate-400 mt-1">
            Upload a PDF to make it available to students with this feature enabled.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="py-3 px-4">Title</th>
                <th className="py-3 px-4">Lang</th>
                <th className="py-3 px-4">Level</th>
                <th className="py-3 px-4">Pages</th>
                <th className="py-3 px-4">Size</th>
                <th className="py-3 px-4">Order</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {notes.map((note) => {
                const isEditing = editingId === note.note_id;
                return (
                  <tr key={note.note_id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4 max-w-xs">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editForm.title}
                          onChange={(e) =>
                            setEditForm((prev) => ({ ...prev, title: e.target.value }))
                          }
                          className={inlineInputClass}
                        />
                      ) : (
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-amber-600 shrink-0" />
                          <span className="font-semibold text-slate-900 truncate">
                            {note.title}
                          </span>
                        </div>
                      )}
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {isEditing ? (
                        <select
                          value={editForm.language_code}
                          onChange={(e) =>
                            setEditForm((prev) => ({ ...prev, language_code: e.target.value }))
                          }
                          className={inlineInputClass}
                        >
                          {LANGUAGES.map((lang) => (
                            <option key={lang.code} value={lang.code}>
                              {lang.code.toUpperCase()}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className={`uppercase ${pillClass}`}>{note.language_code}</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {isEditing ? (
                        <select
                          value={editForm.proficiency_level}
                          onChange={(e) =>
                            setEditForm((prev) => ({
                              ...prev,
                              proficiency_level: e.target.value,
                            }))
                          }
                          className={inlineInputClass}
                        >
                          {LEVELS.map((lvl) => (
                            <option key={lvl} value={lvl}>
                              {lvl}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className={pillClass}>{note.proficiency_level}</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap text-xs text-slate-500">
                      {note.page_count || 0}
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap text-xs text-slate-500">
                      {formatSize(note.file_size_bytes)}
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {isEditing ? (
                        <input
                          type="number"
                          value={editForm.display_order}
                          onChange={(e) =>
                            setEditForm((prev) => ({ ...prev, display_order: e.target.value }))
                          }
                          className={`${inlineInputClass} w-16`}
                        />
                      ) : (
                        <span className="text-xs text-slate-600">{note.display_order || 0}</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap text-right">
                      {isEditing ? (
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => saveEdit(note.note_id)}
                            title="Save"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-green-600 hover:bg-green-50 transition-colors cursor-pointer"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            title="Cancel"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            disabled={!canEdit}
                            onClick={() => startEdit(note)}
                            title={canEdit ? "Edit" : "Requires the Notes Content permission"}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            disabled={!canEdit}
                            onClick={() => handleDelete(note)}
                            title={canEdit ? "Delete" : "Requires the Notes Content permission"}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
