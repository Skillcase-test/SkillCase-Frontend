import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import api from "../../api/axios";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  GripVertical,
  Trash2,
  CheckCircle2,
  XCircle,
  Pencil,
  X,
  ChevronUp,
  ChevronDown,
  ChevronsUp,
  ChevronsDown,
  Loader2,
  RefreshCw,
  HelpCircle,
  Upload,
  FileText,
  Search,
  AlertTriangle,
  Sparkles,
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";

// ---- Helpers ----
const formatBytes = (bytes) => {
  if (!bytes) return "0 KB";
  const kb = bytes / 1024;
  if (kb < 1024) return `${Math.round(kb)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
};

// Lightweight client-side validation before the round-trip to the server.
const validateLessonJson = (file) =>
  new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (!data || typeof data !== "object" || Array.isArray(data)) {
          resolve("JSON must contain a lesson object");
          return;
        }
        if (!data.chapterTitle) {
          resolve('JSON must contain a "chapterTitle" field');
          return;
        }
        if (!Array.isArray(data.screens)) {
          resolve('JSON must contain a "screens" array');
          return;
        }
        resolve(null);
      } catch {
        resolve("Selected file is not valid JSON");
      }
    };
    reader.onerror = () => resolve("Could not read the selected file");
    reader.readAsText(file);
  });

// ---- Upload Diagnostics sub-component (shared between create + update) ----
function UploadDiagnostics({ summary, onClose }) {
  if (!summary) return null;
  const missing = summary.imagesMissing || [];
  const unreferenced = summary.unreferencedZipImages || [];

  const stat = (label, value, colorClass) => (
    <div className="bg-white rounded-lg p-2.5 border border-slate-100">
      <span
        className={`block text-[10px] font-semibold uppercase tracking-wider mb-0.5 ${colorClass}`}
      >
        {label}
      </span>
      <span className="text-base font-bold text-slate-800">{value}</span>
    </div>
  );

  return (
    <div className="mt-4 rounded-xl border border-[#ccd9e8] bg-[#eef2f6]/60 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="flex items-center gap-1.5 text-[10px] font-bold text-[#002856] uppercase tracking-wider">
          <Sparkles className="w-3.5 h-3.5" />
          Upload Diagnostics
        </h3>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 cursor-pointer"
            title="Dismiss"
            aria-label="Dismiss diagnostics"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        {stat("Screens", summary.screensProcessed ?? 0, "text-slate-500")}
        {stat("ZIP Images", summary.zipImagesProcessed ?? 0, "text-slate-500")}
        {stat("Matched", summary.imagesResolved ?? 0, "text-[#1e7e34]")}
        {stat("Missing", missing.length, "text-[#e11d48]")}
      </div>

      {missing.length > 0 && (
        <div className="mt-3 bg-white rounded-lg p-3 border border-[#fecdd3] text-xs">
          <span className="font-bold text-[#e11d48] block mb-1">Missing image files:</span>
          <ul className="list-disc pl-4 text-[#e11d48]/90 space-y-0.5">
            {missing.map((img, idx) => (
              <li key={idx} className="break-all">
                {img}
              </li>
            ))}
          </ul>
        </div>
      )}

      {unreferenced.length > 0 && (
        <div className="mt-3 bg-white rounded-lg p-3 border border-[#fbecc8] text-xs">
          <span className="font-bold text-[#b25e00] block mb-1">
            Extra images in ZIP (not referenced):
          </span>
          <div className="text-[#b25e00] flex flex-wrap gap-1.5">
            {unreferenced.slice(0, 10).map((img, idx) => (
              <span key={idx} className="bg-[#fef8e7] px-2 py-0.5 rounded break-all">
                {img}
              </span>
            ))}
            {unreferenced.length > 10 && (
              <span className="italic">...and {unreferenced.length - 10} more</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ---- Reusable drag-and-drop file field ----
function FileDropzone({ id, label, required = false, accept, hint, file, onSelect, error }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  const pickFiles = (files) => {
    const f = files?.[0];
    if (f) onSelect(f);
  };

  return (
    <div>
      <label
        htmlFor={id}
        className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider"
      >
        {label}
        {required && <span className="text-[#e11d48]"> *</span>}
      </label>

      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          pickFiles(e.dataTransfer.files);
        }}
        className={`cursor-pointer rounded-xl border-2 border-dashed transition-all p-4 flex flex-col items-center justify-center text-center gap-1 ${
          dragging
            ? "border-[#002856] bg-[#eef2f6]"
            : "border-slate-200 bg-slate-50 hover:border-[#002856]/40"
        }`}
      >
        {file ? (
          <div className="flex w-full items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <FileText className="w-4 h-4 text-[#002856] flex-shrink-0" />
            <span className="text-xs font-semibold text-slate-700 truncate flex-1 text-left">
              {file.name}
            </span>
            <span className="text-[10px] text-slate-400 flex-shrink-0">
              {formatBytes(file.size)}
            </span>
            <button
              type="button"
              onClick={() => onSelect(null)}
              className="p-1 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 cursor-pointer transition-colors"
              title="Remove file"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <>
            <Upload className="w-5 h-5 text-slate-400" />
            <span className="text-xs font-semibold text-slate-500">
              Drop file here or{" "}
              <span className="text-[#002856] underline underline-offset-2">browse</span>
            </span>
            {hint && <span className="text-[10px] text-slate-400">{hint}</span>}
          </>
        )}
        <input
          ref={inputRef}
          id={id}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => {
            pickFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {error && (
        <p className="mt-1.5 flex items-center gap-1 text-[11px] font-semibold text-[#e11d48]">
          <AlertTriangle className="w-3 h-3 flex-shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}

// ---- Inline Update Panel ----
function UpdatePanel({ lesson, onDone }) {
  const [jsonFile, setJsonFile] = useState(null);
  const [imagesZip, setImagesZip] = useState(null);
  const [jsonError, setJsonError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState(null);

  const handleJsonSelect = (file) => {
    setJsonFile(file);
    if (!file) {
      setJsonError(null);
      return;
    }
    validateLessonJson(file).then((err) => setJsonError(err));
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!jsonFile) {
      toast.error("Please select a JSON file");
      return;
    }
    if (jsonError) {
      toast.error(jsonError);
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
      toast.success("Lesson updated successfully");
      setSummary(res.data.uploadSummary || null);
      api.clearGetCache?.();
      setJsonFile(null);
      setImagesZip(null);
      onDone();
    } catch (err) {
      toast.error(err.response?.data?.error || "Update failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-2 bg-white border border-slate-100 rounded-xl p-4">
      <p className="text-xs text-slate-500 mb-3 flex items-start gap-1.5">
        <AlertTriangle className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 mt-0.5" />
        User progress is preserved. Existing images are auto-reused by filename — only upload a ZIP
        if you need to replace specific images.
      </p>

      <form onSubmit={handleUpdate} className="space-y-3">
        <FileDropzone
          id={`update-json-${lesson.lesson_id}`}
          label="Updated JSON File"
          required
          accept=".json,application/json"
          file={jsonFile}
          onSelect={handleJsonSelect}
          error={jsonError}
          hint="New chapter content in JSON format"
        />
        <FileDropzone
          id={`update-zip-${lesson.lesson_id}`}
          label="Images ZIP"
          accept=".zip,application/zip"
          file={imagesZip}
          onSelect={setImagesZip}
          hint="Optional — only changed images"
        />
        <button
          type="submit"
          disabled={loading || !jsonFile || !!jsonError}
          className="w-full bg-[#002856] text-white py-2.5 rounded-xl hover:bg-[#001e40] disabled:opacity-50 disabled:cursor-not-allowed font-bold text-xs transition-colors cursor-pointer"
        >
          {loading ? "Updating..." : "Apply Update"}
        </button>
      </form>

      <UploadDiagnostics summary={summary} />
    </div>
  );
}

// ---- Compact index row (dense, for scanning long lists) ----
function LessonIndexRow({ lesson, position, selected, onSelect, dragDisabled }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: lesson.lesson_id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : "auto",
  };

  return (
    <div ref={setNodeRef} style={style}>
      <div
        id={`lesson-index-${lesson.lesson_id}`}
        onClick={() => onSelect(lesson.lesson_id)}
        className={`group flex items-center gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-colors ${
          selected
            ? "border-[#002856]/50 bg-[#eef2f6]"
            : "border-slate-100 bg-white hover:bg-slate-50 hover:border-slate-200"
        }`}
      >
        <button
          {...(dragDisabled ? {} : attributes)}
          {...(dragDisabled ? {} : listeners)}
          disabled={dragDisabled}
          className={`flex-shrink-0 rounded p-0.5 transition-opacity ${
            dragDisabled
              ? "text-slate-200 cursor-not-allowed"
              : "opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600"
          }`}
          title={dragDisabled ? "Clear search to reorder" : "Drag to reorder"}
          aria-label="Drag to reorder"
        >
          <GripVertical className="w-3.5 h-3.5" />
        </button>

        {lesson.chapter_image ? (
          <img
            src={lesson.chapter_image}
            alt=""
            className="w-9 h-9 rounded-lg object-cover flex-shrink-0 border border-slate-100"
          />
        ) : (
          <div className="w-9 h-9 rounded-lg bg-slate-100 border border-slate-100 flex items-center justify-center flex-shrink-0">
            <FileText className="w-3.5 h-3.5 text-slate-400" />
          </div>
        )}

        <span className="text-[10px] font-bold text-slate-400 w-6 flex-shrink-0 text-center">
          {position}
        </span>

        <span className="flex-1 min-w-0 text-xs font-semibold text-slate-700 truncate">
          {lesson.title}
        </span>

        <span
          className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${
            lesson.has_content ? "bg-[#1e7e34]" : "bg-slate-300"
          }`}
          title={lesson.has_content ? "Live" : "Empty"}
        />
      </div>
    </div>
  );
}

// ---- Detail pane for the selected lesson ----
function LessonDetail({
  lesson,
  position,
  total,
  movePending,
  orderDraft,
  onOrderDraftChange,
  onApplyOrder,
  onMoveBy,
  onSendTop,
  onSendBottom,
  updateOpen,
  onToggleUpdate,
  onRefresh,
  deletingId,
  onDelete,
}) {
  const isDeleting = deletingId === lesson.lesson_id;

  const moveBtnClass =
    "p-1.5 rounded-lg border border-slate-200 bg-white text-slate-500 hover:text-[#002856] hover:border-[#002856] hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors";

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start gap-3">
        {lesson.chapter_image ? (
          <img
            src={lesson.chapter_image}
            alt={lesson.title}
            className="w-16 h-16 rounded-xl object-cover flex-shrink-0 border border-slate-200"
          />
        ) : (
          <div className="w-16 h-16 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center flex-shrink-0">
            <FileText className="w-5 h-5 text-slate-400" />
          </div>
        )}
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-slate-800 leading-snug">{lesson.title}</h3>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            {lesson.has_content ? (
              <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#eaf7f0] text-[#1e7e34] border border-[#c3ebc6]">
                <CheckCircle2 className="w-3 h-3" />
                Live
              </span>
            ) : (
              <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200">
                <XCircle className="w-3 h-3" />
                Empty
              </span>
            )}
            <span className="text-xs text-slate-400">
              Updated {new Date(lesson.updated_at).toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>

      {/* Precision reorder controls */}
      <div className="rounded-xl border border-slate-100 bg-white p-3.5 space-y-3">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Position
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onMoveBy(lesson.lesson_id, -1)}
            disabled={movePending || position <= 1}
            className={moveBtnClass}
            title="Move up"
          >
            <ChevronUp className="w-4 h-4" />
          </button>
          <button
            onClick={() => onMoveBy(lesson.lesson_id, 1)}
            disabled={movePending || position >= total}
            className={moveBtnClass}
            title="Move down"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
          <div className="flex-1" />
          <button
            onClick={() => onSendTop(lesson.lesson_id)}
            disabled={movePending || position <= 1}
            className={moveBtnClass}
            title="Send to top"
          >
            <ChevronsUp className="w-4 h-4" />
          </button>
          <button
            onClick={() => onSendBottom(lesson.lesson_id)}
            disabled={movePending || position >= total}
            className={moveBtnClass}
            title="Send to bottom"
          >
            <ChevronsDown className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-2 pt-2.5 border-t border-slate-100">
          <span className="text-xs text-slate-500 flex-1">Move to position</span>
          <input
            type="number"
            min={1}
            max={total}
            value={orderDraft}
            onChange={(e) => onOrderDraftChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onApplyOrder();
              if (e.key === "Escape") onOrderDraftChange(String(position));
            }}
            className="w-20 px-2.5 py-1.5 bg-slate-50 border border-slate-200/60 rounded-lg text-xs text-slate-700 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#002856]/20 focus:border-[#002856] transition-all"
            aria-label="Move to position"
          />
          <button
            onClick={onApplyOrder}
            disabled={movePending}
            className="px-3 py-1.5 rounded-lg bg-[#002856] text-white text-[10px] font-bold hover:bg-[#001e40] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
          >
            Apply
          </button>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={onToggleUpdate}
          className={`px-3 py-2 rounded-lg border text-[10px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
            updateOpen
              ? "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
              : "border-[#ccd9e8] bg-white text-[#002856] hover:bg-[#eef2f6]"
          }`}
          title={updateOpen ? "Cancel update" : "Update content"}
        >
          {updateOpen ? (
            <>
              <X className="w-3.5 h-3.5" />
              Cancel
            </>
          ) : (
            <>
              <Pencil className="w-3.5 h-3.5" />
              Update
            </>
          )}
        </button>

        <button
          onClick={() => onDelete(lesson.lesson_id, lesson.title)}
          disabled={isDeleting}
          className="px-3 py-2 rounded-lg border border-[#fecdd3] bg-white text-[#e11d48] text-[10px] font-bold flex items-center gap-1.5 hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
        >
          {isDeleting ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Trash2 className="w-3.5 h-3.5" />
          )}
          Delete
        </button>
      </div>

      {updateOpen && <UpdatePanel lesson={lesson} onDone={onRefresh} />}
    </div>
  );
}

// ---- Main admin page ----
const DynamicLessonAdmin = () => {
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [reorderPending, setReorderPending] = useState(false);
  const reorderPendingRef = useRef(false);
  const [jsonFile, setJsonFile] = useState(null);
  const [imagesZip, setImagesZip] = useState(null);
  const [jsonError, setJsonError] = useState(null);
  const [uploadSummary, setUploadSummary] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [updateOpenId, setUpdateOpenId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [search, setSearch] = useState("");
  const [orderDraft, setOrderDraft] = useState("1");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const fetchLessons = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/admin/dynamic-lesson/lessons");
      setLessons(res.data);
    } catch (err) {
      console.error("Failed to fetch lessons", err);
      toast.error("Failed to load lessons");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLessons();
  }, [fetchLessons]);

  const trimmedSearch = search.trim().toLowerCase();
  const filteredLessons = useMemo(
    () => lessons.filter((l) => l.title.toLowerCase().includes(trimmedSearch)),
    [lessons, trimmedSearch],
  );

  const positions = useMemo(
    () => new Map(lessons.map((l, i) => [l.lesson_id, i + 1])),
    [lessons],
  );

  const selectedLesson = useMemo(
    () => lessons.find((l) => l.lesson_id === selectedId) || null,
    [lessons, selectedId],
  );

  // Keep selection valid: always point at a visible lesson.
  useEffect(() => {
    if (filteredLessons.length === 0) {
      setSelectedId(null);
      return;
    }
    setSelectedId((prev) =>
      filteredLessons.some((l) => l.lesson_id === prev) ? prev : filteredLessons[0].lesson_id,
    );
  }, [filteredLessons]);

  // Sync the "move to position" draft with the selected lesson.
  useEffect(() => {
    if (selectedLesson) {
      setOrderDraft(String(positions.get(selectedLesson.lesson_id) || 1));
    }
  }, [selectedLesson, positions]);

  // Keyboard navigation: ArrowUp / ArrowDown move through the index.
  useEffect(() => {
    const handler = (e) => {
      if (reorderPendingRef.current) return;
      const tag = e.target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || e.target?.isContentEditable) {
        return;
      }
      if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
      const list = lessons.filter((l) => l.title.toLowerCase().includes(trimmedSearch));
      if (list.length === 0) return;
      e.preventDefault();
      setSelectedId((prev) => {
        const idx = list.findIndex((l) => l.lesson_id === prev);
        const nextIdx =
          idx === -1
            ? 0
            : e.key === "ArrowDown"
              ? Math.min(idx + 1, list.length - 1)
              : Math.max(idx - 1, 0);
        return list[nextIdx].lesson_id;
      });
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [lessons, trimmedSearch]);

  // Keep the selected row in view inside the scrollable index.
  useEffect(() => {
    if (!selectedId) return;
    const el = document.getElementById(`lesson-index-${selectedId}`);
    if (el) el.scrollIntoView({ block: "nearest" });
  }, [selectedId]);

  const handleJsonSelect = (file) => {
    setJsonFile(file);
    setUploadSummary(null);
    if (!file) {
      setJsonError(null);
      return;
    }
    validateLessonJson(file).then((err) => setJsonError(err));
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!jsonFile) {
      toast.error("Please select a JSON file");
      return;
    }
    if (jsonError) {
      toast.error(jsonError);
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
      toast.success("Lesson uploaded successfully");
      setUploadSummary(res.data.uploadSummary || null);
      api.clearGetCache?.();
      setJsonFile(null);
      setImagesZip(null);
      setJsonError(null);
      await fetchLessons();
    } catch (err) {
      toast.error(err.response?.data?.error || "Upload failed");
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

    setDeletingId(lessonId);
    try {
      await api.delete(`/admin/dynamic-lesson/lessons/${lessonId}`);
      api.clearGetCache?.();
      toast.success("Lesson deleted");
      setLessons((prev) => prev.filter((l) => l.lesson_id !== lessonId));
    } catch (err) {
      toast.error(err.response?.data?.error || "Delete failed");
    } finally {
      setDeletingId(null);
    }
  };

  // Shared reorder path for drag, arrows, send-to-top/bottom and the position input.
  const applyReorder = async (next) => {
    if (reorderPendingRef.current) return;
    reorderPendingRef.current = true;
    setReorderPending(true);
    setLessons(next);
    try {
      await api.patch("/admin/dynamic-lesson/lessons/reorder", {
        orderedIds: next.map((l) => l.lesson_id),
      });
      api.clearGetCache?.();
      toast.success("Order saved");
    } catch {
      toast.error("Failed to save order");
      await fetchLessons();
    } finally {
      reorderPendingRef.current = false;
      setReorderPending(false);
    }
  };

  const moveLessonTo = (id, targetIndex) => {
    const fromIndex = lessons.findIndex((l) => l.lesson_id === id);
    const clamped = Math.max(0, Math.min(targetIndex, lessons.length - 1));
    if (fromIndex === -1 || fromIndex === clamped) return;
    const next = [...lessons];
    const [item] = next.splice(fromIndex, 1);
    next.splice(clamped, 0, item);
    applyReorder(next);
  };

  const moveLessonBy = (id, delta) => {
    const fromIndex = lessons.findIndex((l) => l.lesson_id === id);
    if (fromIndex === -1) return;
    moveLessonTo(id, fromIndex + delta);
  };

  const sendToTop = (id) => moveLessonTo(id, 0);
  const sendToBottom = (id) => moveLessonTo(id, lessons.length - 1);

  const handleApplyOrder = () => {
    if (!selectedLesson) return;
    const target = parseInt(orderDraft, 10);
    if (Number.isNaN(target)) {
      toast.error("Enter a valid position");
      return;
    }
    moveLessonTo(selectedLesson.lesson_id, target - 1);
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = lessons.findIndex((l) => l.lesson_id === active.id);
    const newIndex = lessons.findIndex((l) => l.lesson_id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    applyReorder(arrayMove(lessons, oldIndex, newIndex));
  };

  const noDrag = trimmedSearch.length > 0 || reorderPending;

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      <Toaster position="top-right" />

      {/* Header card */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div className="space-y-1">
          <h1 className="text-xl font-bold text-slate-800">Dynamic Lesson Admin</h1>
          <p className="text-xs text-slate-400">
            Upload new lessons from JSON and manage ordering with drag-and-drop
          </p>
        </div>
        <button
          onClick={fetchLessons}
          disabled={loading}
          className="flex items-center justify-center gap-2 self-start md:self-auto px-4 py-2.5 border border-slate-200 hover:border-[#002856] text-slate-600 hover:text-[#002856] font-bold text-xs rounded-xl bg-white hover:bg-slate-50 transition-colors disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[420px_minmax(0,1fr)] gap-6 items-start">
        {/* Upload New Lesson */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <h2 className="text-sm font-bold text-slate-800 mb-1">Upload New Lesson</h2>
          <p className="text-xs text-slate-400 mb-5">
            Title and chapter image are read from the JSON file automatically.
          </p>

          <form onSubmit={handleUpload} className="space-y-5">
            <FileDropzone
              id="jsonInput"
              label="JSON Configuration File"
              required
              accept=".json,application/json"
              file={jsonFile}
              onSelect={handleJsonSelect}
              error={jsonError}
              hint="Must contain chapterTitle, chapterImage and screens"
            />
            <FileDropzone
              id="zipInput"
              label="Images ZIP"
              accept=".zip,application/zip"
              file={imagesZip}
              onSelect={setImagesZip}
              hint="Optional — ZIP containing images referenced by filename"
            />

            <button
              type="submit"
              disabled={uploadLoading || !jsonFile || !!jsonError}
              className="w-full bg-[#002856] text-white hover:bg-[#001e40] px-6 py-3 rounded-xl transition font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {uploadLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Upload Lesson
                </>
              )}
            </button>
          </form>

          {uploadSummary && (
            <UploadDiagnostics summary={uploadSummary} onClose={() => setUploadSummary(null)} />
          )}
        </div>

        {/* Chapter browser: index + detail */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-800">Lessons</h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#eef2f6] text-[#002856] border border-[#ccd9e8]">
                {lessons.length}
              </span>
            </div>
            {reorderPending && (
              <span className="flex items-center gap-1.5 text-[10px] font-bold text-[#002856]">
                <Loader2 className="w-3 h-3 animate-spin" />
                Saving order...
              </span>
            )}
          </div>

          <div className="relative mb-4">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search lessons... (↑/↓ to navigate)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-8 py-2.5 bg-slate-50 border border-slate-200/60 rounded-xl text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:ring-4 focus:ring-[#002856]/5 focus:border-[#002856] transition-all"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-[300px_minmax(0,1fr)] gap-4">
              <div className="space-y-1.5">
                {Array.from({ length: 6 }).map((_, idx) => (
                  <div key={idx} className="h-12 rounded-xl bg-slate-100 animate-pulse" />
                ))}
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50/40 p-4 flex items-center justify-center min-h-[240px]">
                <Loader2 className="w-6 h-6 animate-spin text-[#002856]" />
              </div>
            </div>
          ) : lessons.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <HelpCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-slate-600 font-bold text-sm">No lessons yet</h3>
              <p className="text-xs text-slate-400 mt-1">Upload a JSON file to get started</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-[300px_minmax(0,1fr)] gap-4">
              {/* Index */}
              <div className="md:max-h-[620px] overflow-y-auto md:pr-1 overscroll-contain">
                {filteredLessons.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <Search className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-xs text-slate-400">No lessons match your search</p>
                  </div>
                ) : (
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={filteredLessons.map((l) => l.lesson_id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="space-y-1.5">
                        {filteredLessons.map((lesson) => (
                          <LessonIndexRow
                            key={lesson.lesson_id}
                            lesson={lesson}
                            position={positions.get(lesson.lesson_id) || 1}
                            selected={selectedId === lesson.lesson_id}
                            onSelect={setSelectedId}
                            dragDisabled={noDrag}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                )}
              </div>

              {/* Detail */}
              <div className="rounded-xl border border-slate-100 bg-slate-50/40 p-4 min-h-[240px]">
                {selectedLesson ? (
                  <LessonDetail
                    lesson={selectedLesson}
                    position={positions.get(selectedLesson.lesson_id) || 1}
                    total={lessons.length}
                    movePending={reorderPending}
                    orderDraft={orderDraft}
                    onOrderDraftChange={setOrderDraft}
                    onApplyOrder={handleApplyOrder}
                    onMoveBy={moveLessonBy}
                    onSendTop={sendToTop}
                    onSendBottom={sendToBottom}
                    updateOpen={updateOpenId === selectedLesson.lesson_id}
                    onToggleUpdate={() =>
                      setUpdateOpenId((prev) =>
                        prev === selectedLesson.lesson_id ? null : selectedLesson.lesson_id,
                      )
                    }
                    onRefresh={fetchLessons}
                    deletingId={deletingId}
                    onDelete={handleDelete}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full py-12 text-center">
                    <HelpCircle className="w-10 h-10 text-slate-300 mb-2" />
                    <p className="text-xs text-slate-400">Select a lesson to manage it</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DynamicLessonAdmin;
