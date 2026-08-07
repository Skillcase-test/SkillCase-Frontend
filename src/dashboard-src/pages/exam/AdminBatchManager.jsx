import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  listBatches,
  createBatch,
  updateBatch,
  deleteBatch,
  getBatchStudents,
  assignStudents,
  removeStudentFromBatch,
  listAllStudents,
} from "../../../api/examApi";
import {
  Plus,
  Trash2,
  Edit3,
  Users,
  Search,
  Loader2,
  Save,
  ArrowLeft,
  X,
  UserPlus,
  UserMinus,
} from "lucide-react";

const inputClass =
  "w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200/60 rounded-xl text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:ring-4 focus:ring-[#002856]/5 focus:border-[#002856] transition-all";
const searchInputClass =
  "w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200/60 rounded-xl text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:ring-4 focus:ring-[#002856]/5 focus:border-[#002856] transition-all";
const labelClass =
  "block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider";
const primaryBtnClass =
  "inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#002856] text-white font-bold text-xs rounded-xl hover:bg-[#001e40] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed";
const outlineBtnClass =
  "inline-flex items-center justify-center gap-2 px-4 py-2.5 border border-slate-200 hover:border-[#002856] text-slate-600 hover:text-[#002856] font-bold text-xs rounded-xl bg-white hover:bg-slate-50 transition-colors cursor-pointer";

export default function AdminBatchManager() {
  const [view, setView] = useState("list");
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({ batch_name: "", description: "" });
  const [editingId, setEditingId] = useState(null);

  const [selectedBatch, setSelectedBatch] = useState(null);
  const [batchStudents, setBatchStudents] = useState([]);
  const [allStudents, setAllStudents] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingStudents, setLoadingStudents] = useState(false);

  const fetchBatches = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listBatches();
      setBatches(res.data?.batches || []);
    } catch {
      setError("Failed to load batches");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBatches();
  }, [fetchBatches]);

  const handleSave = async () => {
    if (!form.batch_name.trim()) return;
    setSaving(true);
    try {
      if (editingId) {
        await updateBatch(editingId, form);
      } else {
        await createBatch(form);
      }
      setForm({ batch_name: "", description: "" });
      setEditingId(null);
      await fetchBatches();
      setView("list");
    } catch (err) {
      setError(err.response?.data?.msg || "Failed to save batch");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (batchId) => {
    if (!window.confirm("Delete this batch? Students will be unassigned."))
      return;
    try {
      await deleteBatch(batchId);
      await fetchBatches();
    } catch {
      setError("Failed to delete batch");
    }
  };

  const openDetail = async (batch) => {
    setSelectedBatch(batch);
    setLoadingStudents(true);
    setSearchQuery("");
    try {
      const [batchRes, allRes] = await Promise.all([
        getBatchStudents(batch.batch_id),
        listAllStudents(),
      ]);
      setBatchStudents(batchRes.data?.students || []);
      setAllStudents(allRes.data?.students || []);
      setView("detail");
    } catch {
      setError("Failed to load students");
    } finally {
      setLoadingStudents(false);
    }
  };

  const handleAssign = async (userId) => {
    try {
      await assignStudents(selectedBatch.batch_id, [userId]);
      const res = await getBatchStudents(selectedBatch.batch_id);
      setBatchStudents(res.data?.students || []);
    } catch {
      setError("Failed to assign student");
    }
  };

  const handleRemove = async (userId) => {
    try {
      await removeStudentFromBatch(selectedBatch.batch_id, userId);
      setBatchStudents((prev) => prev.filter((s) => s.user_id !== userId));
    } catch {
      setError("Failed to remove student");
    }
  };

  // Filter all students by search query, exclude already-assigned
  const batchStudentIds = useMemo(
    () => new Set(batchStudents.map((s) => s.user_id)),
    [batchStudents],
  );

  const filteredAvailable = useMemo(() => {
    const available = allStudents.filter(
      (s) => !batchStudentIds.has(s.user_id),
    );
    if (!searchQuery.trim()) return available;
    const q = searchQuery.toLowerCase();
    return available.filter(
      (s) =>
        (s.fullname || "").toLowerCase().includes(q) ||
        (s.username || "").toLowerCase().includes(q) ||
        (s.number || "").toLowerCase().includes(q),
    );
  }, [allStudents, batchStudentIds, searchQuery]);

  if (loading && view === "list") {
    return (
      <div className="space-y-6 p-6 max-w-4xl mx-auto">
        <div className="flex flex-col items-center justify-center py-20 bg-white border border-slate-100 rounded-2xl text-slate-400">
          <Loader2 className="w-10 h-10 animate-spin text-[#002856] mb-3" />
          <span className="text-xs">Loading batches...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 max-w-4xl mx-auto">
      {error && (
        <div className="flex items-center justify-between gap-3 px-4 py-3 bg-[#fff1f2] border border-[#fecdd3] rounded-xl text-xs font-semibold text-[#e11d48]">
          <span>{error}</span>
          <button
            onClick={() => setError("")}
            className="text-[#e11d48] hover:bg-white/70 rounded-lg p-1 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* LIST */}
      {view === "list" && (
        <div className="space-y-6">
          {/* Header card */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <div className="space-y-1">
              <h1 className="text-xl font-bold text-slate-800">
                Batch Management
              </h1>
              <p className="text-xs text-slate-400">
                Create and manage exam batches for your students
              </p>
            </div>
            <button
              onClick={() => {
                setForm({ batch_name: "", description: "" });
                setEditingId(null);
                setView("create");
              }}
              className={primaryBtnClass}
            >
              <Plus className="w-4 h-4" /> New Batch
            </button>
          </div>

          {batches.length === 0 ? (
            <div className="text-center py-14 bg-white border border-slate-100 rounded-2xl p-6">
              <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-slate-600 font-bold text-sm">No batches yet</h3>
              <p className="text-xs text-slate-400 mt-1">
                Create your first batch to start grouping students
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {batches.map((b) => (
                <div
                  key={b.batch_id}
                  className="bg-white border border-slate-100 rounded-2xl shadow-sm hover:shadow-md transition-all p-5 flex items-center justify-between gap-4"
                >
                  <div
                    className="cursor-pointer flex-1 min-w-0"
                    onClick={() => openDetail(b)}
                  >
                    <div className="flex items-center gap-2.5 mb-1">
                      <h3 className="font-bold text-slate-800 text-sm truncate">
                        {b.batch_name}
                      </h3>
                      <span className="shrink-0 px-2 py-0.5 rounded-full bg-[#eef2f6] border border-[#ccd9e8] text-[#002856] text-[10px] font-bold">
                        {b.student_count} students
                      </span>
                    </div>
                    {b.description && (
                      <p className="text-xs text-slate-400 truncate">
                        {b.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => {
                        setForm({
                          batch_name: b.batch_name,
                          description: b.description || "",
                        });
                        setEditingId(b.batch_id);
                        setView("create");
                      }}
                      className="p-2 text-slate-400 hover:text-[#002856] hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                      title="Edit batch"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(b.batch_id)}
                      className="p-2 text-slate-400 hover:text-[#e11d48] hover:bg-[#fff1f2] rounded-lg transition-colors cursor-pointer"
                      title="Delete batch"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* CREATE/EDIT */}
      {view === "create" && (
        <div className="space-y-6">
          {/* Header card */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <div className="space-y-1">
              <h1 className="text-xl font-bold text-slate-800">
                {editingId ? "Edit Batch" : "Create Batch"}
              </h1>
              <p className="text-xs text-slate-400">
                {editingId
                  ? "Update the batch details below"
                  : "Add a new batch to organize your students"}
              </p>
            </div>
            <button
              onClick={() => setView("list")}
              className={outlineBtnClass}
            >
              <ArrowLeft className="w-4 h-4" /> Back to batches
            </button>
          </div>

          {/* Form card */}
          <div className="space-y-5 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm max-w-md">
            <div>
              <label className={labelClass}>
                Name <span className="text-rose-500">*</span>
              </label>
              <input
                value={form.batch_name}
                onChange={(e) =>
                  setForm({ ...form, batch_name: e.target.value })
                }
                className={inputClass}
                placeholder="e.g., A2 Morning Batch"
              />
            </div>
            <div>
              <label className={labelClass}>Description</label>
              <textarea
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                className={inputClass}
                rows={2}
                placeholder="Optional description for this batch"
              />
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={handleSave}
                disabled={saving || !form.batch_name.trim()}
                className={primaryBtnClass}
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Save
              </button>
              <button
                onClick={() => setView("list")}
                className={outlineBtnClass}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DETAIL */}
      {view === "detail" && selectedBatch && (
        <div className="space-y-6">
          {/* Header card */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <div className="space-y-1">
              <h1 className="text-xl font-bold text-slate-800">
                {selectedBatch.batch_name}
              </h1>
              <p className="text-xs text-slate-400">
                Manage students in this batch
                {selectedBatch.description
                  ? ` — ${selectedBatch.description}`
                  : ""}
              </p>
            </div>
            <button
              onClick={() => {
                setView("list");
                fetchBatches();
              }}
              className={outlineBtnClass}
            >
              <ArrowLeft className="w-4 h-4" /> Back to batches
            </button>
          </div>

          {loadingStudents ? (
            <div className="flex flex-col items-center justify-center py-20 bg-white border border-slate-100 rounded-2xl text-slate-400">
              <Loader2 className="w-10 h-10 animate-spin text-[#002856] mb-3" />
              <span className="text-xs">Loading students...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* LEFT: Available Students */}
              <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm flex flex-col">
                <div className="px-4 py-3 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="font-bold text-xs text-slate-700">
                    All Students
                  </h3>
                  <span className="px-2 py-0.5 rounded-full bg-[#eef2f6] border border-[#ccd9e8] text-[#002856] text-[10px] font-bold">
                    {filteredAvailable.length} available
                  </span>
                </div>
                <div className="p-3 border-b border-slate-100">
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
                    <input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className={searchInputClass}
                      placeholder="Filter by name or phone..."
                    />
                  </div>
                </div>
                <div className="max-h-[400px] overflow-y-auto flex-1">
                  {filteredAvailable.length === 0 ? (
                    <p className="text-slate-400 text-xs text-center py-8">
                      {searchQuery
                        ? "No matching students found"
                        : "All students are already in this batch"}
                    </p>
                  ) : (
                    filteredAvailable.map((s) => (
                      <div
                        key={s.user_id}
                        className="flex items-center justify-between gap-3 px-4 py-3 border-b last:border-b-0 border-slate-100 hover:bg-slate-50 transition-colors"
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-800 truncate">
                            {s.fullname || s.username}
                          </p>
                          <p className="text-[11px] text-slate-400 truncate">
                            {s.number} •{" "}
                            <span className="px-1.5 py-0.5 rounded font-bold bg-[#eef2f6] text-[#002856] text-[9px]">
                              {s.current_profeciency_level || "—"}
                            </span>
                          </p>
                        </div>
                        <button
                          onClick={() => handleAssign(s.user_id)}
                          className="text-[#002856] hover:bg-[#eef2f6] p-2 rounded-lg transition-colors cursor-pointer shrink-0"
                          title="Assign to batch"
                        >
                          <UserPlus className="w-4 h-4" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* RIGHT: Batch Students */}
              <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm flex flex-col">
                <div className="px-4 py-3 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="font-bold text-xs text-slate-700">
                    In Batch
                  </h3>
                  <span className="px-2 py-0.5 rounded-full bg-[#eef2f6] border border-[#ccd9e8] text-[#002856] text-[10px] font-bold">
                    {batchStudents.length} students
                  </span>
                </div>
                <div className="max-h-[400px] overflow-y-auto flex-1">
                  {batchStudents.length === 0 ? (
                    <p className="text-slate-400 text-xs text-center py-8">
                      No students in this batch yet
                    </p>
                  ) : (
                    batchStudents.map((s) => (
                      <div
                        key={s.user_id}
                        className="flex items-center justify-between gap-3 px-4 py-3 border-b last:border-b-0 border-slate-100 hover:bg-slate-50 transition-colors"
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-800 truncate">
                            {s.fullname || s.username}
                          </p>
                          <p className="text-[11px] text-slate-400 truncate">
                            {s.number} •{" "}
                            <span className="px-1.5 py-0.5 rounded font-bold bg-[#eef2f6] text-[#002856] text-[9px]">
                              {s.current_profeciency_level || "—"}
                            </span>
                          </p>
                        </div>
                        <button
                          onClick={() => handleRemove(s.user_id)}
                          className="text-[#e11d48] hover:bg-[#fff1f2] p-2 rounded-lg transition-colors cursor-pointer shrink-0"
                          title="Remove from batch"
                        >
                          <UserMinus className="w-4 h-4" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
