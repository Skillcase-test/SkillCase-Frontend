import React, { useState, useEffect } from "react";
import { Trash2, Loader2, Power } from "lucide-react";
import {
  getB2ExercisesAdmin,
  toggleB2Exercise,
  deleteB2Exercise,
  deleteWithAttemptGuard,
} from "../../../../api/b2Api";
import toast, { Toaster } from "react-hot-toast";

const TAGS = ["all", "telc", "goethe"];

const MODULE_LABEL = {
  reading: "Reading",
  listening: "Listening",
  speaking: "Speaking",
  writing: "Writing",
};

export default function ExerciseManageTable({ module }) {
  const [exercises, setExercises] = useState([]);
  const [loading, setLoading] = useState(false);
  const [tagFilter, setTagFilter] = useState("all");

  const moduleLabel = MODULE_LABEL[module] || module;

  useEffect(() => {
    fetchExercises();
  }, [tagFilter]);

  const fetchExercises = async () => {
    setLoading(true);
    try {
      const params = { module };
      if (tagFilter !== "all") params.tag = tagFilter;
      const res = await getB2ExercisesAdmin(params);
      setExercises(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to fetch exercises");
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (id) => {
    try {
      await toggleB2Exercise(id);
      toast.success("Visibility toggled");
      fetchExercises();
    } catch (err) {
      console.error(err);
      toast.error("Failed to toggle exercise");
    }
  };

  const handleDelete = async (id, title) => {
    if (
      !window.confirm(
        `Are you sure you want to delete exercise "${title}" permanently?`,
      )
    )
      return;
    try {
      if (await deleteWithAttemptGuard(deleteB2Exercise, id)) {
        toast.success("Exercise deleted successfully");
        fetchExercises();
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.error || "Failed to delete exercise");
    }
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-9xl mx-auto">
      <Toaster position="top-center" />
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-2xl md:text-3xl text-gray-800 font-bold">
            Manage B2 {moduleLabel} Exercises
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            List, toggle visibility and delete B2 {moduleLabel} practice
            exercises.
          </p>
        </div>
        <button
          onClick={fetchExercises}
          className="text-xs text-blue-600 font-bold hover:underline cursor-pointer"
        >
          Refresh List
        </button>
      </div>

      {/* Tag filter */}
      <div className="mb-4 flex flex-wrap gap-4">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-bold text-slate-500 uppercase">
            Tag
          </span>
          {TAGS.map((t) => (
            <button
              key={t}
              onClick={() => setTagFilter(t)}
              className={`py-1 px-2.5 rounded-lg font-bold text-[10px] border transition-all ${
                tagFilter === t
                  ? "bg-[#002856] text-white border-[#002856]"
                  : "bg-white text-slate-600 border-slate-200"
              }`}
            >
              {t.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white shadow-sm border border-slate-100 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <span className="font-semibold text-slate-700">
            {moduleLabel} Exercises ({exercises.length})
          </span>
        </div>

        {loading ? (
          <div className="py-12 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-[#002856]" />
          </div>
        ) : exercises.length === 0 ? (
          <div className="py-12 text-center text-slate-500 font-medium">
            No {moduleLabel.toLowerCase()} exercises uploaded yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-[11px] font-bold uppercase tracking-wider border-b border-slate-100">
                  <th className="px-6 py-3 w-16 text-center">No.</th>
                  <th className="px-6 py-3">Title</th>
                  <th className="px-6 py-3">Tag</th>
                  <th className="px-6 py-3">Difficulty</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {exercises.map((ex, idx) => (
                  <tr
                    key={ex.id || idx}
                    className="hover:bg-slate-50/40 transition"
                  >
                    <td className="px-6 py-4 font-semibold text-slate-600 text-center">
                      {idx + 1}
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-800">
                      {ex.title}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-[10px] px-2 py-0.5 bg-slate-100 rounded text-slate-600 font-bold uppercase">
                        {ex.tag}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-[10px] px-2 py-0.5 bg-amber-50 text-amber-800 rounded font-bold uppercase">
                        {ex.difficulty_tag || "Medium"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                          ex.is_active
                            ? "bg-green-50 text-green-700"
                            : "bg-slate-100 text-slate-400"
                        }`}
                      >
                        {ex.is_active ? "Live" : "Hidden"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => handleToggle(ex.id)}
                          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                            ex.is_active
                              ? "text-green-600 hover:bg-green-50"
                              : "text-slate-300 hover:bg-slate-100"
                          }`}
                          title={ex.is_active ? "Hide" : "Show"}
                        >
                          <Power className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(ex.id, ex.title)}
                          className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
