import { DndContext, closestCenter } from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Plus,
  Trash2,
  Pencil,
  Loader2,
  RefreshCw,
  FileQuestion,
  GripVertical,
  Volume2,
  BookOpen,
  FileText,
  Image as ImageIcon,
  Music,
} from "lucide-react";
import { QUESTION_TYPES, QuestionFormBuilder } from "../AdminExamManager";
import { useScholarshipWorkspace, questionLabel } from "./index";
import Chip from "./ui/Chip";
import EmptyState from "./ui/EmptyState";
import { inputCls, labelCls } from "./ui/buttons";
import { ControlDropdown } from "../../../payments-admin/components/controls";

const TYPE_TONE = {
  audio_block: "bg-amber-50 border-amber-200 text-amber-600",
  reading_passage: "bg-blue-50 border-blue-200 text-blue-600",
  content_block: "bg-slate-50 border-slate-200 text-slate-500",
  image_block: "bg-violet-50 border-violet-200 text-violet-600",
};

const TYPE_ICON = {
  audio_block: Volume2,
  reading_passage: BookOpen,
  content_block: FileText,
  image_block: ImageIcon,
};

function SortableQuestionRow({ q, qNum, onEdit, onDelete }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: q.question_id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const typeTone =
    TYPE_TONE[q.question_type] || "bg-white border-slate-200 text-slate-700";
  const Icon = TYPE_ICON[q.question_type] || FileQuestion;

  const dragHandle = (
    <button
      {...attributes}
      {...listeners}
      className="cursor-grab active:cursor-grabbing p-1 text-gray-300 hover:text-gray-500 shrink-0"
      aria-label="Drag to reorder"
    >
      <GripVertical className="w-4 h-4" />
    </button>
  );
  const actions = (
    <div className="flex items-center gap-1 shrink-0">
      <button
        onClick={onEdit}
        className="p-1.5 text-slate-400 hover:text-[#002856] transition-colors"
        aria-label={`Edit ${q.question_type.replace(/_/g, " ")}`}
      >
        <Pencil className="w-3.5 h-3.5" />
      </button>
      <button
        onClick={onDelete}
        className="p-1.5 text-slate-400 hover:text-red-500 transition-colors"
        aria-label={`Delete ${q.question_type.replace(/_/g, " ")}`}
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );

  // Page break — render as a dashed divider, not a question row
  if (q.question_type === "page_break") {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className={`${isDragging ? "opacity-50" : ""} flex items-center gap-2 py-1`}
      >
        {dragHandle}
        <div className="flex-1 flex items-center gap-3">
          <div className="flex-1 border-t-2 border-dashed border-slate-300" />
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1 whitespace-nowrap">
            Page Break
          </span>
          <div className="flex-1 border-t-2 border-dashed border-slate-300" />
        </div>
        {actions}
      </div>
    );
  }

  // Audio block — amber styling with speaker icon
  if (q.question_type === "audio_block") {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className={`${isDragging ? "opacity-50 shadow-lg" : "shadow-sm"} bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center justify-between gap-2`}
      >
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          {dragHandle}
          <Music className="w-4 h-4 text-amber-500 shrink-0" />
          <div className="min-w-0">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600">
              Audio Block
            </span>
            <p className="text-xs text-slate-500 truncate">
              {q.audio_url ? "Audio uploaded ✓" : "⚠ No audio uploaded"}
            </p>
          </div>
        </div>
        {actions}
      </div>
    );
  }

  // Reading passage — blue styling with book icon and passage preview
  if (q.question_type === "reading_passage") {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className={`${isDragging ? "opacity-50 shadow-lg" : "shadow-sm"} bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-center justify-between gap-2`}
      >
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          {dragHandle}
          <BookOpen className="w-4 h-4 text-blue-500 shrink-0" />
          <div className="min-w-0">
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600">
              Reading Passage
            </span>
            <p className="text-xs text-slate-600 truncate">
              {q.question_data?.passage?.slice(0, 80) || "Empty passage"}
              {(q.question_data?.passage?.length || 0) > 80 ? "…" : ""}
            </p>
          </div>
        </div>
        {actions}
      </div>
    );
  }

  // Content block — neutral styling with file icon and content preview
  if (q.question_type === "content_block") {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className={`${isDragging ? "opacity-50 shadow-lg" : "shadow-sm"} bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between gap-2`}
      >
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          {dragHandle}
          <FileText className="w-4 h-4 text-slate-500 shrink-0" />
          <div className="min-w-0">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Content Block
            </span>
            <p className="text-xs text-slate-600 truncate">
              {q.question_data?.content?.slice(0, 80) || "Empty content"}
              {(q.question_data?.content?.length || 0) > 80 ? "…" : ""}
            </p>
          </div>
        </div>
        {actions}
      </div>
    );
  }

  // Image block — violet styling with image icon
  if (q.question_type === "image_block") {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className={`${isDragging ? "opacity-50 shadow-lg" : "shadow-sm"} bg-violet-50 border border-violet-200 rounded-xl p-3 flex items-center justify-between gap-2`}
      >
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          {dragHandle}
          <ImageIcon className="w-4 h-4 text-violet-500 shrink-0" />
          <div className="min-w-0">
            <span className="text-[11px] font-bold uppercase tracking-wider text-violet-600">
              Image Block
            </span>
            <p className="text-xs text-slate-500 truncate">
              {q.question_data?.image_url ? "Image uploaded ✓" : "⚠ No image uploaded"}
            </p>
          </div>
        </div>
        {actions}
      </div>
    );
  }

  // Answerable question — chip row with points
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${isDragging ? "opacity-50 shadow-lg" : "shadow-sm"} bg-white rounded-xl p-3 flex items-center justify-between gap-2 transition-shadow border border-slate-200`}
    >
      <div className="flex items-center gap-2.5 flex-1 min-w-0">
        {dragHandle}
        <span className="w-6 text-center text-xs font-bold text-gray-400 shrink-0">
          {qNum}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 mb-0.5">
            <Chip cls={typeTone}>
              <Icon className="w-3 h-3" />
              {q.question_type.replace(/_/g, " ")}
            </Chip>
            {q.audio_url && (
              <Music className="w-3.5 h-3.5 text-purple-400 shrink-0" />
            )}
          </div>
          <p className="text-xs text-slate-600 truncate">
            {questionLabel(q) || "—"}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <span className="text-[11px] text-slate-400 font-semibold mr-1">
          {q.points} pt
        </span>
        {actions}
      </div>
    </div>
  );
}

/**
 * Questions tab: sortable question list on the left, the shared
 * QuestionFormBuilder form on the right.
 */
export default function QuestionsTab() {
  const {
    selectedExam,
    examQuestions,
    saving,
    qForm,
    setQForm,
    setAudioFile,
    audioLink,
    setAudioLink,
    setImageBlockFile,
    setQuestionImageFile,
    setOptionImageFiles,
    editingQuestionId,
    resetQuestionForm,
    handleQuestionTypeChange,
    startEditQuestion,
    handleAddQuestion,
    handleEditQuestion,
    handleDeleteQuestion,
    handleDragEnd,
    dndSensors,
  } = useScholarshipWorkspace();

  if (!selectedExam) return null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[400px_minmax(0,1fr)] gap-6 items-start">
      {/* Question list */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-slate-700">
            Questions ({examQuestions.length})
          </h3>
          {editingQuestionId && (
            <button
              onClick={resetQuestionForm}
              className="text-[11px] font-bold text-slate-400 hover:text-slate-600"
            >
              Cancel edit
            </button>
          )}
        </div>
        {examQuestions.length === 0 ? (
          <EmptyState
            icon={FileQuestion}
            title="No questions yet"
            sub="Add the first question using the form."
            compact
          />
        ) : (
          <DndContext
            sensors={dndSensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={examQuestions.map((q) => q.question_id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {examQuestions.map((q, idx) => (
                  <SortableQuestionRow
                    key={q.question_id}
                    q={q}
                    qNum={idx + 1}
                    onEdit={() => startEditQuestion(q)}
                    onDelete={() => handleDeleteQuestion(q.question_id)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

      {/* Question form */}
      <div className="bg-white rounded-xl border border-[#e5e7eb] shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-slate-700">
            {editingQuestionId ? "Edit question" : "Add question"}
          </h3>
          <span className="text-[11px] text-slate-400">
            drag to reorder list
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-[1fr_120px] gap-3 mb-4">
          <div>
            <label className={labelCls}>Question type</label>
            <ControlDropdown
              aria-label="Question type"
              value={qForm.question_type}
              onChange={handleQuestionTypeChange}
              options={QUESTION_TYPES}
              placeholder="Select question type"
            />
          </div>
          <div>
            <label className={labelCls}>Points</label>
            <input
              type="number"
              min={0}
              value={qForm.points}
              onChange={(e) =>
                setQForm({ ...qForm, points: parseInt(e.target.value) || 0 })
              }
              className={inputCls}
            />
          </div>
        </div>

        <QuestionFormBuilder
          type={qForm.question_type}
          data={qForm.question_data}
          onChange={(newData) => setQForm({ ...qForm, question_data: newData })}
          onOptionFileChange={(idx, file) =>
            setOptionImageFiles((prev) => ({ ...prev, [idx]: file }))
          }
          onQuestionImageFileChange={(file) => setQuestionImageFile(file)}
          onImageBlockFileChange={(file) => setImageBlockFile(file)}
        />

        {/* Audio controls */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Audio file</label>
            <input
              type="file"
              accept="audio/*"
              onChange={(e) => setAudioFile(e.target.files?.[0] || null)}
              className="w-full text-xs text-slate-500 file:mr-2 file:px-3 file:py-1.5 file:rounded-lg file:border-0 file:bg-[#eef2f6] file:text-[#002856] file:font-bold file:text-xs"
            />
          </div>
          <div>
            <label className={labelCls}>Audio URL (Google Drive or link)</label>
            <input
              type="text"
              value={audioLink}
              onChange={(e) => setAudioLink(e.target.value)}
              placeholder="Paste link or leave empty"
              className={inputCls}
            />
          </div>
        </div>

        <div className="flex gap-3 mt-5">
          <button
            onClick={editingQuestionId ? handleEditQuestion : handleAddQuestion}
            disabled={saving}
            className="flex items-center justify-center gap-2 flex-1 bg-[#002856] text-white hover:bg-[#001e40] px-6 py-3 rounded-xl transition font-bold text-sm disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : editingQuestionId ? (
              <RefreshCw className="w-4 h-4" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            {editingQuestionId ? "Save Question" : "Add Question"}
          </button>
        </div>
      </div>
    </div>
  );
}
