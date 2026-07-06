import React, { useState, useEffect } from "react";
import { Trash2, ArrowUp, ArrowDown, Loader2 } from "lucide-react";
import { getB1Chapters, reorderB1Chapters, deleteB1Chapter } from "../../../../api/b1Api";
import toast, { Toaster } from "react-hot-toast";

export default function B1FlashcardManage() {
  const [chapters, setChapters] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchChapters();
  }, []);

  const fetchChapters = async () => {
    setLoading(true);
    try {
      const res = await getB1Chapters("flashcard");
      setChapters(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to fetch flashcard chapters");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete chapter "${name}"?`)) return;
    try {
      const res = await deleteB1Chapter("flashcard", id);
      if (res.data?.success) {
        toast.success("Chapter deleted successfully");
        fetchChapters();
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete chapter");
    }
  };

  const handleMove = async (index, direction) => {
    const nextIdx = direction === "up" ? index - 1 : index + 1;
    if (nextIdx < 0 || nextIdx >= chapters.length) return;

    const listCopy = [...chapters];
    const temp = listCopy[index];
    listCopy[index] = listCopy[nextIdx];
    listCopy[nextIdx] = temp;

    setChapters(listCopy);

    const orderedIds = listCopy.map((c) => c.id);
    try {
      await reorderB1Chapters("flashcard", orderedIds);
      toast.success("Order updated");
    } catch (err) {
      console.error(err);
      toast.error("Failed to update order");
      fetchChapters();
    }
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-9xl mx-auto">
      <Toaster position="top-center" />
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-2xl md:text-3xl text-gray-800 font-bold">
            Manage B1 Flashcards
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Reorder or delete existing B1 flashcard sets.
          </p>
        </div>
        <button
          onClick={fetchChapters}
          className="text-xs text-blue-600 font-bold hover:underline cursor-pointer"
        >
          Refresh List
        </button>
      </div>

      <div className="bg-white shadow-sm border border-slate-100 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <span className="font-semibold text-slate-700">Chapters ({chapters.length})</span>
        </div>

        {loading ? (
          <div className="py-12 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-[#002856]" />
          </div>
        ) : chapters.length === 0 ? (
          <div className="py-12 text-center text-slate-500 font-medium">
            No flashcard sets uploaded yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-[11px] font-bold uppercase tracking-wider border-b border-slate-100">
                  <th className="px-6 py-3 w-16 text-center">Order</th>
                  <th className="px-6 py-3">Chapter Name</th>
                  <th className="px-6 py-3">Level Tag</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {chapters.map((ch, idx) => (
                  <tr key={ch.id} className="hover:bg-slate-50/40 transition">
                    <td className="px-6 py-4 font-semibold text-slate-600 text-center">{idx + 1}</td>
                    <td className="px-6 py-4 font-bold text-slate-800">{ch.chapter_name}</td>
                    <td className="px-6 py-4">
                      <span className="text-[10px] px-2 py-0.5 bg-slate-100 rounded text-slate-600 font-bold uppercase">
                        {ch.level_tag || "B1"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          onClick={() => handleMove(idx, "up")}
                          disabled={idx === 0}
                          className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 disabled:hover:text-slate-400 cursor-pointer"
                          title="Move Up"
                        >
                          <ArrowUp className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleMove(idx, "down")}
                          disabled={idx === chapters.length - 1}
                          className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 disabled:hover:text-slate-400 cursor-pointer"
                          title="Move Down"
                        >
                          <ArrowDown className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(ch.id, ch.chapter_name)}
                          className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors ml-2 cursor-pointer"
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
