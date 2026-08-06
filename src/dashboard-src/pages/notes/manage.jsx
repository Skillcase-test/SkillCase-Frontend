import React, { useEffect, useState } from "react";
import { Trash2, Edit2, Check, X, Loader2, FileText } from "lucide-react";
import { getNotesAdmin, updateNoteAdmin, deleteNoteAdmin } from "../../../api/notesApi";
import toast, { Toaster } from "react-hot-toast";

const LEVELS = ["A1", "A2", "B1", "B2", "C1", "ALL"];
const LANGUAGES = [
  { code: "en", label: "EN" },
  { code: "hi", label: "HI" },
  { code: "kn", label: "KN" },
];

export default function NotesManage() {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});

  const fetchNotes = () => {
    setLoading(true);
    getNotesAdmin()
      .then((res) => setNotes(res.data?.data || []))
      .catch(() => toast.error("Failed to load notes"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchNotes();
  }, []);

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

  const formatSize = (bytes) => {
    if (!bytes) return "0 KB";
    const kb = bytes / 1024;
    if (kb < 1024) return `${Math.round(kb)} KB`;
    return `${(kb / 1024).toFixed(1)} MB`;
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <Toaster position="top-right" />
      <h1 className="text-xl font-bold text-slate-900 mb-6">Manage Study Notes</h1>

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
    </div>
  );
}
