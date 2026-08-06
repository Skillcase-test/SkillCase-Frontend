import React, { useEffect, useState } from "react";
import {
  Trash2,
  Edit2,
  Check,
  X,
  Loader2,
  FileText,
  Users,
  Search,
  RefreshCw,
  HelpCircle,
} from "lucide-react";
import { getNotesAdmin, updateNoteAdmin, deleteNoteAdmin, getStudentList, toggleStudentNotesAccess } from "../../../api/notesApi";
import toast, { Toaster } from "react-hot-toast";

const LEVELS = ["A1", "A2", "B1", "B2", "C1", "ALL"];
const LANGUAGES = [
  { code: "en", label: "EN" },
  { code: "hi", label: "HI" },
  { code: "kn", label: "KN" },
];

const inlineInputClass =
  "px-2.5 py-1.5 bg-slate-50 border border-slate-200/60 rounded-lg text-xs text-slate-700 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#002856]/20 focus:border-[#002856] transition-all";

export default function NotesManage() {
  const [activeTab, setActiveTab] = useState("notes");
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});

  const [students, setStudents] = useState([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchNotes = () => {
    setLoading(true);
    getNotesAdmin()
      .then((res) => setNotes(res.data?.data || []))
      .catch(() => toast.error("Failed to load notes"))
      .finally(() => setLoading(false));
  };

  const fetchStudents = () => {
    setStudentsLoading(true);
    getStudentList({ search, page, limit: 20 })
      .then((res) => {
        setStudents(res.data?.data || []);
        setTotalPages(res.data?.pagination?.totalPages || 1);
      })
      .catch(() => toast.error("Failed to load students"))
      .finally(() => setStudentsLoading(false));
  };

  useEffect(() => {
    if (activeTab === "notes") fetchNotes();
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === "students") fetchStudents();
  }, [activeTab, search, page]);

  const handleRefresh = () => {
    if (activeTab === "notes") fetchNotes();
    else fetchStudents();
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

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const saveEdit = async (noteId) => {
    try {
      const res = await updateNoteAdmin(noteId, editForm);
      if (res.data?.success) {
        toast.success("Note updated successfully");
        setEditingId(null);
        fetchNotes();
      } else {
        toast.error("Failed to update note");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Error updating note");
    }
  };

  const handleDelete = async (noteId, title) => {
    if (!window.confirm(`Are you sure you want to delete note "${title}"?`)) return;
    try {
      const res = await deleteNoteAdmin(noteId);
      if (res.data?.success) {
        toast.success("Note deleted successfully");
        fetchNotes();
      } else {
        toast.error("Failed to delete note");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Error deleting note");
    }
  };

  const handleToggleAccess = async (userId, currentEnabled) => {
    try {
      const res = await toggleStudentNotesAccess(userId, !currentEnabled);
      if (res.data?.success) {
        toast.success(`Notes ${!currentEnabled ? "enabled" : "disabled"}`);
        setStudents((prev) =>
          prev.map((s) =>
            s.user_id === userId ? { ...s, notes_enabled: !currentEnabled } : s
          )
        );
      } else {
        toast.error("Failed to update access");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Error updating access");
    }
  };

  const formatSize = (bytes) => {
    if (!bytes) return "0 KB";
    const kb = bytes / 1024;
    if (kb < 1024) return `${Math.round(kb)} KB`;
    return `${(kb / 1024).toFixed(1)} MB`;
  };

  const emptyState = (title, hint) => (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <HelpCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
      <h3 className="text-slate-600 font-bold text-sm">{title}</h3>
      <p className="text-xs text-slate-400 mt-1">{hint}</p>
    </div>
  );

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      <Toaster position="top-right" />

      {/* Header card */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div className="space-y-1">
          <h1 className="text-xl font-bold text-slate-800">Manage Notes</h1>
          <p className="text-xs text-slate-400">
            Upload study notes, manage metadata, and control student access
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={loading || studentsLoading}
          className="flex items-center justify-center gap-2 self-start md:self-auto px-4 py-2.5 border border-slate-200 hover:border-[#002856] text-slate-600 hover:text-[#002856] font-bold text-xs rounded-xl bg-white hover:bg-slate-50 transition-colors disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 ${loading || studentsLoading ? "animate-spin" : ""}`}
          />
          Refresh
        </button>
      </div>

      {/* Control panel: tabs with counts */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
        <div className="flex flex-wrap gap-2">
          {[
            { key: "notes", label: "Notes Upload", count: notes.length, icon: FileText },
            { key: "students", label: "Student Access", count: students.length, icon: Users },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`px-4 py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === t.key
                  ? "bg-[#002856] text-white border-[#002856] shadow-sm"
                  : "bg-slate-50 text-slate-500 border-slate-200/80 hover:bg-slate-100"
              }`}
            >
              <t.icon className="w-3.5 h-3.5" />
              <span>{t.label}</span>
              <span
                className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold ${
                  activeTab === t.key ? "bg-white/20 text-white" : "bg-slate-200 text-slate-600"
                }`}
              >
                {t.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {activeTab === "notes" && (
        <>
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 bg-white border border-slate-100 rounded-2xl">
              <Loader2 className="w-10 h-10 animate-spin text-[#002856] mb-3" />
              <span className="text-xs">Loading notes...</span>
            </div>
          ) : notes.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
              {emptyState("No notes yet", "Upload study notes from the Upload Study Note page")}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-700">
                  <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 text-[11px] font-bold uppercase tracking-wider">
                    <tr>
                      <th className="px-6 py-3">Title</th>
                      <th className="px-6 py-3">Lang</th>
                      <th className="px-6 py-3">Level</th>
                      <th className="px-6 py-3">Pages</th>
                      <th className="px-6 py-3">Size</th>
                      <th className="px-6 py-3">Order</th>
                      <th className="px-6 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {notes.map((note) => {
                      const isEditing = editingId === note.note_id;

                      return (
                        <tr key={note.note_id} className="hover:bg-slate-50/40 transition">
                          <td className="px-6 py-4 max-w-xs">
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

                          <td className="px-6 py-4 whitespace-nowrap">
                            {isEditing ? (
                              <select
                                value={editForm.language_code}
                                onChange={(e) =>
                                  setEditForm((prev) => ({ ...prev, language_code: e.target.value }))
                                }
                                className={inlineInputClass}
                              >
                                {LANGUAGES.map((l) => (
                                  <option key={l.code} value={l.code}>
                                    {l.label}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <span className="uppercase text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#eef2f6] text-[#002856] border border-[#ccd9e8]">
                                {note.language_code}
                              </span>
                            )}
                          </td>

                          <td className="px-6 py-4 whitespace-nowrap">
                            {isEditing ? (
                              <select
                                value={editForm.proficiency_level}
                                onChange={(e) =>
                                  setEditForm((prev) => ({ ...prev, proficiency_level: e.target.value }))
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
                              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#eef2f6] text-[#002856] border border-[#ccd9e8]">
                                {note.proficiency_level}
                              </span>
                            )}
                          </td>

                          <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-500">
                            {note.page_count || 0}
                          </td>

                          <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-500">
                            {formatSize(note.file_size_bytes)}
                          </td>

                          <td className="px-6 py-4 whitespace-nowrap">
                            {isEditing ? (
                              <input
                                type="number"
                                value={editForm.display_order}
                                onChange={(e) =>
                                  setEditForm((prev) => ({
                                    ...prev,
                                    display_order: e.target.value,
                                  }))
                                }
                                className={`${inlineInputClass} w-16`}
                              />
                            ) : (
                              <span className="text-xs text-slate-600">{note.display_order || 0}</span>
                            )}
                          </td>

                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            {isEditing ? (
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={() => saveEdit(note.note_id)}
                                  title="Save"
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-green-600 hover:bg-green-50 transition-colors cursor-pointer"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={cancelEdit}
                                  title="Cancel"
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={() => startEdit(note)}
                                  title="Edit"
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDelete(note.note_id, note.title)}
                                  title="Delete"
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
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
            </div>
          )}
        </>
      )}

      {activeTab === "students" && (
        <>
          <div className="flex items-center gap-3">
            <div className="relative w-full lg:max-w-xs">
              <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by name or phone..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200/60 rounded-xl text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:ring-4 focus:ring-[#002856]/5 focus:border-[#002856] transition-all"
              />
              {search && (
                <button
                  onClick={() => {
                    setSearch("");
                    setPage(1);
                  }}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {studentsLoading ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 bg-white border border-slate-100 rounded-2xl">
              <Loader2 className="w-10 h-10 animate-spin text-[#002856] mb-3" />
              <span className="text-xs">Loading students...</span>
            </div>
          ) : students.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
              {emptyState(
                "No students found",
                search
                  ? "Try a different name or phone number"
                  : "Students appear here once they use the app"
              )}
            </div>
          ) : (
            <>
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-slate-700">
                    <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 text-[11px] font-bold uppercase tracking-wider">
                      <tr>
                        <th className="px-6 py-3">Name</th>
                        <th className="px-6 py-3">Phone</th>
                        <th className="px-6 py-3 text-center">Notes Access</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {students.map((student) => (
                        <tr key={student.user_id} className="hover:bg-slate-50/40 transition">
                          <td className="px-6 py-4 font-medium text-slate-900">
                            {student.name}
                          </td>
                          <td className="px-6 py-4 text-slate-600">
                            {student.phone || "—"}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <button
                              onClick={() =>
                                handleToggleAccess(student.user_id, student.notes_enabled)
                              }
                              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#002856] focus:ring-offset-2 ${
                                student.notes_enabled ? "bg-green-600" : "bg-slate-300"
                              }`}
                              role="switch"
                              aria-checked={student.notes_enabled}
                            >
                              <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                  student.notes_enabled ? "translate-x-6" : "translate-x-1"
                                }`}
                              />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 text-sm text-slate-600">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-3 py-1.5 border border-slate-200 rounded-lg bg-white hover:bg-slate-50 hover:border-[#002856] hover:text-[#002856] text-xs font-bold text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    Previous
                  </button>
                  <span className="text-xs">
                    Page {page} of {totalPages}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="px-3 py-1.5 border border-slate-200 rounded-lg bg-white hover:bg-slate-50 hover:border-[#002856] hover:text-[#002856] text-xs font-bold text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
