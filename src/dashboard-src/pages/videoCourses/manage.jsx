import React, { useCallback, useEffect, useState } from "react";
import { Loader2, Pencil, Play, Plus, Save, Trash2, X } from "lucide-react";
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
} from "../../../api/videoCourseApi";
import toast, { Toaster } from "react-hot-toast";

const LEVELS = ["A1", "A2", "B1", "B2", "C1", "ALL"];
const inputClass =
  "w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-600";

const emptyCourse = {
  name: "",
  description: "",
  difficulty: "Easy",
  proficiency_level: "A1",
  total_hours: 0,
  display_order: 0,
};

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

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-9xl mx-auto">
      <Toaster position="top-center" />
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl md:text-3xl text-gray-800 font-bold">
            Manage Video Courses
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Edit or delete course videos, and manage the courses themselves.
          </p>
        </div>
        <button
          onClick={fetchAll}
          className="text-xs text-blue-600 font-bold hover:underline cursor-pointer"
        >
          Refresh
        </button>
      </div>

      <div className="mb-4 flex gap-2">
        {["videos", "courses"].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold capitalize cursor-pointer ${
              tab === t ? "bg-[#002856] text-white" : "bg-slate-100 text-slate-600"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-12 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#002856]" />
        </div>
      ) : tab === "videos" ? (
        <div className="bg-white shadow-sm border border-slate-100 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 font-semibold text-slate-700">
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
                  className="mt-1 w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-[#002856] border border-slate-200 rounded-lg p-1.5 bg-white"
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
                className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-semibold cursor-pointer"
              >
                Save changes
              </button>
            </form>
          )}

          {videos.length === 0 ? (
            <div className="py-12 text-center text-slate-500 font-medium">
              No videos uploaded yet.
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
                        <span className="text-[10px] px-2 py-0.5 bg-slate-100 rounded text-slate-600 font-bold uppercase">
                          {vid.proficiency_level}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {vid.processing_status === "completed" ? (
                          <span className="text-[10px] px-2 py-0.5 bg-green-50 text-green-700 border border-green-200 rounded font-bold uppercase">
                            Ready
                          </span>
                        ) : vid.processing_status === "processing" ? (
                          <span className="text-[10px] px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded font-bold uppercase">
                            Processing {vid.processing_progress || 0}%
                          </span>
                        ) : vid.processing_status === "failed" ? (
                          <span className="text-[10px] px-2 py-0.5 bg-red-50 text-red-700 border border-red-200 rounded font-bold uppercase">
                            Failed
                          </span>
                        ) : (
                          <span className="text-[10px] px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded font-bold uppercase">
                            Pending
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <button
                          onClick={() => openChapters(vid)}
                          className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg cursor-pointer"
                          title="Manage chapters"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setEditingVideo(vid)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteVideo(vid.video_id, vid.title)}
                          className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg cursor-pointer"
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
            className="bg-white shadow-sm border border-slate-100 rounded-xl p-6 space-y-4"
          >
            <h2 className="font-bold text-slate-800">
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
              className="w-full text-sm text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-[#002856] border border-slate-150 rounded-lg p-1.5 bg-slate-50/50"
            />
            <div className="flex gap-2">
              <button
                type="submit"
                className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-semibold cursor-pointer"
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
                  className="px-5 py-2 rounded-lg text-sm font-semibold bg-slate-100 text-slate-600 cursor-pointer"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>

          <div className="bg-white shadow-sm border border-slate-100 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 font-semibold text-slate-700">
              Courses ({courses.length})
            </div>
            {courses.length === 0 ? (
              <div className="py-12 text-center text-slate-500 font-medium">
                No courses yet.
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
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteCourse(c.course_id, c.name)}
                          className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg cursor-pointer"
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
                <h2 className="font-bold text-slate-800">Manage chapters</h2>
                <p className="text-xs text-slate-500 mt-1">{chapterVideo.title}</p>
              </div>
              <button
                type="button"
                onClick={closeChapters}
                className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
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
                  className="h-9 px-3 rounded-lg bg-blue-600 text-white text-xs font-semibold disabled:opacity-50 cursor-pointer"
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
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer"
                        title="Save chapter"
                      >
                        <Save className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteChapter(chapter)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg cursor-pointer"
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
    </div>
  );
}
