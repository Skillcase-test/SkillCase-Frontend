import React, { useState, useEffect } from "react";
import api from "../../api/axios";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  GripVertical,
  Trash2,
  CheckCircle,
  XCircle,
  Pencil,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

// ---- Upload Diagnostics sub-component (shared between create + update) ----
function UploadDiagnostics({ summary }) {
  if (!summary) return null;
  return (
    <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
      <h3 className="text-blue-900 font-semibold text-sm mb-3">Upload Diagnostics</h3>
      <div className="grid grid-cols-2 gap-3 text-sm text-blue-800">
        <div className="bg-white/60 p-2.5 rounded-md">
          <span className="block text-blue-500 font-medium mb-0.5 text-xs">Screens</span>
          <span className="text-base font-bold">{summary.screensProcessed ?? 0}</span>
        </div>
        <div className="bg-white/60 p-2.5 rounded-md">
          <span className="block text-blue-500 font-medium mb-0.5 text-xs">ZIP Images</span>
          <span className="text-base font-bold">{summary.zipImagesProcessed ?? 0}</span>
        </div>
        <div className="bg-white/60 p-2.5 rounded-md">
          <span className="block text-green-600 font-medium mb-0.5 text-xs">Matched</span>
          <span className="text-base font-bold text-green-700">{summary.imagesResolved ?? 0}</span>
        </div>
        <div className="bg-white/60 p-2.5 rounded-md border border-red-100">
          <span className="block text-red-500 font-medium mb-0.5 text-xs">Missing</span>
          <span className="text-base font-bold text-red-600">
            {(summary.imagesMissing || []).length}
          </span>
        </div>
      </div>
      {(summary.imagesMissing || []).length > 0 && (
        <div className="mt-3 bg-white/60 p-2.5 rounded-md text-xs">
          <span className="font-semibold text-red-600 block mb-1">Missing image files:</span>
          <ul className="list-disc pl-4 text-red-700 space-y-0.5">
            {summary.imagesMissing.map((img, idx) => (
              <li key={idx} className="break-all">{img}</li>
            ))}
          </ul>
        </div>
      )}
      {(summary.unreferencedZipImages || []).length > 0 && (
        <div className="mt-3 bg-white/60 p-2.5 rounded-md text-xs">
          <span className="font-semibold text-amber-600 block mb-1">
            Extra images in ZIP (not referenced):
          </span>
          <div className="text-amber-700 flex flex-wrap gap-1.5">
            {summary.unreferencedZipImages.slice(0, 10).map((img, idx) => (
              <span key={idx} className="bg-amber-100/50 px-2 py-0.5 rounded break-all">
                {img}
              </span>
            ))}
            {summary.unreferencedZipImages.length > 10 && (
              <span className="italic">
                ...and {summary.unreferencedZipImages.length - 10} more
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ---- Inline Update Panel ----
function UpdatePanel({ lesson, onDone }) {
  const [jsonFile, setJsonFile] = useState(null);
  const [imagesZip, setImagesZip] = useState(null);
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState(null);
  const [summary, setSummary] = useState(null);

  const jsonInputId = `update-json-${lesson.lesson_id}`;
  const zipInputId = `update-zip-${lesson.lesson_id}`;

  const showStatus = (msg, type = "success") => {
    setStatusMsg({ msg, type });
    setTimeout(() => setStatusMsg(null), 5000);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!jsonFile) {
      showStatus("Please select a JSON file", "error");
      return;
    }

    const formData = new FormData();
    formData.append("file", jsonFile);
    if (imagesZip) formData.append("imagesZip", imagesZip);

    setLoading(true);
    setSummary(null);
    try {
      const res = await api.patch(
        `/admin/dynamic-lesson/lessons/${lesson.lesson_id}/update`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } },
      );
      showStatus("Lesson updated successfully");
      setSummary(res.data.uploadSummary || null);
      api.clearGetCache?.();
      setJsonFile(null);
      setImagesZip(null);
      document.getElementById(jsonInputId).value = "";
      const zipEl = document.getElementById(zipInputId);
      if (zipEl) zipEl.value = "";
      onDone();
    } catch (err) {
      showStatus(err.response?.data?.error || "Update failed", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-2 bg-slate-50 border border-slate-200 rounded-lg p-4">
      <p className="text-xs text-slate-500 mb-3">
        User progress is preserved. Existing images are auto-reused by filename — only upload a ZIP
        if you need to replace specific images.
      </p>

      {statusMsg && (
        <div
          className={`mb-3 px-3 py-2 rounded-md text-xs font-medium ${
            statusMsg.type === "error"
              ? "bg-red-50 text-red-700 border border-red-200"
              : "bg-green-50 text-green-700 border border-green-200"
          }`}
        >
          {statusMsg.msg}
        </div>
      )}

      <form onSubmit={handleUpdate} className="space-y-3">
        <div>
          <label htmlFor={jsonInputId} className="block text-xs font-medium mb-1 text-slate-700">
            Updated JSON File <span className="text-red-500">*</span>
          </label>
          <input
            id={jsonInputId}
            type="file"
            accept=".json"
            onChange={(e) => setJsonFile(e.target.files[0])}
            className="w-full p-1.5 border border-slate-200 rounded-md text-xs"
          />
        </div>

        <div>
          <label htmlFor={zipInputId} className="block text-xs font-medium mb-1 text-slate-700">
            Images ZIP{" "}
            <span className="text-slate-400 font-normal">(optional — only changed images)</span>
          </label>
          <input
            id={zipInputId}
            type="file"
            accept=".zip"
            onChange={(e) => setImagesZip(e.target.files[0])}
            className="w-full p-1.5 border border-slate-200 rounded-md text-xs"
          />
        </div>

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={loading || !jsonFile}
            className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-xs transition-colors"
          >
            {loading ? "Updating..." : "Apply Update"}
          </button>
        </div>
      </form>

      <UploadDiagnostics summary={summary} />
    </div>
  );
}

// ---- Sortable lesson row ----
function SortableLessonRow({ lesson, onDelete, expandedId, setExpandedId, onRefresh }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: lesson.lesson_id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : "auto",
  };

  const isOpen = expandedId === lesson.lesson_id;

  return (
    <div ref={setNodeRef} style={style}>
      <div className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg bg-white shadow-sm">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab text-slate-400 hover:text-slate-600 flex-shrink-0"
          title="Drag to reorder"
        >
          <GripVertical className="w-5 h-5" />
        </button>

        {lesson.chapter_image ? (
          <img
            src={lesson.chapter_image}
            alt={lesson.title}
            className="w-12 h-12 rounded-md object-cover flex-shrink-0"
          />
        ) : (
          <div className="w-12 h-12 rounded-md bg-slate-100 flex items-center justify-center flex-shrink-0">
            <span className="text-slate-400 text-xs">No img</span>
          </div>
        )}

        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-800 truncate">{lesson.title}</p>
          <p className="text-xs text-slate-500">
            #{lesson.topic_order} &middot; Updated{" "}
            {new Date(lesson.updated_at).toLocaleDateString()}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {lesson.has_content ? (
            <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
              <CheckCircle className="w-3.5 h-3.5" /> Live
            </span>
          ) : (
            <span className="flex items-center gap-1 text-xs text-slate-400 font-medium">
              <XCircle className="w-3.5 h-3.5" /> Empty
            </span>
          )}

          {/* Update content toggle */}
          <button
            onClick={() => setExpandedId(isOpen ? null : lesson.lesson_id)}
            className="p-1.5 rounded-md text-blue-500 hover:bg-blue-50 hover:text-blue-700 transition-colors"
            title="Update content"
          >
            {isOpen ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <Pencil className="w-4 h-4" />
            )}
          </button>

          <button
            onClick={() => onDelete(lesson.lesson_id, lesson.title)}
            className="p-1.5 rounded-md text-red-500 hover:bg-red-50 hover:text-red-700 transition-colors"
            title="Delete lesson"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Inline update panel */}
      {isOpen && (
        <UpdatePanel
          lesson={lesson}
          onDone={() => {
            setExpandedId(null);
            onRefresh();
          }}
        />
      )}
    </div>
  );
}

// ---- Main admin page ----
const DynamicLessonAdmin = () => {
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [reorderPending, setReorderPending] = useState(false);
  const [jsonFile, setJsonFile] = useState(null);
  const [imagesZip, setImagesZip] = useState(null);
  const [statusMsg, setStatusMsg] = useState(null);
  const [uploadSummary, setUploadSummary] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  const sensors = useSensors(useSensor(PointerSensor));

  useEffect(() => {
    fetchLessons();
  }, []);

  const fetchLessons = async () => {
    setLoading(true);
    try {
      const res = await api.get("/admin/dynamic-lesson/lessons");
      setLessons(res.data);
    } catch (err) {
      console.error("Failed to fetch lessons", err);
      showStatus("Failed to load lessons", "error");
    } finally {
      setLoading(false);
    }
  };

  const showStatus = (msg, type = "success") => {
    setStatusMsg({ msg, type });
    setTimeout(() => setStatusMsg(null), 4000);
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!jsonFile) {
      showStatus("Please select a JSON file", "error");
      return;
    }

    const formData = new FormData();
    formData.append("file", jsonFile);
    if (imagesZip) formData.append("imagesZip", imagesZip);

    setUploadLoading(true);
    try {
      const res = await api.post("/admin/dynamic-lesson/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      showStatus("Lesson uploaded successfully");
      setUploadSummary(res.data.uploadSummary || null);
      api.clearGetCache?.();
      setJsonFile(null);
      setImagesZip(null);
      document.getElementById("jsonInput").value = "";
      const zipInput = document.getElementById("zipInput");
      if (zipInput) zipInput.value = "";
      await fetchLessons();
    } catch (err) {
      showStatus(err.response?.data?.error || "Upload failed", "error");
    } finally {
      setUploadLoading(false);
    }
  };

  const handleDelete = async (lessonId, title) => {
    if (
      !globalThis.confirm(
        `Permanently delete "${title}"? This will also remove all user progress for this lesson.`,
      )
    )
      return;

    try {
      await api.delete(`/admin/dynamic-lesson/lessons/${lessonId}`);
      api.clearGetCache?.();
      showStatus("Lesson deleted");
      setLessons((prev) => prev.filter((l) => l.lesson_id !== lessonId));
    } catch (err) {
      showStatus(err.response?.data?.error || "Delete failed", "error");
    }
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = lessons.findIndex((l) => l.lesson_id === active.id);
    const newIndex = lessons.findIndex((l) => l.lesson_id === over.id);
    const reordered = arrayMove(lessons, oldIndex, newIndex);
    setLessons(reordered);

    setReorderPending(true);
    try {
      await api.patch("/admin/dynamic-lesson/lessons/reorder", {
        orderedIds: reordered.map((l) => l.lesson_id),
      });
      api.clearGetCache?.();
      showStatus("Order saved");
    } catch (err) {
      showStatus("Failed to save order", "error");
      await fetchLessons();
    } finally {
      setReorderPending(false);
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Dynamic Lesson Admin</h1>
        {reorderPending && (
          <span className="text-sm text-blue-600 font-medium animate-pulse">
            Saving order...
          </span>
        )}
      </div>

      {statusMsg && (
        <div
          className={`mb-6 px-4 py-3 rounded-lg text-sm font-medium ${
            statusMsg.type === "error"
              ? "bg-red-50 text-red-700 border border-red-200"
              : "bg-green-50 text-green-700 border border-green-200"
          }`}
        >
          {statusMsg.msg}
        </div>
      )}

      {uploadSummary && <UploadDiagnostics summary={uploadSummary} />}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-6">
        {/* Upload Form — create new lesson */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h2 className="text-xl font-semibold mb-1 text-slate-800">Upload New Lesson</h2>
          <p className="text-sm text-slate-500 mb-5">
            Title and chapter image are read from the JSON file automatically.
          </p>

          <form onSubmit={handleUpload} className="space-y-4">
            <div>
              <label
                htmlFor="jsonInput"
                className="block text-sm font-medium mb-1 text-slate-700"
              >
                JSON Configuration File <span className="text-red-500">*</span>
              </label>
              <input
                id="jsonInput"
                type="file"
                accept=".json"
                onChange={(e) => setJsonFile(e.target.files[0])}
                className="w-full p-2 border border-slate-200 rounded-md text-sm"
              />
              <p className="text-xs text-slate-400 mt-1">
                Must contain{" "}
                <code className="bg-slate-100 px-1 rounded">chapterTitle</code>,{" "}
                <code className="bg-slate-100 px-1 rounded">chapterImage</code> and{" "}
                <code className="bg-slate-100 px-1 rounded">screens</code>.
              </p>
            </div>

            <div>
              <label
                htmlFor="zipInput"
                className="block text-sm font-medium mb-1 text-slate-700"
              >
                Images ZIP{" "}
                <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <input
                id="zipInput"
                type="file"
                accept=".zip"
                onChange={(e) => setImagesZip(e.target.files[0])}
                className="w-full p-2 border border-slate-200 rounded-md text-sm"
              />
              <p className="text-xs text-slate-400 mt-1">
                ZIP containing all images referenced by filename in the JSON.
              </p>
            </div>

            <button
              type="submit"
              disabled={uploadLoading || !jsonFile}
              className="w-full bg-blue-600 text-white py-2.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm transition-colors"
            >
              {uploadLoading ? "Uploading..." : "Upload Lesson"}
            </button>
          </form>
        </div>

        {/* Lesson list with drag-to-reorder + inline update */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h2 className="text-xl font-semibold mb-1 text-slate-800">Lessons</h2>
          <p className="text-sm text-slate-500 mb-5">
            Drag rows to reorder. Click the{" "}
            <Pencil className="w-3.5 h-3.5 inline-block" /> icon to update content.
          </p>

          {loading ? (
            <p className="text-slate-400 text-sm">Loading...</p>
          ) : lessons.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <p className="font-medium">No lessons yet</p>
              <p className="text-sm mt-1">Upload a JSON file to get started.</p>
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={lessons.map((l) => l.lesson_id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {lessons.map((lesson) => (
                    <SortableLessonRow
                      key={lesson.lesson_id}
                      lesson={lesson}
                      onDelete={handleDelete}
                      expandedId={expandedId}
                      setExpandedId={setExpandedId}
                      onRefresh={fetchLessons}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>
      </div>
    </div>
  );
};

export default DynamicLessonAdmin;
