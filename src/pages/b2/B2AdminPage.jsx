import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  Upload,
  Trash2,
  ChevronLeft,
  Loader2,
  Power,
} from "lucide-react";
import {
  uploadB2Exercise,
  getB2ExercisesAdmin,
  toggleB2Exercise,
  deleteB2Exercise,
  uploadB2ExamPaper,
  getB2ExamPapersAdmin,
  deleteB2ExamPaper,
} from "../../api/b2Api";
import toast, { Toaster } from "react-hot-toast";

const MODULES = ["reading", "listening", "writing", "speaking"];
const TAGS = ["all", "telc", "goethe"];

export default function B2AdminPage() {
  const navigate = useNavigate();
  const { user, token } = useSelector((state) => state.auth);
  const canManageB2 = ["admin", "super_admin"].includes(user?.role);

  const [activeModule, setActiveModule] = useState("reading");
  const [tagFilter, setTagFilter] = useState("all");
  const [items, setItems] = useState([]);
  const [loadingList, setLoadingList] = useState(false);

  // Upload fields — the exercise JSON carries module/tag/title/content;
  // the ZIP supplies referenced images/audio.
  const [jsonFile, setJsonFile] = useState(null);
  const [zipFile, setZipFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (token && !user) return;
    if (!user) {
      navigate("/login");
      return;
    }
    if (!canManageB2) {
      navigate("/");
      return;
    }
    fetchItems();
  }, [user, token, canManageB2, activeModule, tagFilter, navigate]);

  if (token && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white w-screen">
        <Loader2 className="w-8 h-8 animate-spin text-[#002856]" />
      </div>
    );
  }

  const fetchItems = async () => {
    setLoadingList(true);
    try {
      let res;
      if (activeModule === "exam-papers") {
        res = await getB2ExamPapersAdmin();
      } else {
        res = await getB2ExercisesAdmin({
          module: activeModule,
          // "all" is the unfiltered view — the tag badge on each row already
          // shows its real tag.
          ...(tagFilter !== "all" ? { tag: tagFilter } : {}),
        });
      }
      setItems(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Error loading B2 content:", err);
      toast.error("Failed to load content list.");
    } finally {
      setLoadingList(false);
    }
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!jsonFile) {
      toast.error("JSON metadata file is required.");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", jsonFile);
      if (zipFile) {
        formData.append("imagesZip", zipFile);
      }

      const res =
        activeModule === "exam-papers"
          ? await uploadB2ExamPaper(formData)
          : await uploadB2Exercise(formData);

      if (res.data?.success) {
        toast.success(
          `Successfully uploaded ${res.data.itemsInserted ?? "content"}!`,
        );
        setJsonFile(null);
        setZipFile(null);
        document.getElementById("json-file-input").value = "";
        const zipInput = document.getElementById("zip-file-input");
        if (zipInput) zipInput.value = "";
        fetchItems();
      } else {
        toast.error("Upload failed.");
      }
    } catch (err) {
      console.error("Upload error:", err);
      toast.error(
        err.response?.data?.error || err.message || "Error uploading content.",
      );
    } finally {
      setUploading(false);
    }
  };

  const handleToggle = async (id) => {
    try {
      await toggleB2Exercise(id);
      toast.success("Exercise visibility toggled.");
      fetchItems();
    } catch (err) {
      console.error("Toggle error:", err);
      toast.error("Failed to toggle exercise.");
    }
  };

  const handleDelete = async (id) => {
    const itemType = activeModule === "exam-papers" ? "exam paper" : "exercise";
    if (
      !window.confirm(
        `Are you sure you want to delete this ${itemType} permanently?`,
      )
    ) {
      return;
    }

    try {
      const res =
        activeModule === "exam-papers"
          ? await deleteB2ExamPaper(id)
          : await deleteB2Exercise(id);
      if (res.data?.success) {
        toast.success(
          `${itemType.charAt(0).toUpperCase() + itemType.slice(1)} deleted successfully.`,
        );
        fetchItems();
      }
    } catch (err) {
      console.error("Delete error:", err);
      toast.error(`Failed to delete ${itemType}.`);
    }
  };

  const moduleLabel = (m) =>
    m === "exam-papers" ? "Exam Papers" : m.charAt(0).toUpperCase() + m.slice(1);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col w-screen pb-12">
      <Toaster position="top-center" />

      {/* Header bar */}
      <div className="px-6 py-4 flex items-center justify-between bg-white border-b border-slate-100">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-1.5 text-slate-600 font-semibold text-sm cursor-pointer"
        >
          <ChevronLeft className="w-5 h-5" />
          <span>Home</span>
        </button>
        <span className="font-extrabold text-[#002856] text-lg">
          B2 Content Console
        </span>
        <span className="w-16" />
      </div>

      <div className="max-w-4xl mx-auto w-full px-6 py-8 grid md:grid-cols-5 gap-8">
        {/* Left Column: Uploader */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
            <h2 className="text-lg font-black text-[#002856] mb-4 flex items-center gap-2">
              <Upload className="w-5 h-5 text-blue-500" />
              <span>Upload Content</span>
            </h2>

            <form onSubmit={handleUploadSubmit} className="space-y-4">
              {/* Module selection */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                  Module Category
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {MODULES.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setActiveModule(m)}
                      className={`py-2 px-3 rounded-xl font-bold text-[10px] border transition-all ${
                        activeModule === m
                          ? "bg-[#002856] text-white border-[#002856] shadow-sm"
                          : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      {moduleLabel(m)}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setActiveModule("exam-papers")}
                    className={`py-2 px-3 rounded-xl font-bold text-[10px] border transition-all ${
                      activeModule === "exam-papers"
                        ? "bg-[#002856] text-white border-[#002856] shadow-sm"
                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    Exams
                  </button>
                </div>
              </div>

              <p className="text-[10px] text-slate-400 font-semibold">
                {activeModule === "exam-papers"
                  ? "JSON must contain exam_type (telc/goethe), paper title and sections[]. Writing/speaking items accept hidden expected_answer."
                  : "JSON must contain module, tag (all|telc|goethe), title and content.blocks[]. Writing/speaking items accept hidden expected_answer."}
              </p>

              {/* JSON file */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                  JSON Config File
                </label>
                <input
                  id="json-file-input"
                  type="file"
                  accept="application/json"
                  onChange={(e) => setJsonFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-[#002856] hover:file:bg-blue-100 border border-slate-100 rounded-xl p-1 bg-slate-50/50"
                />
              </div>

              {/* Zip file */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                  {activeModule === "exam-papers"
                    ? "ZIP Media (Images & Audio - Optional)"
                    : "ZIP Media (Images & Audio - Optional)"}
                </label>
                <input
                  id="zip-file-input"
                  type="file"
                  accept=".zip"
                  onChange={(e) => setZipFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-[#002856] hover:file:bg-blue-100 border border-slate-100 rounded-xl p-1 bg-slate-50/50"
                />
              </div>

              <button
                type="submit"
                disabled={uploading}
                className="w-full py-2.5 bg-[#002856] text-white rounded-xl font-bold text-sm hover:bg-sky-900 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Uploading...</span>
                  </>
                ) : (
                  <span>
                    Upload {activeModule === "exam-papers" ? "Exam Paper" : "Exercise"}
                  </span>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Content list */}
        <div className="md:col-span-3">
          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-black text-[#002856]">
                {moduleLabel(activeModule)} Content
              </h2>
              {activeModule !== "exam-papers" && (
                <div className="flex gap-1.5">
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
              )}
            </div>

            {loadingList ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-[#002856]" />
              </div>
            ) : items.length === 0 ? (
              <p className="text-center text-slate-400 text-xs font-semibold py-12">
                No content yet. Upload a JSON to get started.
              </p>
            ) : (
              <div className="space-y-2">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50/50"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-900 truncate">
                        {item.title}
                      </p>
                      <p className="text-[10px] text-slate-500 font-semibold">
                        {activeModule === "exam-papers"
                          ? `${String(item.exam_type || "").toUpperCase()} · ${item.question_count || 0} questions`
                          : `${String(item.tag || "").toUpperCase()} · ${item.difficulty_tag || "Medium"}`}
                        {item.is_active === false && (
                          <span className="ml-2 text-red-400">· hidden</span>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0 ml-3">
                      {activeModule !== "exam-papers" && (
                        <button
                          onClick={() => handleToggle(item.id)}
                          title={item.is_active ? "Hide exercise" : "Show exercise"}
                          className={`p-1.5 rounded-lg transition-all ${
                            item.is_active
                              ? "text-green-600 hover:bg-green-50"
                              : "text-slate-300 hover:bg-slate-100"
                          }`}
                        >
                          <Power className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(item.id)}
                        title="Delete"
                        className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
