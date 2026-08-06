import React, { useCallback, useEffect, useState } from "react";
import {
  Loader2,
  Pencil,
  Play,
  Plus,
  Save,
  Trash2,
  X,
  FileText,
  RefreshCw,
  CheckCircle2,
  Clock,
  AlertCircle,
  HelpCircle,
} from "lucide-react";
import {
  getVideoCoursesAdmin,
  createVideoCourse,
  updateVideoCourseAdmin,
  deleteVideoCourse,
  uploadVideoCourseThumbnail,
  getVideoCourseVideosAdmin,
  updateVideoCourseVideo,
  updateVideoCourseVideoThumbnail,
  deleteVideoCourseVideo,
  getVideoCourseTimestamps,
  addVideoCourseTimestamp,
  updateVideoCourseTimestamp,
  deleteVideoCourseTimestamp,
  getVideoCourseNotes,
  uploadVideoCourseNote,
  deleteVideoCourseNote,
} from "../../../api/videoCourseApi";

import toast, { Toaster } from "react-hot-toast";

const LEVELS = ["A1", "A2", "B1", "B2", "C1", "ALL"];
const inputClass =
  "w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200/60 rounded-xl text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:ring-4 focus:ring-[#002856]/5 focus:border-[#002856] transition-all";
const fileClass =
  "w-full text-xs text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-[#eef2f6] file:text-[#002856] hover:file:bg-[#dfe6ef] border border-slate-200/60 rounded-xl p-1.5 bg-slate-50 cursor-pointer transition-colors";

const emptyCourse = {
  name: "",
  description: "",
  difficulty: "Easy",
  proficiency_level: "A1",
  total_hours: 0,
  display_order: 0,
};

function StatusBadge({ status, progress }) {
  if (status === "completed") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#eaf7f0] text-[#1e7e34] border border-[#c3ebc6]">
        <CheckCircle2 className="w-3 h-3" />
        Ready
      </span>
    );
  }
  if (status === "processing") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#eef2f6] text-[#002856] border border-[#ccd9e8]">
        <Loader2 className="w-3 h-3 animate-spin" />
        Processing {progress || 0}%
      </span>
    );
  }
  if (status === "failed") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#fff1f2] text-[#e11d48] border border-[#fecdd3]">
        <AlertCircle className="w-3 h-3" />
        Failed
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#fef8e7] text-[#b25e00] border border-[#fbecc8]">
      <Clock className="w-3 h-3" />
      Pending
    </span>
  );
}

export default function VideoCourseManage() {
  const [tab, setTab] = useState("videos");
  const [videos, setVideos] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingVideo, setEditingVideo] = useState(null);
  const [courseForm, setCourseForm] = useState(emptyCourse);
  const [editingCourseId, setEditingCourseId] = useState(null);
  const [courseThumb, setCourseThumb] = useState(null);
  const [videoThumb, setVideoThumb] = useState(null);
  const [chapterVideo, setChapterVideo] = useState(null);
  const [chapters, setChapters] = useState([]);
  const [chapterForm, setChapterForm] = useState({
    label: "",
    time_seconds: 0,
    display_order: 0,
  });
  const [chaptersLoading, setChaptersLoading] = useState(false);
  const [chapterSaving, setChapterSaving] = useState(false);

  // Notes Modal state
  const [noteVideo, setNoteVideo] = useState(null);
  const [videoNotes, setVideoNotes] = useState([]);
  const [notesLoading, setNotesLoading] = useState(false);
  const [uploadingLang, setUploadingLang] = useState(null);

  const openNotesModal = async (video) => {
    setNoteVideo(video);
    setVideoNotes([]);
    setNotesLoading(true);
    try {
      const res = await getVideoCourseNotes(video.video_id);
      setVideoNotes(res.data?.data || []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load video notes");
    } finally {
      setNotesLoading(false);
    }
  };

  const closeNotesModal = () => {
    setNoteVideo(null);
    setVideoNotes([]);
    setUploadingLang(null);
  };

  const handleUploadVideoNote = async (langCode, file) => {
    if (!noteVideo || !file) return;
    if (file.type !== "application/pdf") {
      toast.error("Only PDF files are allowed");
      return;
    }
    setUploadingLang(langCode);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("language_code", langCode);
      const res = await uploadVideoCourseNote(noteVideo.video_id, formData);
      if (res.data?.success) {
        toast.success(`Note for ${langCode.toUpperCase()} uploaded!`);
        const updated = await getVideoCourseNotes(noteVideo.video_id);
        setVideoNotes(updated.data?.data || []);
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to upload note");
    } finally {
      setUploadingLang(null);
    }
  };

  const handleDeleteVideoNote = async (langCode) => {
    if (!noteVideo) return;
    if (!window.confirm(`Delete ${langCode.toUpperCase()} note for this video?`)) return;
    try {
      await deleteVideoCourseNote(noteVideo.video_id, langCode);
      toast.success(`Note for ${langCode.toUpperCase()} deleted`);
      setVideoNotes((prev) => prev.filter((n) => n.language_code !== langCode));
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete note");
    }
  };

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [videoRes, courseRes] = await Promise.all([
        getVideoCourseVideosAdmin(),
        getVideoCoursesAdmin(),
      ]);
      setVideos(videoRes.data?.data || []);
      setCourses(courseRes.data?.data || []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to fetch video courses");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // ─── Videos ────────────────────────────────────────────────────────────────

  const handleDeleteVideo = async (videoId, title) => {
    if (!window.confirm(`Delete video "${title}" permanently?`)) return;
    try {
      await deleteVideoCourseVideo(videoId);
      toast.success("Video deleted");
      fetchAll();
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete video");
    }
  };

  const handleSaveVideo = async (e) => {
    e.preventDefault();
    try {
      await updateVideoCourseVideo(editingVideo.video_id, {
        course_id: editingVideo.course_id || null,
        title: editingVideo.title,
        description: editingVideo.description,
        proficiency_level: editingVideo.proficiency_level,
        display_order: editingVideo.display_order,
      });

      if (videoThumb) {
        const formData = new FormData();
        formData.append("thumbnail", videoThumb);
        await updateVideoCourseVideoThumbnail(editingVideo.video_id, formData);
      }
      toast.success("Video updated");
      setEditingVideo(null);
      setVideoThumb(null);
      fetchAll();
    } catch (err) {
      console.error(err);
      toast.error("Failed to update video");
    }
  };

  const sortChapters = (items) =>
    [...items].sort(
      (a, b) =>
        Number(a.display_order || 0) - Number(b.display_order || 0) ||
        Number(a.time_seconds || 0) - Number(b.time_seconds || 0),
    );

  const openChapters = async (video) => {
    setChapterVideo(video);
    setChapters([]);
    setChaptersLoading(true);
    try {
      const res = await getVideoCourseTimestamps(video.video_id);
      setChapters(sortChapters(res.data?.data || []));
    } catch (err) {
      console.error(err);
      toast.error("Failed to load chapters");
    } finally {
      setChaptersLoading(false);
    }
  };

  const closeChapters = () => {
    setChapterVideo(null);
    setChapters([]);
    setChapterForm({ label: "", time_seconds: 0, display_order: 0 });
  };

  const handleAddChapter = async (e) => {
    e.preventDefault();
    if (!chapterVideo || !chapterForm.label.trim()) {
      toast.error("Chapter label is required");
      return;
    }
    setChapterSaving(true);
    try {
      const res = await addVideoCourseTimestamp(chapterVideo.video_id, {
        label: chapterForm.label.trim(),
        time_seconds: Number(chapterForm.time_seconds) || 0,
        display_order: Number(chapterForm.display_order) || 0,
      });
      setChapters((prev) => sortChapters([...prev, res.data?.data].filter(Boolean)));
      setChapterForm({
        label: "",
        time_seconds: 0,
        display_order: chapters.length + 1,
      });
      toast.success("Chapter added");
    } catch (err) {
      console.error(err);
      toast.error("Failed to add chapter");
    } finally {
      setChapterSaving(false);
    }
  };

  const handleUpdateChapter = async (chapter) => {
    try {
      const res = await updateVideoCourseTimestamp(chapterVideo.video_id, chapter.timestamp_id, {
        label: String(chapter.label || "").trim(),
        time_seconds: Number(chapter.time_seconds) || 0,
        display_order: Number(chapter.display_order) || 0,
      });
      setChapters((prev) =>
        sortChapters(
          prev.map((item) =>
            item.timestamp_id === chapter.timestamp_id ? res.data?.data || chapter : item,
          ),
        ),
      );
      toast.success("Chapter saved");
    } catch (err) {
      console.error(err);
      toast.error("Failed to save chapter");
    }
  };

  const handleDeleteChapter = async (chapter) => {
    if (!window.confirm(`Delete chapter "${chapter.label}"?`)) return;
    try {
      await deleteVideoCourseTimestamp(chapterVideo.video_id, chapter.timestamp_id);
      setChapters((prev) => prev.filter((item) => item.timestamp_id !== chapter.timestamp_id));
      toast.success("Chapter deleted");
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete chapter");
    }
  };

  // ─── Courses ───────────────────────────────────────────────────────────────

  const handleSaveCourse = async (e) => {
    e.preventDefault();
    if (!courseForm.name.trim()) {
      toast.error("Course name is required");
      return;
    }
    try {
      let courseId = editingCourseId;
      if (courseId) {
        await updateVideoCourseAdmin(courseId, courseForm);
      } else {
        const res = await createVideoCourse(courseForm);
        courseId = res.data?.data?.course_id;
      }

      if (courseThumb && courseId) {
        const formData = new FormData();
        formData.append("thumbnail", courseThumb);
        formData.append("course_id", courseId);
        await uploadVideoCourseThumbnail(formData);
      }

      toast.success(editingCourseId ? "Course updated" : "Course created");
      setCourseForm(emptyCourse);
      setEditingCourseId(null);
      setCourseThumb(null);
      const thumbInput = document.getElementById("course-form-thumb");
      if (thumbInput) thumbInput.value = "";
      fetchAll();
    } catch (err) {
      console.error(err);
      toast.error("Failed to save course");
    }
  };

  const handleDeleteCourse = async (courseId, name) => {
    if (!window.confirm(`Delete course "${name}"? Its videos become unassigned.`)) return;
    try {
      await deleteVideoCourse(courseId);
      toast.success("Course deleted");
      fetchAll();
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete course");
    }
  };

  const iconBtnClass =
    "p-1.5 rounded-lg text-slate-400 transition-colors cursor-pointer";

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      <Toaster position="top-center" />

      {/* Header card */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div className="space-y-1">
          <h1 className="text-xl font-bold text-slate-800">Manage Video Courses</h1>
          <p className="text-xs text-slate-400">
            Edit or delete course videos, and manage the courses themselves.
          </p>
        </div>
        <button
          onClick={fetchAll}
          disabled={loading}
          className="flex items-center justify-center gap-2 self-start md:self-auto px-4 py-2.5 border border-slate-200 hover:border-[#002856] text-slate-600 hover:text-[#002856] font-bold text-xs rounded-xl bg-white hover:bg-slate-50 transition-colors disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Control panel: tabs with counts */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
        <div className="flex flex-wrap gap-2">
          {[
            { key: "videos", label: "Videos", count: videos.length },
            { key: "courses", label: "Courses", count: courses.length },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer flex items-center gap-2 ${
                tab === t.key
                  ? "bg-[#002856] text-white border-[#002856] shadow-sm"
                  : "bg-slate-50 text-slate-500 border-slate-200/80 hover:bg-slate-100"
              }`}
            >
              <span>{t.label}</span>
              <span
                className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold ${
                  tab === t.key ? "bg-white/20 text-white" : "bg-slate-200 text-slate-600"
                }`}
              >
                {t.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400 bg-white border border-slate-100 rounded-2xl">
          <Loader2 className="w-10 h-10 animate-spin text-[#002856] mb-3" />
          <span className="text-xs">Loading video courses...</span>
        </div>
      ) : tab === "videos" ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50/50 text-xs font-bold text-slate-600 uppercase tracking-wider">
            Videos ({videos.length})
          </div>

          {editingVideo && (
            <form onSubmit={handleSaveVideo} className="p-5 border-b border-slate-100 space-y-3 bg-slate-50/40">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-slate-700 text-sm">
                  Editing: {editingVideo.title}
                </span>
                <button
                  type="button"
                  onClick={() => setEditingVideo(null)}
                  className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <input
                value={editingVideo.title || ""}
                onChange={(e) => setEditingVideo({ ...editingVideo, title: e.target.value })}
                placeholder="Title"
                className={inputClass}
              />
              <textarea
                rows={2}
                value={editingVideo.description || ""}
                onChange={(e) => setEditingVideo({ ...editingVideo, description: e.target.value })}
                placeholder="Description"
                className={inputClass}
              />
              <label className="block text-xs font-semibold text-slate-600">
                Replace thumbnail (optional)
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setVideoThumb(e.target.files?.[0] || null)}
                  className={`${fileClass} mt-1`}
                />
              </label>
              <div className="grid gap-3 md:grid-cols-3">
                <select
                  value={editingVideo.course_id || ""}
                  onChange={(e) => setEditingVideo({ ...editingVideo, course_id: e.target.value })}
                  className={inputClass}
                >
                  <option value="">Unassigned</option>
                  {courses.map((c) => (
                    <option key={c.course_id} value={c.course_id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <select
                  value={editingVideo.proficiency_level || "A1"}
                  onChange={(e) => setEditingVideo({ ...editingVideo, proficiency_level: e.target.value })}
                  className={inputClass}
                >
                  {LEVELS.map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  value={editingVideo.display_order ?? 0}
                  onChange={(e) => setEditingVideo({ ...editingVideo, display_order: e.target.value })}
                  placeholder="Display order"
                  className={inputClass}
                />
              </div>
              <button
                type="submit"
                className="bg-[#002856] text-white hover:bg-[#001e40] px-5 py-2 rounded-xl text-xs font-bold cursor-pointer transition-colors"
              >
                Save changes
              </button>
            </form>
          )}

          {videos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <HelpCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-slate-600 font-bold text-sm">No videos yet</h3>
              <p className="text-xs text-slate-400 mt-1">
                Upload videos from the Upload Course Video page
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-[11px] font-bold uppercase tracking-wider border-b border-slate-100">
                    <th className="px-6 py-3">Thumbnail</th>
                    <th className="px-6 py-3">Title</th>
                    <th className="px-6 py-3">Course</th>
                    <th className="px-6 py-3">Level</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {videos.map((vid) => (
                    <tr key={vid.video_id} className="hover:bg-slate-50/40 transition">
                      <td className="px-6 py-4 w-28">
                        <div className="w-20 h-12 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center">
                          {vid.thumbnail_url ? (
                            <img src={vid.thumbnail_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <Play className="w-4 h-4 text-slate-400" />
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-800">{vid.title}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {vid.course_name || "Unassigned"}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-[#eef2f6] text-[#002856] border border-[#ccd9e8] font-bold uppercase">
                          {vid.proficiency_level}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge
                          status={vid.processing_status}
                          progress={vid.processing_progress}
                        />
                      </td>

                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <button
                          onClick={() => openChapters(vid)}
                          className={`${iconBtnClass} hover:text-emerald-600 hover:bg-emerald-50`}
                          title="Manage chapters"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openNotesModal(vid)}
                          className={`${iconBtnClass} hover:text-amber-600 hover:bg-amber-50`}
                          title="Manage PDF notes"
                        >
                          <FileText className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => setEditingVideo(vid)}
                          className={`${iconBtnClass} hover:text-blue-600 hover:bg-blue-50`}
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteVideo(vid.video_id, vid.title)}
                          className={`${iconBtnClass} hover:text-red-600 hover:bg-red-50`}
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
      ) : (
        <div className="space-y-6">
          <form
            onSubmit={handleSaveCourse}
            className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4"
          >
            <h2 className="font-bold text-slate-800 text-sm">
              {editingCourseId ? "Edit course" : "Create course"}
            </h2>
            <input
              value={courseForm.name}
              onChange={(e) => setCourseForm({ ...courseForm, name: e.target.value })}
              placeholder="Course name"
              className={inputClass}
            />
            <textarea
              rows={2}
              value={courseForm.description || ""}
              onChange={(e) => setCourseForm({ ...courseForm, description: e.target.value })}
              placeholder="Description"
              className={inputClass}
            />
            <div className="grid gap-3 md:grid-cols-4">
              <select
                value={courseForm.difficulty}
                onChange={(e) => setCourseForm({ ...courseForm, difficulty: e.target.value })}
                className={inputClass}
              >
                {["Easy", "Medium", "Hard"].map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
              <select
                value={courseForm.proficiency_level}
                onChange={(e) => setCourseForm({ ...courseForm, proficiency_level: e.target.value })}
                className={inputClass}
              >
                {LEVELS.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
              <input
                type="number"
                step="0.1"
                value={courseForm.total_hours}
                onChange={(e) => setCourseForm({ ...courseForm, total_hours: e.target.value })}
                placeholder="Total hours"
                className={inputClass}
              />
              <input
                type="number"
                value={courseForm.display_order}
                onChange={(e) => setCourseForm({ ...courseForm, display_order: e.target.value })}
                placeholder="Display order"
                className={inputClass}
              />
            </div>
            <input
              id="course-form-thumb"
              type="file"
              accept="image/*"
              onChange={(e) => setCourseThumb(e.target.files?.[0] || null)}
              className={fileClass}
            />
            <div className="flex gap-2">
              <button
                type="submit"
                className="bg-[#002856] text-white hover:bg-[#001e40] px-5 py-2 rounded-xl text-xs font-bold cursor-pointer transition-colors"
              >
                {editingCourseId ? "Save course" : "Create course"}
              </button>
              {editingCourseId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingCourseId(null);
                    setCourseForm(emptyCourse);
                  }}
                  className="px-5 py-2 rounded-xl text-xs font-bold border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:border-[#002856] hover:text-[#002856] cursor-pointer transition-colors"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50/50 text-xs font-bold text-slate-600 uppercase tracking-wider">
              Courses ({courses.length})
            </div>
            {courses.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <HelpCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-slate-600 font-bold text-sm">No courses yet</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Create a course above to group your videos
                </p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-[11px] font-bold uppercase tracking-wider border-b border-slate-100">
                    <th className="px-6 py-3">Name</th>
                    <th className="px-6 py-3">Level</th>
                    <th className="px-6 py-3">Videos</th>
                    <th className="px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {courses.map((c) => (
                    <tr key={c.course_id} className="hover:bg-slate-50/40 transition">
                      <td className="px-6 py-4 font-bold text-slate-800">{c.name}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {c.proficiency_level}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">{c.video_count}</td>
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <button
                          onClick={() => {
                            setEditingCourseId(c.course_id);
                            setCourseForm({
                              name: c.name || "",
                              description: c.description || "",
                              difficulty: c.difficulty || "Easy",
                              proficiency_level: c.proficiency_level || "A1",
                              total_hours: c.total_hours || 0,
                              display_order: c.display_order || 0,
                            });
                          }}
                          className={`${iconBtnClass} hover:text-blue-600 hover:bg-blue-50`}
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteCourse(c.course_id, c.name)}
                          className={`${iconBtnClass} hover:text-red-600 hover:bg-red-50`}
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {chapterVideo && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-xl">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="font-bold text-slate-800 text-sm">Manage chapters</h2>
                <p className="text-xs text-slate-500 mt-1">{chapterVideo.title}</p>
              </div>
              <button
                type="button"
                onClick={closeChapters}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
                aria-label="Close chapters"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddChapter} className="p-5 bg-slate-50/60 border-b border-slate-100">
              <div className="grid gap-3 md:grid-cols-[1fr_130px_130px_auto] items-end">
                <label className="text-xs font-semibold text-slate-600">
                  Label
                  <input
                    value={chapterForm.label}
                    onChange={(e) => setChapterForm({ ...chapterForm, label: e.target.value })}
                    placeholder="Introduction"
                    className={`${inputClass} mt-1`}
                  />
                </label>
                <label className="text-xs font-semibold text-slate-600">
                  Time (seconds)
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={chapterForm.time_seconds}
                    onChange={(e) => setChapterForm({ ...chapterForm, time_seconds: e.target.value })}
                    className={`${inputClass} mt-1`}
                  />
                </label>
                <label className="text-xs font-semibold text-slate-600">
                  Order
                  <input
                    type="number"
                    min="0"
                    value={chapterForm.display_order}
                    onChange={(e) => setChapterForm({ ...chapterForm, display_order: e.target.value })}
                    className={`${inputClass} mt-1`}
                  />
                </label>
                <button
                  type="submit"
                  disabled={chapterSaving}
                  className="h-9 px-3 rounded-xl bg-[#002856] text-white text-xs font-bold disabled:opacity-50 cursor-pointer hover:bg-[#001e40] transition-colors"
                >
                  Add
                </button>
              </div>
            </form>

            <div className="p-5">
              {chaptersLoading ? (
                <div className="py-8 flex justify-center">
                  <Loader2 className="w-6 h-6 animate-spin text-[#002856]" />
                </div>
              ) : chapters.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-500">No chapters yet.</p>
              ) : (
                <div className="space-y-2">
                  {chapters.map((chapter) => (
                    <div key={chapter.timestamp_id} className="grid gap-2 md:grid-cols-[1fr_120px_90px_auto_auto] items-center">
                      <input
                        value={chapter.label || ""}
                        onChange={(e) =>
                          setChapters((prev) =>
                            prev.map((item) =>
                              item.timestamp_id === chapter.timestamp_id
                                ? { ...item, label: e.target.value }
                                : item,
                            ),
                          )
                        }
                        className={inputClass}
                        aria-label="Chapter label"
                      />
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        value={chapter.time_seconds ?? 0}
                        onChange={(e) =>
                          setChapters((prev) =>
                            prev.map((item) =>
                              item.timestamp_id === chapter.timestamp_id
                                ? { ...item, time_seconds: e.target.value }
                                : item,
                            ),
                          )
                        }
                        className={inputClass}
                        aria-label="Chapter time in seconds"
                      />
                      <input
                        type="number"
                        min="0"
                        value={chapter.display_order ?? 0}
                        onChange={(e) =>
                          setChapters((prev) =>
                            prev.map((item) =>
                              item.timestamp_id === chapter.timestamp_id
                                ? { ...item, display_order: e.target.value }
                                : item,
                            ),
                          )
                        }
                        className={inputClass}
                        aria-label="Chapter order"
                      />
                      <button
                        type="button"
                        onClick={() => handleUpdateChapter(chapter)}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer transition-colors"
                        title="Save chapter"
                      >
                        <Save className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteChapter(chapter)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg cursor-pointer transition-colors"
                        title="Delete chapter"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {noteVideo && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-xl max-w-lg w-full overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="font-bold text-slate-800 text-sm">
                  PDF Notes — {noteVideo.title}
                </h3>
                <p className="text-xs text-slate-500">
                  Upload or replace PDF study notes per language
                </p>
              </div>
              <button
                onClick={closeNotesModal}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {notesLoading ? (
                <div className="py-8 flex justify-center">
                  <Loader2 className="w-6 h-6 animate-spin text-[#002856]" />
                </div>
              ) : (
                [
                  { code: "en", label: "English (EN)" },
                  { code: "hi", label: "Hindi (HI)" },
                  { code: "kn", label: "Kannada (KN)" },
                ].map((lang) => {
                  const existingNote = videoNotes.find(
                    (n) => n.language_code === lang.code
                  );
                  const isUploading = uploadingLang === lang.code;

                  return (
                    <div
                      key={lang.code}
                      className="p-3 border border-slate-200/60 rounded-xl flex items-center justify-between gap-3 bg-slate-50/50"
                    >
                      <div className="flex-1 min-w-0">
                        <span className="font-semibold text-xs text-slate-800 block">
                          {lang.label}
                        </span>
                        {existingNote ? (
                          <span className="text-[11px] text-slate-500">
                            {existingNote.page_count || 0} pages •{" "}
                            {Math.round((existingNote.file_size_bytes || 0) / 1024)} KB
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">
                            No note uploaded yet
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <label className="px-3 py-1.5 bg-[#002856] text-white text-xs font-bold rounded-xl hover:bg-[#001e40] cursor-pointer flex items-center gap-1 transition-colors">
                          {isUploading ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <FileText className="w-3.5 h-3.5" />
                          )}
                          <span>{existingNote ? "Replace" : "Upload"}</span>
                          <input
                            type="file"
                            accept="application/pdf"
                            disabled={isUploading}
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleUploadVideoNote(lang.code, file);
                              e.target.value = "";
                            }}
                          />
                        </label>

                        {existingNote && (
                          <button
                            onClick={() => handleDeleteVideoNote(lang.code)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg cursor-pointer transition-colors"
                            title="Delete note"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
