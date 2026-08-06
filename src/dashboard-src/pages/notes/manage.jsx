import React, { useEffect, useState } from "react";
import { Trash2, Edit2, Check, X, Loader2, FileText, Users, Search } from "lucide-react";
import { getNotesAdmin, updateNoteAdmin, deleteNoteAdmin, getStudentList, toggleStudentNotesAccess } from "../../../api/notesApi";
import toast, { Toaster } from "react-hot-toast";

const LEVELS = ["A1", "A2", "B1", "B2", "C1", "ALL"];
const LANGUAGES = [
  { code: "en", label: "EN" },
  { code: "hi", label: "HI" },
  { code: "kn", label: "KN" },
];

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

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <Toaster position="top-right" />
      <h1 className="text-xl font-bold text-slate-900 mb-6">Manage Notes</h1>

      <div className="flex gap-2 mb-6 border-b border-slate-200">
        <button
          onClick={() => setActiveTab("notes")}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === "notes"
              ? "border-[#002856] text-[#002856]"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <FileText className="w-4 h-4 inline mr-2" />
          Notes Upload
        </button>
        <button
          onClick={() => setActiveTab("students")}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === "students"
              ? "border-[#002856] text-[#002856]"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <Users className="w-4 h-4 inline mr-2" />
          Student Access
        </button>
      </div>

      {activeTab === "notes" && (
        <>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-[#002856]" />
            </div>
          ) : notes.length === 0 ? (
            <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-slate-500 text-sm">
              No study notes uploaded yet.
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Title</th>
                  <th className="px-4 py-3">Lang</th>
                  <th className="px-4 py-3">Level</th>
                  <th className="px-4 py-3">Pages</th>
                  <th className="px-4 py-3">Size</th>
                  <th className="px-4 py-3">Order</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {notes.map((note) => {
                  const isEditing = editingId === note.note_id;

                  return (
                    <tr key={note.note_id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 max-w-xs">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editForm.title}
                            onChange={(e) =>
                              setEditForm((prev) => ({ ...prev, title: e.target.value }))
                            }
                            className="w-full px-2 py-1 border border-slate-300 rounded text-xs"
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

                      <td className="px-4 py-3 whitespace-nowrap">
                        {isEditing ? (
                          <select
                            value={editForm.language_code}
                            onChange={(e) =>
                              setEditForm((prev) => ({ ...prev, language_code: e.target.value }))
                            }
                            className="px-2 py-1 border border-slate-300 rounded text-xs"
                          >
                            {LANGUAGES.map((l) => (
                              <option key={l.code} value={l.code}>
                                {l.label}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="uppercase text-xs font-bold px-2 py-0.5 bg-slate-100 rounded text-slate-700">
                            {note.language_code}
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap">
                        {isEditing ? (
                          <select
                            value={editForm.proficiency_level}
                            onChange={(e) =>
                              setEditForm((prev) => ({ ...prev, proficiency_level: e.target.value }))
                            }
                            className="px-2 py-1 border border-slate-300 rounded text-xs"
                          >
                            {LEVELS.map((lvl) => (
                              <option key={lvl} value={lvl}>
                                {lvl}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-xs font-medium px-2 py-0.5 bg-blue-50 text-blue-700 rounded border border-blue-200">
                            {note.proficiency_level}
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-500">
                        {note.page_count || 0}
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-500">
                        {formatSize(note.file_size_bytes)}
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap">
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
                            className="w-16 px-2 py-1 border border-slate-300 rounded text-xs"
                          />
                        ) : (
                          <span className="text-xs text-slate-600">{note.display_order || 0}</span>
                        )}
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap text-right">
                        {isEditing ? (
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => saveEdit(note.note_id)}
                              title="Save"
                              className="p-1.5 text-green-600 hover:bg-green-50 rounded cursor-pointer"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={cancelEdit}
                              title="Cancel"
                              className="p-1.5 text-slate-500 hover:bg-slate-100 rounded cursor-pointer"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => startEdit(note)}
                              title="Edit"
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded cursor-pointer"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(note.note_id, note.title)}
                              title="Delete"
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded cursor-pointer"
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
          <div className="mb-4 flex items-center gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by name or phone..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#002856] focus:border-transparent"
              />
            </div>
          </div>

          {studentsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-[#002856]" />
            </div>
          ) : students.length === 0 ? (
            <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-slate-500 text-sm">
              {search ? "No students found matching your search." : "No students found."}
            </div>
          ) : (
            <>
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-slate-700">
                    <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold uppercase text-slate-500">
                      <tr>
                        <th className="px-4 py-3">Name</th>
                        <th className="px-4 py-3">Phone</th>
                        <th className="px-4 py-3 text-center">Notes Access</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {students.map((student) => (
                        <tr key={student.user_id} className="hover:bg-slate-50/50">
                          <td className="px-4 py-3 font-medium text-slate-900">
                            {student.name}
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {student.phone || "—"}
                          </td>
                          <td className="px-4 py-3 text-center">
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
                    className="px-3 py-1.5 border border-slate-300 rounded bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <span>
                    Page {page} of {totalPages}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="px-3 py-1.5 border border-slate-300 rounded bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
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
