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
    } catch (err) {
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
    } catch (err) {
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
    } catch (err) {
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
    } catch (err) {
      setError("Failed to assign student");
    }
  };

  const handleRemove = async (userId) => {
    try {
      await removeStudentFromBatch(selectedBatch.batch_id, userId);
      setBatchStudents((prev) => prev.filter((s) => s.user_id !== userId));
    } catch (err) {
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
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl">
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center justify-between">
          {error}{" "}
          <button onClick={() => setError("")}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* LIST */}
      {view === "list" && (
        <div>
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-gray-900">
              Batch Management
            </h1>
            <button
              onClick={() => {
                setForm({ batch_name: "", description: "" });
                setEditingId(null);
                setView("create");
              }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold"
            >
              <Plus className="w-4 h-4" /> New Batch
            </button>
          </div>
          {batches.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No batches yet.</p>
          ) : (
            <div className="space-y-3">
              {batches.map((b) => (
                <div
                  key={b.batch_id}
                  className="bg-white border rounded-lg p-4 flex items-center justify-between hover:shadow-sm"
                >
                  <div
                    className="cursor-pointer flex-1"
                    onClick={() => openDetail(b)}
                  >
                    <h3 className="font-semibold text-gray-900">
                      {b.batch_name}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {b.student_count} students
                      {b.description ? ` — ${b.description}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setForm({
                          batch_name: b.batch_name,
                          description: b.description || "",
                        });
                        setEditingId(b.batch_id);
                        setView("create");
                      }}
                      className="p-2 text-gray-400 hover:text-blue-600"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(b.batch_id)}
                      className="p-2 text-gray-400 hover:text-red-600"
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
        <div>
          <button
            onClick={() => setView("list")}
            className="flex items-center gap-1 text-sm text-gray-500 mb-4"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <h2 className="text-xl font-bold mb-4">
            {editingId ? "Edit Batch" : "Create Batch"}
          </h2>
          <div className="space-y-4 max-w-md">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name *
              </label>
              <input
                value={form.batch_name}
                onChange={(e) =>
                  setForm({ ...form, batch_name: e.target.value })
                }
                className="w-full px-3 py-2 border rounded-lg text-sm"
                placeholder="e.g., A2 Morning Batch"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                className="w-full px-3 py-2 border rounded-lg text-sm"
                rows={2}
              />
            </div>
            <button
              onClick={handleSave}
              disabled={saving || !form.batch_name.trim()}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold disabled:opacity-50 flex items-center gap-2"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}{" "}
              Save
            </button>
          </div>
        </div>
      )}

      {/* DETAIL */}
      {view === "detail" && selectedBatch && (
        <div>
          <button
            onClick={() => {
              setView("list");
              fetchBatches();
            }}
            className="flex items-center gap-1 text-sm text-gray-500 mb-4"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <h2 className="text-xl font-bold mb-4">{selectedBatch.batch_name}</h2>

          {loadingStudents ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* LEFT: Available Students */}
              <div>
                <h3 className="font-semibold text-sm text-gray-700 mb-2">
                  All Students
                </h3>
                <div className="relative mb-3">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm"
                    placeholder="Filter by name or phone..."
                  />
                </div>
                <div className="border rounded-lg max-h-[400px] overflow-y-auto">
                  {filteredAvailable.length === 0 ? (
                    <p className="text-gray-400 text-sm text-center py-6">
                      {searchQuery
                        ? "No matching students found"
                        : "All students are already in this batch"}
                    </p>
                  ) : (
                    filteredAvailable.map((s) => (
                      <div
                        key={s.user_id}
                        className="flex items-center justify-between px-3 py-2.5 border-b last:border-b-0 hover:bg-gray-50"
                      >
                        <div>
                          <p className="text-sm font-medium text-gray-800">
                            {s.fullname || s.username}
                          </p>
                          <p className="text-xs text-gray-400">
                            {s.number} • {s.current_profeciency_level || "—"}
                          </p>
                        </div>
                        <button
                          onClick={() => handleAssign(s.user_id)}
                          className="text-blue-600 hover:bg-blue-50 p-1.5 rounded-lg transition-colors"
                        >
                          <UserPlus className="w-4 h-4" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  {filteredAvailable.length} available
                </p>
              </div>

              {/* RIGHT: Batch Students */}
              <div>
                <h3 className="font-semibold text-sm text-gray-700 mb-2">
                  In Batch ({batchStudents.length})
                </h3>
                <div className="border rounded-lg max-h-[400px] overflow-y-auto">
                  {batchStudents.length === 0 ? (
                    <p className="text-gray-400 text-sm text-center py-6">
                      No students in this batch yet
                    </p>
                  ) : (
                    batchStudents.map((s) => (
                      <div
                        key={s.user_id}
                        className="flex items-center justify-between px-3 py-2.5 border-b last:border-b-0 hover:bg-gray-50"
                      >
                        <div>
                          <p className="text-sm font-medium text-gray-800">
                            {s.fullname || s.username}
                          </p>
                          <p className="text-xs text-gray-400">
                            {s.number} • {s.current_profeciency_level || "—"}
                          </p>
                        </div>
                        <button
                          onClick={() => handleRemove(s.user_id)}
                          className="text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-colors"
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
