import React, { useState, useEffect } from "react";
import { Trash2, Loader2 } from "lucide-react";
import { getB1ExamPapersAdmin, deleteB1ExamPaper } from "../../../../api/b1Api";
import toast, { Toaster } from "react-hot-toast";

export default function B1ExamsManage() {
  const [papers, setPapers] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchPapers();
  }, []);

  const fetchPapers = async () => {
    setLoading(true);
    try {
      const res = await getB1ExamPapersAdmin();
      setPapers(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to fetch exam papers");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id, title) => {
    if (!window.confirm(`Are you sure you want to delete exam paper "${title}" permanently?`)) return;
    try {
      const res = await deleteB1ExamPaper(id);
      if (res.data?.success) {
        toast.success("Exam paper deleted successfully");
        fetchPapers();
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete exam paper");
    }
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-9xl mx-auto">
      <Toaster position="top-center" />
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-2xl md:text-3xl text-gray-800 font-bold">
            Manage B1 Exam Papers
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            List and delete existing B1 practice exam papers.
          </p>
        </div>
        <button
          onClick={fetchPapers}
          className="text-xs text-blue-600 font-bold hover:underline cursor-pointer"
        >
          Refresh List
        </button>
      </div>

      <div className="bg-white shadow-sm border border-slate-100 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <span className="font-semibold text-slate-700">Exam Papers ({papers.length})</span>
        </div>

        {loading ? (
          <div className="py-12 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-[#002856]" />
          </div>
        ) : papers.length === 0 ? (
          <div className="py-12 text-center text-slate-500 font-medium">
            No exam papers uploaded yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-[11px] font-bold uppercase tracking-wider border-b border-slate-100">
                  <th className="px-6 py-3 w-16 text-center">No.</th>
                  <th className="px-6 py-3">Paper Title</th>
                  <th className="px-6 py-3">Exam Type</th>
                  <th className="px-6 py-3">Questions</th>
                  <th className="px-6 py-3">Difficulty</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {papers.map((paper, idx) => (
                  <tr key={paper.id || idx} className="hover:bg-slate-50/40 transition">
                    <td className="px-6 py-4 font-semibold text-slate-600 text-center">{idx + 1}</td>
                    <td className="px-6 py-4 font-bold text-slate-800">{paper.title}</td>
                    <td className="px-6 py-4">
                      <span className="text-[10px] px-2 py-0.5 bg-slate-100 rounded text-slate-600 font-bold uppercase">
                        {paper.exam_type || "Goethe"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {paper.question_count || 0} Questions
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-[10px] px-2 py-0.5 bg-amber-50 text-amber-800 rounded font-bold uppercase">
                        {paper.difficulty_tag || "Medium"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleDelete(paper.id, paper.title)}
                        className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
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
