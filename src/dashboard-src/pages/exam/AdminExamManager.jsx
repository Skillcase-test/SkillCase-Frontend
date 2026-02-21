import React, { useState, useEffect, useCallback } from "react";
import {
  listExams,
  createExam,
  deleteExam,
  updateExam,
  getExamDetail,
  addQuestion,
  editQuestion,
  deleteQuestion,
  reorderQuestions,
  setExamVisibility,
  getExamVisibility,
  removeExamVisibility,
  getExamSubmissions,
  reopenSubmission,
  resetSubmissionForRetest,
  listBatches,
} from "../../../api/examApi";
import {
  Plus,
  Trash2,
  Edit3,
  Eye,
  EyeOff,
  ChevronRight,
  Loader2,
  Save,
  ArrowLeft,
  Upload,
  GripVertical,
  Users,
  AlertTriangle,
  RefreshCw,
  X,
  Music,
  CheckCircle,
  Circle,
  MinusCircle,
  SeparatorHorizontal,
  BookOpen,
  Volume2,
  FileText,
} from "lucide-react";

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// QUESTION TYPE DEFINITIONS
const QUESTION_TYPES = [
  { value: "mcq_single", label: "MCQ — Single Answer" },
  { value: "mcq_multi", label: "MCQ — Multiple Answers" },
  { value: "true_false", label: "True / False" },
  { value: "fill_typing", label: "Fill Blank — Typing" },
  { value: "fill_options", label: "Fill Blank — Options" },
  { value: "composite_question", label: "Composite Question" },
  { value: "sentence_ordering", label: "Sentence Ordering" },
  { value: "sentence_correction", label: "Sentence Correction" },
  { value: "matching", label: "Matching" },
  { value: "dialogue_dropdown", label: "Dialogue Dropdown" },
  { value: "page_break", label: "── Page Break ──" },
  { value: "reading_passage", label: "📖 Reading Passage" },
  { value: "content_block", label: "📝 Content Block" },
  { value: "audio_block", label: "🔊 Audio Block" },
];

function getDefaultData(type) {
  switch (type) {
    case "mcq_single":
      return { question: "", options: ["", ""], correct: "" };
    case "mcq_multi":
      return { question: "", options: ["", ""], correct: [] };
    case "true_false":
      return { question: "", correct: true };
    case "fill_typing":
      return { question: "", correct: "", explanation: "", placeholder: "" };
    case "fill_options":
      return { question: "", options: ["", ""], correct: "", explanation: "" };
    case "composite_question":
      return {
        question: "Answer the following",
        intro_text: "",
        numbering_style: "number",
        items: [
          { type: "option", prompt: "", options: ["", ""], correct: 0 },
          { type: "dropdown", prompt: "", options: ["", ""], correct: 0 },
          { type: "blank", prompt: "", correct: [""], placeholders: [""] },
        ],
      };
    case "sentence_ordering":
      return {
        question: "Arrange the words to form the correct sentence",
        words: [],
        correct_order: [],
        hint_en: "",
      };
    case "sentence_correction":
      return {
        question: "Correct the following sentence",
        incorrect_sentence: "",
        correct_sentence: "",
        hint_en: "",
      };
    case "matching":
      return {
        question: "Match the items",
        left: ["", ""],
        right: ["", ""],
        correct_pairs: [
          [0, 0],
          [1, 1],
        ],
      };
    case "dialogue_dropdown":
      return { question: "Complete the dialogue", dialogue: [] };
    case "page_break":
      return {};
    case "reading_passage":
      return { passage: "" };
    case "content_block":
      return { content: "" };
    case "audio_block":
      return {};
    default:
      return { question: "" };
  }
}

function normalizeQuestionData(type, rawData) {
  let data = rawData;

  if (typeof data === "string") {
    try {
      data = JSON.parse(data);
    } catch {
      data = null;
    }
  }

  const defaults = getDefaultData(type);
  if (!data || typeof data !== "object") return defaults;

  const merged = { ...defaults, ...data };

  if (type === "composite_question") {
    const items = Array.isArray(merged.items) ? merged.items : [];
    merged.numbering_style = ["number", "alphabet", "none"].includes(
      merged.numbering_style,
    )
      ? merged.numbering_style
      : "number";
    merged.items = items.map((item) => {
      if (item?.type === "option" || item?.type === "dropdown") {
        return {
          type: item?.type === "dropdown" ? "dropdown" : "option",
          prompt: item.prompt || "",
          options:
            Array.isArray(item.options) && item.options.length > 0
              ? item.options
              : ["", ""],
          correct:
            typeof item.correct === "number" && item.correct >= 0
              ? item.correct
              : 0,
        };
      }
      return {
        type: "blank",
        prompt: item?.prompt || "",
        correct: (() => {
          const values = Array.isArray(item?.correct)
            ? item.correct
            : [item?.correct || ""];
          return values.length > 0 ? values : [""];
        })(),
        placeholders: (() => {
          const correctValues = Array.isArray(item?.correct)
            ? item.correct
            : [item?.correct || ""];
          const count = Math.max(1, correctValues.length);
          const legacySingle =
            typeof item?.placeholder === "string" ? item.placeholder : "";
          const candidate = Array.isArray(item?.placeholders)
            ? item.placeholders
            : [];
          return Array.from({ length: count }, (_, idx) =>
            String(candidate[idx] ?? (idx === 0 ? legacySingle : "") ?? ""),
          );
        })(),
      };
    });
  }

  if (type === "content_block") {
    merged.content = merged.content || "";
  }

  if (type === "fill_typing") {
    merged.placeholder = merged.placeholder || "";
  }

  return merged;
}

// QUESTION FORM BUILDERS
// — Renders type-specific inputs

function MCQSingleForm({ data, onChange }) {
  const update = (key, val) => onChange({ ...data, [key]: val });
  const updateOption = (idx, val) => {
    const opts = [...data.options];
    opts[idx] = val;
    update("options", opts);
  };
  const addOption = () => update("options", [...data.options, ""]);
  const removeOption = (idx) => {
    const opts = data.options.filter((_, i) => i !== idx);
    // If the removed option was the correct answer, clear it
    const newCorrect = data.correct === data.options[idx] ? "" : data.correct;
    onChange({ ...data, options: opts, correct: newCorrect });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Question *
        </label>
        <input
          value={data.question}
          onChange={(e) => update("question", e.target.value)}
          className="w-full px-3 py-2 border rounded-lg text-sm"
          placeholder="Enter question text..."
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Options *
        </label>
        <div className="space-y-2">
          {data.options.map((opt, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => update("correct", opt)}
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                  data.correct === opt && opt !== ""
                    ? "border-green-500 bg-green-500"
                    : "border-gray-300"
                }`}
              >
                {data.correct === opt && opt !== "" && (
                  <svg
                    className="w-3 h-3 text-white"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={3}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                )}
              </button>
              <input
                value={opt}
                onChange={(e) => updateOption(idx, e.target.value)}
                className="flex-1 px-3 py-2 border rounded-lg text-sm"
                placeholder={`Option ${idx + 1}`}
              />
              {data.options.length > 2 && (
                <button
                  type="button"
                  onClick={() => removeOption(idx)}
                  className="text-red-400 hover:text-red-600"
                >
                  <MinusCircle className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addOption}
          className="mt-2 text-xs text-blue-600 hover:underline flex items-center gap-1"
        >
          <Plus className="w-3 h-3" /> Add option
        </button>
        <p className="text-xs text-gray-400 mt-1">
          Click the circle to mark the correct answer.
        </p>
      </div>
    </div>
  );
}

function MCQMultiForm({ data, onChange }) {
  const update = (key, val) => onChange({ ...data, [key]: val });
  const updateOption = (idx, val) => {
    const opts = [...data.options];
    opts[idx] = val;
    update("options", opts);
  };
  const addOption = () => update("options", [...data.options, ""]);
  const removeOption = (idx) => {
    const opts = data.options.filter((_, i) => i !== idx);
    const removedValue = data.options[idx];
    const correct = (data.correct || []).filter((c) => c !== removedValue);
    onChange({ ...data, options: opts, correct });
  };
  const toggleCorrect = (optValue) => {
    const correct = [...(data.correct || [])];
    const idx = correct.indexOf(optValue);
    if (idx > -1) correct.splice(idx, 1);
    else correct.push(optValue);
    update("correct", correct);
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Question *
        </label>
        <input
          value={data.question}
          onChange={(e) => update("question", e.target.value)}
          className="w-full px-3 py-2 border rounded-lg text-sm"
          placeholder="Enter question text..."
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Options *
        </label>
        <div className="space-y-2">
          {data.options.map((opt, idx) => {
            const isCorrect = (data.correct || []).includes(opt) && opt !== "";
            return (
              <div key={idx} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => opt !== "" && toggleCorrect(opt)}
                  className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                    isCorrect
                      ? "border-green-500 bg-green-500"
                      : "border-gray-300"
                  }`}
                >
                  {isCorrect && (
                    <svg
                      className="w-3 h-3 text-white"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={3}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  )}
                </button>
                <input
                  value={opt}
                  onChange={(e) => updateOption(idx, e.target.value)}
                  className="flex-1 px-3 py-2 border rounded-lg text-sm"
                  placeholder={`Option ${idx + 1}`}
                />
                {data.options.length > 2 && (
                  <button
                    type="button"
                    onClick={() => removeOption(idx)}
                    className="text-red-400 hover:text-red-600"
                  >
                    <MinusCircle className="w-4 h-4" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
        <button
          type="button"
          onClick={addOption}
          className="mt-2 text-xs text-blue-600 hover:underline flex items-center gap-1"
        >
          <Plus className="w-3 h-3" /> Add option
        </button>
        <p className="text-xs text-gray-400 mt-1">
          Click checkboxes to mark all correct answers.
        </p>
      </div>
    </div>
  );
}

function TrueFalseForm({ data, onChange }) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Statement *
        </label>
        <input
          value={data.question}
          onChange={(e) => onChange({ ...data, question: e.target.value })}
          className="w-full px-3 py-2 border rounded-lg text-sm"
          placeholder="Enter the statement to evaluate..."
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Correct Answer *
        </label>
        <div className="flex gap-3">
          {[true, false].map((val) => (
            <button
              key={String(val)}
              type="button"
              onClick={() => onChange({ ...data, correct: val })}
              className={`flex-1 py-3 rounded-xl border-2 font-bold text-center transition-all ${
                data.correct === val
                  ? "border-green-500 bg-green-50 text-green-700"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              {val ? "True" : "False"}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function FillTypingForm({ data, onChange }) {
  const update = (key, val) => onChange({ ...data, [key]: val });
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Question *
        </label>
        <textarea
          value={data.question}
          onChange={(e) => update("question", e.target.value)}
          className="w-full px-3 py-2 border rounded-lg text-sm min-h-[88px]"
          placeholder="e.g., The capital of Germany is ___"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Input Placeholder (optional)
        </label>
        <input
          value={data.placeholder || ""}
          onChange={(e) => update("placeholder", e.target.value)}
          className="w-full px-3 py-2 border rounded-lg text-sm"
          placeholder="e.g., Type city name"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Correct Answer *
        </label>
        <input
          value={data.correct || ""}
          onChange={(e) => update("correct", e.target.value)}
          className="w-full px-3 py-2 border rounded-lg text-sm"
          placeholder="e.g., Berlin"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Explanation (optional)
        </label>
        <input
          value={data.explanation || ""}
          onChange={(e) => update("explanation", e.target.value)}
          className="w-full px-3 py-2 border rounded-lg text-sm"
          placeholder="Optional hint or context"
        />
      </div>
    </div>
  );
}

function FillOptionsForm({ data, onChange }) {
  const update = (key, val) => onChange({ ...data, [key]: val });
  const updateOption = (idx, val) => {
    const opts = [...data.options];
    opts[idx] = val;
    update("options", opts);
  };
  const addOption = () => update("options", [...data.options, ""]);
  const removeOption = (idx) => {
    const opts = data.options.filter((_, i) => i !== idx);
    const newCorrect = data.correct === data.options[idx] ? "" : data.correct;
    onChange({ ...data, options: opts, correct: newCorrect });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Question *
        </label>
        <input
          value={data.question}
          onChange={(e) => update("question", e.target.value)}
          className="w-full px-3 py-2 border rounded-lg text-sm"
          placeholder="e.g., She ___ to school every day"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Options *
        </label>
        <div className="space-y-2">
          {data.options.map((opt, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => opt !== "" && update("correct", opt)}
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                  data.correct === opt && opt !== ""
                    ? "border-green-500 bg-green-500"
                    : "border-gray-300"
                }`}
              >
                {data.correct === opt && opt !== "" && (
                  <svg
                    className="w-3 h-3 text-white"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={3}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                )}
              </button>
              <input
                value={opt}
                onChange={(e) => updateOption(idx, e.target.value)}
                className="flex-1 px-3 py-2 border rounded-lg text-sm"
                placeholder={`Option ${idx + 1}`}
              />
              {data.options.length > 2 && (
                <button
                  type="button"
                  onClick={() => removeOption(idx)}
                  className="text-red-400 hover:text-red-600"
                >
                  <MinusCircle className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addOption}
          className="mt-2 text-xs text-blue-600 hover:underline flex items-center gap-1"
        >
          <Plus className="w-3 h-3" /> Add option
        </button>
        <p className="text-xs text-gray-400 mt-1">
          Click the circle to mark the correct option.
        </p>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Explanation (optional)
        </label>
        <input
          value={data.explanation || ""}
          onChange={(e) => update("explanation", e.target.value)}
          className="w-full px-3 py-2 border rounded-lg text-sm"
          placeholder="Optional context"
        />
      </div>
    </div>
  );
}

function SentenceOrderingForm({ data, onChange }) {
  const update = (key, val) => onChange({ ...data, [key]: val });
  const [wordInput, setWordInput] = useState("");

  const addWord = () => {
    if (!wordInput.trim()) return;
    const newWords = [...(data.correct_order || []), wordInput.trim()];
    // correct_order = intended order; words = shuffled (student sees scrambled, but admin sets the correct order)
    onChange({
      ...data,
      correct_order: newWords,
      words: [...newWords].sort(() => Math.random() - 0.5),
    });
    setWordInput("");
  };

  const removeWord = (idx) => {
    const newOrder = data.correct_order.filter((_, i) => i !== idx);
    onChange({
      ...data,
      correct_order: newOrder,
      words: [...newOrder].sort(() => Math.random() - 0.5),
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Instruction (optional)
        </label>
        <input
          value={data.question || ""}
          onChange={(e) => update("question", e.target.value)}
          className="w-full px-3 py-2 border rounded-lg text-sm"
          placeholder="Arrange the words..."
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Words in CORRECT order *{" "}
          <span className="text-xs text-gray-400">
            (add one by one, in the right sequence)
          </span>
        </label>
        <div className="flex gap-2 mb-2">
          <input
            value={wordInput}
            onChange={(e) => setWordInput(e.target.value)}
            onKeyDown={(e) =>
              e.key === "Enter" && (e.preventDefault(), addWord())
            }
            className="flex-1 px-3 py-2 border rounded-lg text-sm"
            placeholder="Type a word and press Enter..."
          />
          <button
            type="button"
            onClick={addWord}
            className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold"
          >
            Add
          </button>
        </div>
        {data.correct_order && data.correct_order.length > 0 && (
          <div className="flex flex-wrap gap-2 p-3 bg-gray-50 rounded-lg border">
            {data.correct_order.map((word, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border-2 border-blue-200 rounded-lg text-sm font-medium text-blue-700"
              >
                <span className="text-xs text-blue-400 font-bold">
                  {idx + 1}.
                </span>{" "}
                {word}
                <button
                  type="button"
                  onClick={() => removeWord(idx)}
                  className="text-red-400 hover:text-red-600 ml-1"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          English Hint (optional)
        </label>
        <input
          value={data.hint_en || ""}
          onChange={(e) => update("hint_en", e.target.value)}
          className="w-full px-3 py-2 border rounded-lg text-sm"
          placeholder="e.g., I go to school every day"
        />
      </div>
    </div>
  );
}

function SentenceCorrectionForm({ data, onChange }) {
  const update = (key, val) => onChange({ ...data, [key]: val });
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Incorrect Sentence *
        </label>
        <input
          value={data.incorrect_sentence || ""}
          onChange={(e) => update("incorrect_sentence", e.target.value)}
          className="w-full px-3 py-2 border rounded-lg text-sm border-red-200 bg-red-50"
          placeholder="e.g., Ich gehe nach Schule"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Correct Sentence *
        </label>
        <input
          value={data.correct_sentence || ""}
          onChange={(e) => update("correct_sentence", e.target.value)}
          className="w-full px-3 py-2 border rounded-lg text-sm border-green-200 bg-green-50"
          placeholder="e.g., Ich gehe zur Schule"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          English Hint (optional)
        </label>
        <input
          value={data.hint_en || ""}
          onChange={(e) => update("hint_en", e.target.value)}
          className="w-full px-3 py-2 border rounded-lg text-sm"
          placeholder="I go to school"
        />
      </div>
    </div>
  );
}

function MatchingForm({ data, onChange }) {
  const addPair = () => {
    const left = [...data.left, ""];
    const right = [...data.right, ""];
    const pairs = [...data.correct_pairs, [left.length - 1, right.length - 1]];
    onChange({ ...data, left, right, correct_pairs: pairs });
  };
  const removePair = (idx) => {
    const left = data.left.filter((_, i) => i !== idx);
    const right = data.right.filter((_, i) => i !== idx);
    // Rebuild pairs as 1:1 default
    const pairs = left.map((_, i) => [i, i]);
    onChange({ ...data, left, right, correct_pairs: pairs });
  };
  const updateLeft = (idx, val) => {
    const l = [...data.left];
    l[idx] = val;
    onChange({ ...data, left: l });
  };
  const updateRight = (idx, val) => {
    const r = [...data.right];
    r[idx] = val;
    onChange({ ...data, right: r });
  };
  const updatePairRight = (leftIdx, rightIdx) => {
    const pairs = data.correct_pairs.filter((p) => p[0] !== leftIdx);
    pairs.push([leftIdx, rightIdx]);
    pairs.sort((a, b) => a[0] - b[0]);
    onChange({ ...data, correct_pairs: pairs });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Instruction (optional)
        </label>
        <input
          value={data.question || ""}
          onChange={(e) => onChange({ ...data, question: e.target.value })}
          className="w-full px-3 py-2 border rounded-lg text-sm"
          placeholder="Match the items"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Pairs *{" "}
          <span className="text-xs text-gray-400">
            (Left item matches with Right item)
          </span>
        </label>
        <div className="space-y-2">
          {data.left.map((_, idx) => {
            const currentRight =
              data.correct_pairs.find((p) => p[0] === idx)?.[1] ?? idx;
            return (
              <div key={idx} className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-400 w-4">
                  {idx + 1}
                </span>
                <input
                  value={data.left[idx]}
                  onChange={(e) => updateLeft(idx, e.target.value)}
                  className="flex-1 px-3 py-2 border rounded-lg text-sm"
                  placeholder={`Left ${idx + 1}`}
                />
                <span className="text-gray-400 text-sm">→</span>
                <input
                  value={data.right[idx]}
                  onChange={(e) => updateRight(idx, e.target.value)}
                  className="flex-1 px-3 py-2 border rounded-lg text-sm"
                  placeholder={`Right ${idx + 1}`}
                />
                <select
                  value={currentRight}
                  onChange={(e) =>
                    updatePairRight(idx, parseInt(e.target.value))
                  }
                  className="w-20 px-2 py-2 border rounded-lg text-xs"
                  title="Correct match"
                >
                  {data.right.map((r, ri) => (
                    <option key={ri} value={ri}>
                      → {ri + 1}
                    </option>
                  ))}
                </select>
                {data.left.length > 2 && (
                  <button
                    type="button"
                    onClick={() => removePair(idx)}
                    className="text-red-400 hover:text-red-600"
                  >
                    <MinusCircle className="w-4 h-4" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
        <button
          type="button"
          onClick={addPair}
          className="mt-2 text-xs text-blue-600 hover:underline flex items-center gap-1"
        >
          <Plus className="w-3 h-3" /> Add pair
        </button>
        <p className="text-xs text-gray-400 mt-1">
          The dropdown sets which right-side item correctly matches each
          left-side item.
        </p>
      </div>
    </div>
  );
}

function DialogueDropdownForm({ data, onChange }) {
  const addLine = (type) => {
    const newLine =
      type === "text"
        ? { speaker: "", text: "", options: null, correct: null }
        : { speaker: "", text: null, options: ["", ""], correct: 0 };
    onChange({ ...data, dialogue: [...data.dialogue, newLine] });
  };
  const removeLine = (idx) => {
    onChange({ ...data, dialogue: data.dialogue.filter((_, i) => i !== idx) });
  };
  const updateLine = (idx, key, val) => {
    const d = [...data.dialogue];
    d[idx] = { ...d[idx], [key]: val };
    onChange({ ...data, dialogue: d });
  };
  const updateDialogueOption = (lineIdx, optIdx, val) => {
    const d = [...data.dialogue];
    const opts = [...d[lineIdx].options];
    opts[optIdx] = val;
    d[lineIdx] = { ...d[lineIdx], options: opts };
    onChange({ ...data, dialogue: d });
  };
  const addDialogueOption = (lineIdx) => {
    const d = [...data.dialogue];
    d[lineIdx] = { ...d[lineIdx], options: [...d[lineIdx].options, ""] };
    onChange({ ...data, dialogue: d });
  };
  const removeDialogueOption = (lineIdx, optIdx) => {
    const d = [...data.dialogue];
    const opts = d[lineIdx].options.filter((_, i) => i !== optIdx);
    const correct = d[lineIdx].correct >= opts.length ? 0 : d[lineIdx].correct;
    d[lineIdx] = { ...d[lineIdx], options: opts, correct };
    onChange({ ...data, dialogue: d });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Instruction (optional)
        </label>
        <input
          value={data.question || ""}
          onChange={(e) => onChange({ ...data, question: e.target.value })}
          className="w-full px-3 py-2 border rounded-lg text-sm"
          placeholder="Complete the dialogue"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Dialogue Lines
        </label>
        <div className="space-y-3">
          {data.dialogue.map((line, idx) => {
            const isDropdown = line.text === null;
            return (
              <div
                key={idx}
                className={`p-3 rounded-lg border-2 ${
                  isDropdown
                    ? "border-blue-200 bg-blue-50/50"
                    : "border-gray-200 bg-gray-50"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-gray-400">
                    Line {idx + 1} — {isDropdown ? "🔽 Dropdown" : "💬 Text"}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeLine(idx)}
                    className="text-red-400 hover:text-red-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="flex gap-2 mb-2">
                  <input
                    value={line.speaker}
                    onChange={(e) => updateLine(idx, "speaker", e.target.value)}
                    className="w-24 px-3 py-2 border rounded-lg text-sm"
                    placeholder="Speaker"
                  />
                  {!isDropdown && (
                    <input
                      value={line.text}
                      onChange={(e) => updateLine(idx, "text", e.target.value)}
                      className="flex-1 px-3 py-2 border rounded-lg text-sm"
                      placeholder="What they say..."
                    />
                  )}
                </div>
                {isDropdown && (
                  <div className="space-y-2 ml-2">
                    <p className="text-xs text-blue-600 font-medium">
                      Dropdown options (student picks one):
                    </p>
                    {line.options.map((opt, oi) => (
                      <div key={oi} className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => updateLine(idx, "correct", oi)}
                          className={`w-4 h-4 rounded-full border-2 shrink-0 ${
                            line.correct === oi
                              ? "border-green-500 bg-green-500"
                              : "border-gray-300"
                          }`}
                        />
                        <input
                          value={opt}
                          onChange={(e) =>
                            updateDialogueOption(idx, oi, e.target.value)
                          }
                          className="flex-1 px-3 py-1.5 border rounded-lg text-sm"
                          placeholder={`Option ${oi + 1}`}
                        />
                        {line.options.length > 2 && (
                          <button
                            type="button"
                            onClick={() => removeDialogueOption(idx, oi)}
                            className="text-red-400"
                          >
                            <MinusCircle className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => addDialogueOption(idx)}
                      className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" /> Add option
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div className="flex gap-2 mt-3">
          <button
            type="button"
            onClick={() => addLine("text")}
            className="text-xs bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg font-medium flex items-center gap-1"
          >
            <Plus className="w-3 h-3" /> Add Text Line
          </button>
          <button
            type="button"
            onClick={() => addLine("dropdown")}
            className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 px-3 py-1.5 rounded-lg font-medium flex items-center gap-1"
          >
            <Plus className="w-3 h-3" /> Add Dropdown Line
          </button>
        </div>
      </div>
    </div>
  );
}

// PAGE BREAK FORM (no fields needed)
function PageBreakForm() {
  return (
    <div className="p-4 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300 text-center">
      <SeparatorHorizontal className="w-8 h-8 text-gray-400 mx-auto mb-2" />
      <p className="text-sm font-medium text-gray-600">Page Break</p>
      <p className="text-xs text-gray-400 mt-1">
        Questions after this will appear on the next page for students.
      </p>
    </div>
  );
}

// AUDIO BLOCK FORM
function AudioBlockForm() {
  return (
    <div className="p-4 bg-amber-50 rounded-xl border-2 border-dashed border-amber-300 text-center">
      <Volume2 className="w-8 h-8 text-amber-500 mx-auto mb-2" />
      <p className="text-sm font-medium text-amber-700">Audio Block</p>
      <p className="text-xs text-amber-500 mt-1">
        Upload an audio file using the field above. All questions that follow on
        the same page will share this audio automatically.
      </p>
    </div>
  );
}
// Simple inline text parser for preview: **bold**, *italic*, __underline__
function parseFormattedText(text) {
  if (!text) return null;
  const parts = [];
  // Split by lines first
  const lines = text.split("\n");
  lines.forEach((line, lineIdx) => {
    if (lineIdx > 0) parts.push(<br key={`br-${lineIdx}`} />);
    // Parse bold (**text**), italic (*text*), underline (__text__)
    const regex = /(\*\*(.+?)\*\*|\*(.+?)\*|__(.+?)__)/g;
    let lastIndex = 0;
    let match;
    while ((match = regex.exec(line)) !== null) {
      // Push text before match
      if (match.index > lastIndex) {
        parts.push(line.slice(lastIndex, match.index));
      }
      if (match[2]) {
        // **bold**
        parts.push(
          <strong key={`b-${lineIdx}-${match.index}`}>{match[2]}</strong>,
        );
      } else if (match[3]) {
        // *italic*
        parts.push(<em key={`i-${lineIdx}-${match.index}`}>{match[3]}</em>);
      } else if (match[4]) {
        // __underline__
        parts.push(<u key={`u-${lineIdx}-${match.index}`}>{match[4]}</u>);
      }
      lastIndex = match.index + match[0].length;
    }
    if (lastIndex < line.length) {
      parts.push(line.slice(lastIndex));
    }
  });
  return parts;
}
// READING PASSAGE FORM
function ReadingPassageForm({ data, onChange }) {
  const [showPreview, setShowPreview] = useState(false);
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Passage Text *
        </label>
        <textarea
          value={data.passage || ""}
          onChange={(e) => onChange({ ...data, passage: e.target.value })}
          className="w-full px-3 py-2 border rounded-lg text-sm font-mono min-h-[200px] resize-y"
          placeholder={
            "Enter passage text...\n\nFormatting:\n**bold text** → bold\n*italic text* → italic\n__underlined__ → underline\n\nLine breaks are preserved."
          }
        />
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setShowPreview(!showPreview)}
          className="text-xs text-blue-600 hover:underline"
        >
          {showPreview ? "Hide Preview" : "Show Preview"}
        </button>
        <span className="text-xs text-gray-400">
          Use **bold**, *italic*, __underline__
        </span>
      </div>
      {showPreview && data.passage && (
        <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
          <p className="text-xs font-semibold text-blue-600 mb-2 uppercase">
            Preview
          </p>
          <div className="text-sm text-gray-800 leading-relaxed">
            {parseFormattedText(data.passage)}
          </div>
        </div>
      )}
    </div>
  );
}

function ContentBlockForm({ data, onChange }) {
  const [showPreview, setShowPreview] = useState(false);
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Content *
        </label>
        <textarea
          value={data.content || ""}
          onChange={(e) => onChange({ ...data, content: e.target.value })}
          className="w-full px-3 py-2 border rounded-lg text-sm font-mono min-h-[200px] resize-y"
          placeholder={
            "Enter any content block text...\n\nFormatting:\n**bold text** → bold\n*italic text* → italic\n__underlined__ → underline\n\nLine breaks are preserved."
          }
        />
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setShowPreview(!showPreview)}
          className="text-xs text-blue-600 hover:underline"
        >
          {showPreview ? "Hide Preview" : "Show Preview"}
        </button>
        <span className="text-xs text-gray-400">
          Use **bold**, *italic*, __underline__
        </span>
      </div>
      {showPreview && data.content && (
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
          <p className="text-xs font-semibold text-slate-600 mb-2 uppercase">
            Preview
          </p>
          <div className="text-sm text-gray-800 leading-relaxed">
            {parseFormattedText(data.content)}
          </div>
        </div>
      )}
    </div>
  );
}

function CompositeQuestionForm({ data, onChange }) {
  const update = (key, val) => onChange({ ...data, [key]: val });
  const items = Array.isArray(data.items) ? data.items : [];
  const blankTag = (index) => {
    let value = index + 1;
    let label = "";
    while (value > 0) {
      const rem = (value - 1) % 26;
      label = String.fromCharCode(97 + rem) + label;
      value = Math.floor((value - 1) / 26);
    }
    return `(${label})`;
  };

  const updateItem = (idx, nextItem) => {
    const nextItems = [...items];
    nextItems[idx] = nextItem;
    update("items", nextItems);
  };

  const addItem = (type) => {
    const next =
      type === "option" || type === "dropdown"
        ? { type: "option", prompt: "", options: ["", ""], correct: 0 }
        : { type: "blank", prompt: "", correct: [""], placeholders: [""] };
    if (type === "dropdown") {
      next.type = "dropdown";
    }
    update("items", [...items, next]);
  };

  const addBlankAnswer = (itemIdx) => {
    const item = items[itemIdx];
    const nextCorrect = Array.isArray(item.correct)
      ? [...item.correct, ""]
      : ["", ""];
    const nextPlaceholders = Array.isArray(item.placeholders)
      ? [...item.placeholders, ""]
      : Array.from({ length: nextCorrect.length }, () => "");
    updateItem(itemIdx, {
      ...item,
      correct: nextCorrect,
      placeholders: nextPlaceholders,
    });
  };

  const updateBlankAnswer = (itemIdx, blankIdx, value) => {
    const item = items[itemIdx];
    const nextCorrect = Array.isArray(item.correct)
      ? [...item.correct]
      : [item.correct || ""];
    nextCorrect[blankIdx] = value;
    updateItem(itemIdx, { ...item, correct: nextCorrect });
  };

  const removeBlankAnswer = (itemIdx, blankIdx) => {
    const item = items[itemIdx];
    const nextCorrect = (
      Array.isArray(item.correct) ? item.correct : [item.correct || ""]
    ).filter((_, index) => index !== blankIdx);
    const nextPlaceholders = (
      Array.isArray(item.placeholders)
        ? item.placeholders
        : Array.from(
            {
              length: Array.isArray(item.correct)
                ? item.correct.length
                : [item.correct || ""].length,
            },
            () => "",
          )
    ).filter((_, index) => index !== blankIdx);
    updateItem(itemIdx, {
      ...item,
      correct: nextCorrect.length > 0 ? nextCorrect : [""],
      placeholders: nextPlaceholders.length > 0 ? nextPlaceholders : [""],
    });
  };

  const updateBlankPlaceholder = (itemIdx, blankIdx, value) => {
    const item = items[itemIdx];
    const currentLength = Array.isArray(item.correct)
      ? item.correct.length
      : [item.correct || ""].length;
    const nextPlaceholders = Array.isArray(item.placeholders)
      ? [...item.placeholders]
      : Array.from({ length: currentLength }, () => "");
    nextPlaceholders[blankIdx] = value;
    updateItem(itemIdx, { ...item, placeholders: nextPlaceholders });
  };

  const removeItem = (idx) => {
    update(
      "items",
      items.filter((_, i) => i !== idx),
    );
  };

  const updateItemOption = (itemIdx, optionIdx, value) => {
    const item = items[itemIdx];
    const options = [...(item.options || [])];
    options[optionIdx] = value;
    updateItem(itemIdx, { ...item, options });
  };

  const addItemOption = (itemIdx) => {
    const item = items[itemIdx];
    updateItem(itemIdx, { ...item, options: [...(item.options || []), ""] });
  };

  const removeItemOption = (itemIdx, optionIdx) => {
    const item = items[itemIdx];
    const options = (item.options || []).filter((_, i) => i !== optionIdx);
    const nextCorrect =
      typeof item.correct === "number" && item.correct >= options.length
        ? 0
        : item.correct;
    updateItem(itemIdx, { ...item, options, correct: nextCorrect });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Main Question
        </label>
        <textarea
          value={data.question || ""}
          onChange={(e) => update("question", e.target.value)}
          className="w-full px-3 py-2 border rounded-lg text-sm min-h-[88px]"
          placeholder="Instruction for this composite question"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Intro Text (optional)
        </label>
        <textarea
          value={data.intro_text || ""}
          onChange={(e) => update("intro_text", e.target.value)}
          className="w-full px-3 py-2 border rounded-lg text-sm min-h-[90px]"
          placeholder="Any context shown above the sub-questions"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Sub-question Numbering
        </label>
        <select
          value={data.numbering_style || "number"}
          onChange={(e) => update("numbering_style", e.target.value)}
          className="w-full px-3 py-2 border rounded-lg text-sm"
        >
          <option value="number">1, 2, 3</option>
          <option value="alphabet">a, b, c</option>
          <option value="none">No numbering</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Sub Questions
        </label>
        <div className="space-y-3">
          {items.map((item, idx) => {
            const isOption = item.type === "option";
            const isDropdown = item.type === "dropdown";
            return (
              <div
                key={idx}
                className="p-3 rounded-lg border border-gray-200 bg-gray-50"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-gray-500 uppercase">
                    Item {idx + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeItem(idx)}
                    className="text-red-400 hover:text-red-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
                  <div className="md:col-span-2">
                    <textarea
                      value={item.prompt || ""}
                      onChange={(e) =>
                        updateItem(idx, { ...item, prompt: e.target.value })
                      }
                      className="w-full px-3 py-2 border rounded-lg text-sm min-h-[72px]"
                      placeholder="Sub-question prompt"
                    />
                  </div>
                  <select
                    value={item.type || "blank"}
                    onChange={(e) => {
                      const nextType = e.target.value;
                      updateItem(
                        idx,
                        nextType === "option" || nextType === "dropdown"
                          ? {
                              type: nextType,
                              prompt: item.prompt || "",
                              options: ["", ""],
                              correct: 0,
                            }
                          : {
                              type: "blank",
                              prompt: item.prompt || "",
                              correct: [""],
                              placeholders: [""],
                            },
                      );
                    }}
                    className="px-3 py-2 border rounded-lg text-sm"
                  >
                    <option value="option">Options</option>
                    <option value="dropdown">Dropdown</option>
                    <option value="blank">Typing Blank</option>
                  </select>
                </div>

                {isOption || isDropdown ? (
                  <div className="space-y-2">
                    {isDropdown && (
                      <p className="text-xs text-gray-500">
                        Student will answer this using a dropdown.
                      </p>
                    )}
                    {(item.options || []).map((opt, optionIdx) => (
                      <div key={optionIdx} className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            updateItem(idx, {
                              ...item,
                              correct: optionIdx,
                            })
                          }
                          className={`w-5 h-5 rounded-full border-2 shrink-0 ${
                            item.correct === optionIdx
                              ? "border-green-500 bg-green-500"
                              : "border-gray-300"
                          }`}
                        />
                        <input
                          value={opt}
                          onChange={(e) =>
                            updateItemOption(idx, optionIdx, e.target.value)
                          }
                          className="flex-1 px-3 py-2 border rounded-lg text-sm"
                          placeholder={`Option ${optionIdx + 1}`}
                        />
                        {(item.options || []).length > 2 && (
                          <button
                            type="button"
                            onClick={() => removeItemOption(idx, optionIdx)}
                            className="text-red-400 hover:text-red-600"
                          >
                            <MinusCircle className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => addItemOption(idx)}
                      className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" /> Add option
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {(Array.isArray(item.correct)
                      ? item.correct
                      : [item.correct || ""]
                    ).map((blankAns, blankIdx) => (
                      <div key={blankIdx} className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-gray-500 w-8">
                          {blankTag(blankIdx)}
                        </span>
                        <input
                          value={blankAns}
                          onChange={(e) =>
                            updateBlankAnswer(idx, blankIdx, e.target.value)
                          }
                          className="flex-1 px-3 py-2 border rounded-lg text-sm"
                          placeholder={`Correct answer ${blankTag(blankIdx)}`}
                        />
                        <input
                          value={
                            Array.isArray(item.placeholders)
                              ? item.placeholders[blankIdx] || ""
                              : ""
                          }
                          onChange={(e) =>
                            updateBlankPlaceholder(
                              idx,
                              blankIdx,
                              e.target.value,
                            )
                          }
                          className="flex-1 px-3 py-2 border rounded-lg text-sm"
                          placeholder={`Placeholder ${blankTag(
                            blankIdx,
                          )} (default: Type your answer)`}
                        />
                        {(Array.isArray(item.correct)
                          ? item.correct
                          : [item.correct || ""]
                        ).length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeBlankAnswer(idx, blankIdx)}
                            className="text-red-400 hover:text-red-600"
                          >
                            <MinusCircle className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => addBlankAnswer(idx)}
                      className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" /> Add blank
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div className="flex gap-2 mt-3">
          <button
            type="button"
            onClick={() => addItem("option")}
            className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 px-3 py-1.5 rounded-lg font-medium flex items-center gap-1"
          >
            <Plus className="w-3 h-3" /> Add Options Item
          </button>
          <button
            type="button"
            onClick={() => addItem("dropdown")}
            className="text-xs bg-indigo-100 hover:bg-indigo-200 text-indigo-700 px-3 py-1.5 rounded-lg font-medium flex items-center gap-1"
          >
            <Plus className="w-3 h-3" /> Add Dropdown Item
          </button>
          <button
            type="button"
            onClick={() => addItem("blank")}
            className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg font-medium flex items-center gap-1"
          >
            <Plus className="w-3 h-3" /> Add Blank Item
          </button>
        </div>
      </div>
    </div>
  );
}

// QUESTION FORM ROUTER
function QuestionFormBuilder({ type, data, onChange }) {
  switch (type) {
    case "mcq_single":
      return <MCQSingleForm data={data} onChange={onChange} />;
    case "mcq_multi":
      return <MCQMultiForm data={data} onChange={onChange} />;
    case "composite_question":
      return <CompositeQuestionForm data={data} onChange={onChange} />;
    case "true_false":
      return <TrueFalseForm data={data} onChange={onChange} />;
    case "fill_typing":
      return <FillTypingForm data={data} onChange={onChange} />;
    case "fill_options":
      return <FillOptionsForm data={data} onChange={onChange} />;
    case "sentence_ordering":
      return <SentenceOrderingForm data={data} onChange={onChange} />;
    case "sentence_correction":
      return <SentenceCorrectionForm data={data} onChange={onChange} />;
    case "matching":
      return <MatchingForm data={data} onChange={onChange} />;
    case "dialogue_dropdown":
      return <DialogueDropdownForm data={data} onChange={onChange} />;
    case "page_break":
      return <PageBreakForm />;
    case "reading_passage":
      return <ReadingPassageForm data={data} onChange={onChange} />;
    case "content_block":
      return <ContentBlockForm data={data} onChange={onChange} />;
    case "audio_block":
      return <AudioBlockForm />;
    default:
      return <p className="text-gray-500 text-sm">Unsupported question type</p>;
  }
}

function SortableQuestionItem({ q, idx, qNum, onEdit, onDelete }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: q.question_id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : "auto",
  };
  const isPageBreak = q.question_type === "page_break";
  const isPassage = q.question_type === "reading_passage";
  const isContentBlock = q.question_type === "content_block";
  const isAudioBlock = q.question_type === "audio_block";
  // Page Break — render as a dashed divider
  if (isPageBreak) {
    return (
      <div ref={setNodeRef} style={style} className="flex items-center gap-2">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 text-gray-400 hover:text-gray-600 shrink-0"
        >
          <GripVertical className="w-4 h-4" />
        </button>
        <div className="flex-1 flex items-center gap-3">
          <div className="flex-1 border-t-2 border-dashed border-gray-300" />
          <span className="text-xs font-semibold text-gray-400 uppercase whitespace-nowrap flex items-center gap-1">
            <SeparatorHorizontal className="w-3.5 h-3.5" />
            Page Break
          </span>
          <div className="flex-1 border-t-2 border-dashed border-gray-300" />
        </div>
        <button
          onClick={onDelete}
          className="p-1.5 text-gray-400 hover:text-red-600 shrink-0"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }
  // Audio Block — amber styling with speaker icon
  if (isAudioBlock) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center justify-between"
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing p-1 text-gray-400 hover:text-gray-600 shrink-0"
          >
            <GripVertical className="w-4 h-4" />
          </button>
          <Volume2 className="w-4 h-4 text-amber-500 shrink-0" />
          <div className="min-w-0">
            <span className="text-xs font-semibold text-amber-600 uppercase">
              Audio Block
            </span>
            <p className="text-sm text-gray-500 truncate">
              {q.audio_url ? "Audio uploaded ✓" : "⚠ No audio uploaded"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={onEdit}
            className="p-1.5 text-gray-400 hover:text-amber-600"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 text-gray-400 hover:text-red-600"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }
  // Reading Passage — render with book icon
  if (isPassage) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center justify-between"
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing p-1 text-gray-400 hover:text-gray-600 shrink-0"
          >
            <GripVertical className="w-4 h-4" />
          </button>
          <BookOpen className="w-4 h-4 text-blue-500 shrink-0" />
          <div className="min-w-0">
            <span className="text-xs font-semibold text-blue-600 uppercase">
              Reading Passage
            </span>
            <p className="text-sm text-gray-600 truncate">
              {q.question_data?.passage?.slice(0, 80) || "Empty passage"}
              {(q.question_data?.passage?.length || 0) > 80 ? "…" : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={onEdit}
            className="p-1.5 text-gray-400 hover:text-blue-600"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 text-gray-400 hover:text-red-600"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }
  if (isContentBlock) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="bg-slate-50 border border-slate-200 rounded-lg p-3 flex items-center justify-between"
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing p-1 text-gray-400 hover:text-gray-600 shrink-0"
          >
            <GripVertical className="w-4 h-4" />
          </button>
          <FileText className="w-4 h-4 text-slate-500 shrink-0" />
          <div className="min-w-0">
            <span className="text-xs font-semibold text-slate-600 uppercase">
              Content Block
            </span>
            <p className="text-sm text-gray-600 truncate">
              {q.question_data?.content?.slice(0, 80) || "Empty content"}
              {(q.question_data?.content?.length || 0) > 80 ? "…" : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={onEdit}
            className="p-1.5 text-gray-400 hover:text-slate-600"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 text-gray-400 hover:text-red-600"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }
  // Normal question
  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-white border rounded-lg p-3 flex items-center justify-between"
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 text-gray-400 hover:text-gray-600 shrink-0"
        >
          <GripVertical className="w-4 h-4" />
        </button>
        <span className="text-xs font-bold text-gray-400 w-6">{qNum}</span>
        <div className="min-w-0">
          <span className="text-xs font-semibold text-blue-600 uppercase">
            {q.question_type.replace(/_/g, " ")}
          </span>
          <p className="text-sm text-gray-700 truncate">
            {q.question_data?.question ||
              q.question_data?.incorrect_sentence ||
              "Question"}
          </p>
        </div>
        {q.audio_url && (
          <Music className="w-3.5 h-3.5 text-purple-400 shrink-0" />
        )}
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <span className="text-xs text-gray-400 mr-2">{q.points} pt</span>
        <button
          onClick={onEdit}
          className="p-1.5 text-gray-400 hover:text-blue-600"
        >
          <Edit3 className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={onDelete}
          className="p-1.5 text-gray-400 hover:text-red-600"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

// MAIN COMPONENT
export default function AdminExamManager() {
  const [view, setView] = useState("list");
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedExam, setSelectedExam] = useState(null);
  const [examQuestions, setExamQuestions] = useState([]);
  const [error, setError] = useState("");

  const [newExam, setNewExam] = useState({
    title: "",
    description: "",
    proficiency_level: "A2",
    duration_minutes: 30,
    available_from: null,
    available_until: null,
  });

  const [qForm, setQForm] = useState({
    question_type: "mcq_single",
    question_data: getDefaultData("mcq_single"),
    points: 1,
  });
  const [audioFile, setAudioFile] = useState(null);
  const [audioLink, setAudioLink] = useState("");
  const [editingQuestionId, setEditingQuestionId] = useState(null);

  const [visData, setVisData] = useState({ batches: [], students: [] });
  const [batches, setBatches] = useState([]);
  const [selectedBatchIds, setSelectedBatchIds] = useState([]);
  const [submissions, setSubmissions] = useState([]);

  // Drag-and-drop sensors
  const dndSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  const handleDragEnd = async (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = examQuestions.findIndex(
      (q) => q.question_id === active.id,
    );
    const newIndex = examQuestions.findIndex((q) => q.question_id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = arrayMove(examQuestions, oldIndex, newIndex);
    setExamQuestions(reordered); // Optimistic update
    try {
      await reorderQuestions(
        selectedExam.test_id,
        reordered.map((q) => q.question_id),
      );
    } catch (err) {
      // Revert on failure
      setExamQuestions(examQuestions);
      setError("Failed to reorder questions");
    }
  };

  const fetchExams = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listExams();
      setExams(res.data?.exams || []);
    } catch (err) {
      setError("Failed to load exams");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchExams();
  }, [fetchExams]);

  // Helper: Convert datetime-local (browser local time) to UTC ISO string for the backend
  const toUTC = (datetimeLocal) => {
    if (!datetimeLocal) return null;
    // new Date("YYYY-MM-DDTHH:mm") treats it as local time in the browser
    return new Date(datetimeLocal).toISOString();
  };

  // Helper: Convert UTC ISO string from DB to datetime-local format (user's local time)
  const toLocalInput = (utcStr) => {
    if (!utcStr) return "";
    const normalized = String(utcStr).trim().replace(" ", "T");
    const hasTimezone = /Z$|[+-]\d{2}:\d{2}$/.test(normalized);
    const d = new Date(hasTimezone ? normalized : `${normalized}Z`);
    if (Number.isNaN(d.getTime())) return "";
    // Build YYYY-MM-DDTHH:mm in user's local timezone
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const hh = String(d.getHours()).padStart(2, "0");
    const min = String(d.getMinutes()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
  };

  const handleCreateExam = async () => {
    if (!newExam.title.trim() || !newExam.duration_minutes) return;
    setSaving(true);
    try {
      // Convert datetime-local IST to UTC before sending
      const payload = {
        ...newExam,
        available_from: toUTC(newExam.available_from),
        available_until: toUTC(newExam.available_until),
      };
      await createExam(payload);
      setNewExam({
        title: "",
        description: "",
        proficiency_level: "A2",
        duration_minutes: 30,
        available_from: null,
        available_until: null,
      });
      await fetchExams();
      setView("list");
    } catch (err) {
      setError(err.response?.data?.msg || "Failed to create exam");
    } finally {
      setSaving(false);
    }
  };

  const openDetail = async (exam) => {
    setLoading(true);
    try {
      const res = await getExamDetail(exam.test_id);
      setSelectedExam(res.data?.exam);
      setExamQuestions(res.data?.questions || []);
      setView("detail");
    } catch (err) {
      setError("Failed to load exam detail");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteExam = async (testId) => {
    if (
      !window.confirm(
        "Delete this exam? All questions and audio will be deleted.",
      )
    )
      return;
    try {
      await deleteExam(testId);
      await fetchExams();
    } catch (err) {
      setError("Failed to delete exam");
    }
  };

  const toggleResults = async () => {
    if (!selectedExam) return;
    try {
      const res = await updateExam(selectedExam.test_id, {
        results_visible: !selectedExam.results_visible,
      });
      setSelectedExam(res.data?.exam);
    } catch (err) {
      setError("Failed to toggle results");
    }
  };

  const toggleActive = async () => {
    if (!selectedExam) return;
    try {
      const res = await updateExam(selectedExam.test_id, {
        is_active: !selectedExam.is_active,
      });
      setSelectedExam(res.data?.exam);
      await fetchExams(); // Refresh list to show updated status
    } catch (err) {
      setError("Failed to toggle active status");
    }
  };

  // Edit exam settings
  const [showEditSettings, setShowEditSettings] = React.useState(false);
  const [editSettings, setEditSettings] = React.useState({});

  const openEditSettings = () => {
    // Convert DB UTC timestamps to user's local time for the datetime-local inputs
    setEditSettings({
      title: selectedExam.title || "",
      description: selectedExam.description || "",
      proficiency_level: selectedExam.proficiency_level || "A1",
      duration_minutes: selectedExam.duration_minutes || 30,
      available_from: toLocalInput(selectedExam.available_from),
      available_until: toLocalInput(selectedExam.available_until),
    });
    setShowEditSettings(true);
  };

  const handleSaveSettings = async () => {
    if (!editSettings.title?.trim()) {
      setError("Title is required");
      return;
    }
    if (!editSettings.duration_minutes || editSettings.duration_minutes < 1) {
      setError("Duration must be at least 1 minute");
      return;
    }
    setSaving(true);
    try {
      const res = await updateExam(selectedExam.test_id, {
        title: editSettings.title.trim(),
        description: editSettings.description || null,
        proficiency_level: editSettings.proficiency_level,
        duration_minutes: parseInt(editSettings.duration_minutes),
        available_from: toUTC(editSettings.available_from),
        available_until: toUTC(editSettings.available_until),
      });
      setSelectedExam(res.data?.exam);
      setShowEditSettings(false);
      await fetchExams();
    } catch (err) {
      setError(err.response?.data?.msg || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handleAddQuestion = async () => {
    if (!selectedExam) return;
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append("question_type", qForm.question_type);
      formData.append("question_data", JSON.stringify(qForm.question_data));
      formData.append("points", qForm.points);
      if (audioFile) formData.append("audio", audioFile);
      if (audioLink.trim()) formData.append("audio_url", audioLink.trim());
      await addQuestion(selectedExam.test_id, formData);
      setQForm({
        question_type: "mcq_single",
        question_data: getDefaultData("mcq_single"),
        points: 1,
      });
      setAudioFile(null);
      setAudioLink("");
      await openDetail(selectedExam);
    } catch (err) {
      setError(err.response?.data?.msg || "Failed to add question");
    } finally {
      setSaving(false);
    }
  };

  const handleEditQuestion = async () => {
    if (!selectedExam || !editingQuestionId) return;
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append("question_type", qForm.question_type);
      formData.append("question_data", JSON.stringify(qForm.question_data));
      formData.append("points", qForm.points);
      if (audioFile) formData.append("audio", audioFile);
      if (audioLink.trim()) formData.append("audio_url", audioLink.trim());
      await editQuestion(selectedExam.test_id, editingQuestionId, formData);
      setEditingQuestionId(null);
      setQForm({
        question_type: "mcq_single",
        question_data: getDefaultData("mcq_single"),
        points: 1,
      });
      setAudioFile(null);
      setAudioLink("");
      await openDetail(selectedExam);
    } catch (err) {
      setError(err.response?.data?.msg || "Failed to edit question");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteQuestion = async (questionId) => {
    if (!window.confirm("Delete this question?")) return;
    try {
      await deleteQuestion(selectedExam.test_id, questionId);
      await openDetail(selectedExam);
    } catch (err) {
      setError("Failed to delete question");
    }
  };

  const startEditQuestion = (q) => {
    setEditingQuestionId(q.question_id);
    setQForm({
      question_type: q.question_type,
      question_data: normalizeQuestionData(q.question_type, q.question_data),
      points: q.points,
    });
    setAudioFile(null);
    setAudioLink(q.audio_url || "");
    setView("edit_question");
  };

  const openVisibility = async () => {
    try {
      const [visRes, batchRes] = await Promise.all([
        getExamVisibility(selectedExam.test_id),
        listBatches(),
      ]);
      setVisData(visRes.data || { batches: [], students: [] });
      setBatches(batchRes.data?.batches || []);
      setSelectedBatchIds([]);
      setView("visibility");
    } catch (err) {
      setError("Failed to load visibility");
    }
  };

  const handleAddVisibility = async () => {
    if (selectedBatchIds.length === 0) return;
    try {
      await setExamVisibility(selectedExam.test_id, {
        batch_ids: selectedBatchIds,
      });
      const visRes = await getExamVisibility(selectedExam.test_id);
      setVisData(visRes.data || { batches: [], students: [] });
      setSelectedBatchIds([]);
    } catch (err) {
      setError("Failed to set visibility");
    }
  };

  const handleRemoveVis = async (visId) => {
    try {
      await removeExamVisibility(selectedExam.test_id, visId);
      const visRes = await getExamVisibility(selectedExam.test_id);
      setVisData(visRes.data || { batches: [], students: [] });
    } catch (err) {
      setError("Failed to remove visibility");
    }
  };

  const openSubmissions = async () => {
    try {
      const res = await getExamSubmissions(selectedExam.test_id);
      setSubmissions(res.data?.submissions || []);
      setView("submissions");
    } catch (err) {
      setError("Failed to load submissions");
    }
  };

  const handleReopen = async (submissionId) => {
    if (!window.confirm("Reopen this exam for the student?")) return;
    try {
      await reopenSubmission(submissionId);
      const res = await getExamSubmissions(selectedExam.test_id);
      setSubmissions(res.data?.submissions || []);
    } catch (err) {
      setError("Failed to reopen");
    }
  };

  const handleResetAndReopen = async (submissionId) => {
    if (
      !window.confirm(
        "Clear this submission completely and reopen for a fresh retest? This will delete all saved answers and reset timer/history.",
      )
    )
      return;
    try {
      await resetSubmissionForRetest(submissionId);
      const res = await getExamSubmissions(selectedExam.test_id);
      setSubmissions(res.data?.submissions || []);
    } catch (err) {
      setError(err.response?.data?.msg || "Failed to clear and reopen");
    }
  };

  if (loading && view === "list") {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl">
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
            <h1 className="text-2xl font-bold text-gray-900">Hardcore Exams</h1>
            <button
              onClick={() => setView("create")}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" /> Create Exam
            </button>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            </div>
          ) : exams.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              No exams created yet.
            </p>
          ) : (
            <div className="space-y-3">
              {exams.map((e) => (
                <div
                  key={e.test_id}
                  className="bg-white border rounded-lg p-4 flex items-center justify-between hover:shadow-sm"
                >
                  <div
                    className="cursor-pointer flex-1"
                    onClick={() => openDetail(e)}
                  >
                    <h3 className="font-semibold text-gray-900">{e.title}</h3>
                    <p className="text-sm text-gray-500">
                      {e.total_questions} questions • {e.duration_minutes} min
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-medium px-2 py-1 rounded ${
                        e.is_active
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {e.is_active ? "Active" : "Inactive"}
                    </span>
                    <button
                      onClick={() => handleDeleteExam(e.test_id)}
                      className="p-2 text-red-400 hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* CREATE */}
      {view === "create" && (
        <div>
          <button
            onClick={() => setView("list")}
            className="flex items-center gap-1 text-sm text-gray-500 mb-4"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <h2 className="text-xl font-bold text-gray-900 mb-4">Create Exam</h2>
          <div className="space-y-4 max-w-md">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Title *
              </label>
              <input
                value={newExam.title}
                onChange={(e) =>
                  setNewExam({ ...newExam, title: e.target.value })
                }
                className="w-full px-3 py-2 border rounded-lg text-sm"
                placeholder="e.g., A2 Final Exam"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={newExam.description}
                onChange={(e) =>
                  setNewExam({ ...newExam, description: e.target.value })
                }
                className="w-full px-3 py-2 border rounded-lg text-sm"
                rows={3}
              />
            </div>
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Level
                </label>
                <select
                  value={newExam.proficiency_level}
                  onChange={(e) =>
                    setNewExam({
                      ...newExam,
                      proficiency_level: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                >
                  <option value="Any">Any</option>
                  <option value="A1">A1</option>
                  <option value="A2">A2</option>
                  <option value="B1">B1</option>
                  <option value="B2">B2</option>
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Duration (min)
                </label>
                <input
                  type="number"
                  value={newExam.duration_minutes}
                  onChange={(e) =>
                    setNewExam({
                      ...newExam,
                      duration_minutes: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                  min={1}
                />
              </div>
            </div>
            <div className="flex gap-4 mt-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Available From
                </label>
                <input
                  type="datetime-local"
                  value={newExam.available_from || ""}
                  onChange={(e) =>
                    setNewExam({
                      ...newExam,
                      available_from: e.target.value || null,
                    })
                  }
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
                <p className="text-xs text-gray-400 mt-0.5">
                  Leave empty = available immediately
                </p>
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Available Until
                </label>
                <input
                  type="datetime-local"
                  value={newExam.available_until || ""}
                  onChange={(e) =>
                    setNewExam({
                      ...newExam,
                      available_until: e.target.value || null,
                    })
                  }
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
                <p className="text-xs text-gray-400 mt-0.5">
                  Leave empty = no end time
                </p>
              </div>
            </div>
            <button
              onClick={handleCreateExam}
              disabled={saving || !newExam.title.trim()}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold disabled:opacity-50 flex items-center gap-2"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}{" "}
              Create
            </button>
          </div>
        </div>
      )}

      {/* DETAIL */}
      {view === "detail" && selectedExam && (
        <div>
          <button
            onClick={() => {
              setView("list");
              fetchExams();
            }}
            className="flex items-center gap-1 text-sm text-gray-500 mb-4"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {selectedExam.title}
              </h2>
              <p className="text-sm text-gray-500">
                {selectedExam.total_questions} questions •{" "}
                {selectedExam.duration_minutes} min
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={openEditSettings}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200"
              >
                <Edit3 className="w-3 h-3" /> Edit Settings
              </button>
              <button
                onClick={toggleActive}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold ${
                  selectedExam.is_active
                    ? "bg-green-100 text-green-700"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                {selectedExam.is_active ? "Active" : "Inactive"}
              </button>
              <button
                onClick={toggleResults}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold ${
                  selectedExam.results_visible
                    ? "bg-green-100 text-green-700"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                {selectedExam.results_visible ? (
                  <Eye className="w-3 h-3" />
                ) : (
                  <EyeOff className="w-3 h-3" />
                )}
                {selectedExam.results_visible
                  ? "Results Visible"
                  : "Results Hidden"}
              </button>
              <button
                onClick={openVisibility}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-100 text-blue-700"
              >
                <Users className="w-3 h-3" /> Visibility
              </button>
              <button
                onClick={openSubmissions}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-purple-100 text-purple-700"
              >
                <Eye className="w-3 h-3" /> Submissions
              </button>
            </div>
          </div>

          {/* Edit Settings Panel */}
          {showEditSettings && (
            <div className="mb-5 p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-4">
              <h3 className="font-semibold text-gray-800 text-sm">
                Edit Exam Settings
              </h3>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  value={editSettings.title}
                  onChange={(e) =>
                    setEditSettings({ ...editSettings, title: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Description
                </label>
                <textarea
                  value={editSettings.description}
                  onChange={(e) =>
                    setEditSettings({
                      ...editSettings,
                      description: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                  rows={2}
                />
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Level
                  </label>
                  <select
                    value={editSettings.proficiency_level}
                    onChange={(e) =>
                      setEditSettings({
                        ...editSettings,
                        proficiency_level: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  >
                    <option value="Any">Any</option>
                    <option value="A1">A1</option>
                    <option value="A2">A2</option>
                    <option value="B1">B1</option>
                    <option value="B2">B2</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Duration (min) *
                  </label>
                  <input
                    type="number"
                    value={editSettings.duration_minutes}
                    onChange={(e) =>
                      setEditSettings({
                        ...editSettings,
                        duration_minutes: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                    min={1}
                  />
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Available From
                  </label>
                  <input
                    type="datetime-local"
                    value={editSettings.available_from}
                    onChange={(e) =>
                      setEditSettings({
                        ...editSettings,
                        available_from: e.target.value || null,
                      })
                    }
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  />
                  <p className="text-xs text-gray-400 mt-0.5">
                    Leave empty = available immediately
                  </p>
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Available Until
                  </label>
                  <input
                    type="datetime-local"
                    value={editSettings.available_until}
                    onChange={(e) =>
                      setEditSettings({
                        ...editSettings,
                        available_until: e.target.value || null,
                      })
                    }
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  />
                  <p className="text-xs text-gray-400 mt-0.5">
                    Leave empty = no end date
                  </p>
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={handleSaveSettings}
                  disabled={saving}
                  className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold disabled:opacity-50"
                >
                  {saving ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Save className="w-3.5 h-3.5" />
                  )}
                  Save
                </button>
                <button
                  onClick={() => setShowEditSettings(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm font-semibold hover:bg-gray-200"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div className="mb-4">
            <h3 className="font-semibold text-gray-700 mb-2">Questions</h3>
            {examQuestions.length === 0 ? (
              <p className="text-gray-400 text-sm py-4 text-center">
                No questions yet.
              </p>
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
                    {(() => {
                      let qCounter = 0;
                      const NON_Q = new Set([
                        "page_break",
                        "reading_passage",
                        "audio_block",
                        "content_block",
                      ]);
                      return examQuestions.map((q, idx) => {
                        const isNonQ = NON_Q.has(q.question_type);
                        if (!isNonQ) qCounter++;
                        const qNum = isNonQ ? null : qCounter;
                        return (
                          <SortableQuestionItem
                            key={q.question_id}
                            q={q}
                            idx={idx}
                            qNum={qNum}
                            onEdit={() => startEditQuestion(q)}
                            onDelete={() => handleDeleteQuestion(q.question_id)}
                          />
                        );
                      });
                    })()}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => {
                setQForm({
                  question_type: "mcq_single",
                  question_data: getDefaultData("mcq_single"),
                  points: 1,
                });
                setAudioFile(null);
                setAudioLink("");
                setEditingQuestionId(null);
                setView("add_question");
              }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" /> Add Question
            </button>
            <button
              onClick={async () => {
                setSaving(true);
                try {
                  const formData = new FormData();
                  formData.append("question_type", "page_break");
                  formData.append("question_data", JSON.stringify({}));
                  formData.append("points", 0);
                  await addQuestion(selectedExam.test_id, formData);
                  await openDetail(selectedExam);
                } catch (err) {
                  setError("Failed to add page break");
                } finally {
                  setSaving(false);
                }
              }}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-200 border border-gray-300"
            >
              <SeparatorHorizontal className="w-4 h-4" /> Add Page Break
            </button>
            <button
              onClick={() => {
                setQForm({
                  question_type: "audio_block",
                  question_data: getDefaultData("audio_block"),
                  points: 0,
                });
                setAudioFile(null);
                setAudioLink("");
                setEditingQuestionId(null);
                setView("add_question");
              }}
              className="flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-700 rounded-lg text-sm font-semibold hover:bg-amber-100 border border-amber-300"
            >
              <Volume2 className="w-4 h-4" /> Add Audio Block
            </button>
          </div>
        </div>
      )}

      {/* ADD / EDIT QUESTION — VISUAL BUILDER */}
      {(view === "add_question" || view === "edit_question") && (
        <div>
          <button
            onClick={() => setView("detail")}
            className="flex items-center gap-1 text-sm text-gray-500 mb-4"
          >
            <ArrowLeft className="w-4 h-4" /> Back to exam
          </button>
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            {view === "edit_question" ? "Edit Question" : "Add Question"}
          </h2>

          <div className="space-y-5 max-w-xl">
            {/* Type selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Question Type
              </label>
              <select
                value={qForm.question_type}
                onChange={(e) => {
                  const t = e.target.value;
                  setAudioFile(null);
                  setAudioLink("");
                  setQForm({
                    ...qForm,
                    question_type: t,
                    question_data: getDefaultData(t),
                  });
                }}
                className="w-full px-3 py-2 border rounded-lg text-sm font-medium"
              >
                {QUESTION_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Points (hide for page_break / reading_passage / audio_block / content_block) */}
            {qForm.question_type !== "page_break" &&
              qForm.question_type !== "reading_passage" &&
              qForm.question_type !== "audio_block" &&
              qForm.question_type !== "content_block" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Points
                  </label>
                  <input
                    type="number"
                    value={qForm.points}
                    onChange={(e) =>
                      setQForm({
                        ...qForm,
                        points: parseInt(e.target.value) || 1,
                      })
                    }
                    className="w-20 px-3 py-2 border rounded-lg text-sm"
                    min={1}
                  />
                </div>
              )}

            {/* Audio (hide for page_break / reading_passage / content_block) */}
            {qForm.question_type !== "page_break" &&
              qForm.question_type !== "reading_passage" &&
              qForm.question_type !== "content_block" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Audio (optional)
                  </label>
                  <input
                    type="file"
                    accept="audio/*"
                    onChange={(e) => setAudioFile(e.target.files[0])}
                    className="text-sm text-gray-600"
                  />
                  {audioFile && (
                    <p className="text-xs text-green-600 mt-1">
                      Selected: {audioFile.name}
                    </p>
                  )}
                  <div className="mt-2">
                    <div className="flex gap-2">
                      <input
                        type="url"
                        value={audioLink}
                        onChange={(e) => setAudioLink(e.target.value)}
                        className="flex-1 px-3 py-2 border rounded-lg text-sm"
                        placeholder="Or paste public audio link (Google Drive/public URL)"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          window.open(
                            audioLink.trim(),
                            "_blank",
                            "noopener,noreferrer",
                          )
                        }
                        disabled={!audioLink.trim()}
                        className="px-3 py-2 rounded-lg border text-sm font-medium text-blue-700 bg-blue-50 border-blue-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Test Link
                      </button>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      File upload or public link both supported.
                    </p>
                  </div>
                </div>
              )}

            {/* Divider */}
            <hr className="border-gray-200" />

            {/* Type-specific form */}
            <QuestionFormBuilder
              type={qForm.question_type}
              data={qForm.question_data}
              onChange={(newData) =>
                setQForm({ ...qForm, question_data: newData })
              }
            />

            {/* Submit */}
            <button
              onClick={
                view === "edit_question"
                  ? handleEditQuestion
                  : handleAddQuestion
              }
              disabled={saving}
              className="px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold disabled:opacity-50 flex items-center gap-2 mt-4"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {view === "edit_question" ? "Save Changes" : "Add Question"}
            </button>
          </div>
        </div>
      )}

      {/* VISIBILITY */}
      {view === "visibility" && (
        <div>
          <button
            onClick={() => setView("detail")}
            className="flex items-center gap-1 text-sm text-gray-500 mb-4"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Visibility — {selectedExam.title}
          </h2>
          <h3 className="font-semibold text-gray-700 mb-2">Assigned Batches</h3>
          {visData.batches?.length === 0 ? (
            <p className="text-gray-400 text-sm mb-4">
              No batches assigned yet.
            </p>
          ) : (
            <div className="space-y-2 mb-4">
              {visData.batches?.map((v) => (
                <div
                  key={v.id}
                  className="flex items-center justify-between bg-white border rounded-lg p-3"
                >
                  <span className="text-sm font-medium">{v.batch_name}</span>
                  <button
                    onClick={() => handleRemoveVis(v.id)}
                    className="text-red-400 hover:text-red-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-2 mb-4">
            <select
              multiple
              value={selectedBatchIds}
              onChange={(e) =>
                setSelectedBatchIds(
                  Array.from(e.target.selectedOptions, (o) =>
                    parseInt(o.value),
                  ),
                )
              }
              className="flex-1 px-3 py-2 border rounded-lg text-sm"
              size={Math.min(batches.length, 5)}
            >
              {batches.map((b) => (
                <option key={b.batch_id} value={b.batch_id}>
                  {b.batch_name} ({b.student_count} students)
                </option>
              ))}
            </select>
            <button
              onClick={handleAddVisibility}
              disabled={selectedBatchIds.length === 0}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold disabled:opacity-50"
            >
              Add
            </button>
          </div>
        </div>
      )}

      {/* SUBMISSIONS */}
      {view === "submissions" && (
        <div>
          <button
            onClick={() => setView("detail")}
            className="flex items-center gap-1 text-sm text-gray-500 mb-4"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Submissions — {selectedExam.title}
          </h2>
          {submissions.length === 0 ? (
            <p className="text-gray-400 text-sm py-4 text-center">
              No submissions yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left p-2">Student</th>
                    <th className="text-left p-2">Status</th>
                    <th className="text-left p-2">Score</th>
                    <th className="text-left p-2">Warnings</th>
                    <th className="text-left p-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {submissions.map((s) => (
                    <tr key={s.submission_id} className="border-b">
                      <td className="p-2">{s.fullname || s.username}</td>
                      <td className="p-2">
                        <span
                          className={`text-xs font-semibold px-2 py-0.5 rounded ${
                            s.status === "completed"
                              ? "bg-green-100 text-green-700"
                              : s.status === "in_progress"
                              ? "bg-yellow-100 text-yellow-700"
                              : s.status === "warned_out"
                              ? "bg-red-100 text-red-700"
                              : "bg-orange-100 text-orange-700"
                          }`}
                        >
                          {s.status}
                        </span>
                      </td>
                      <td className="p-2">
                        {s.score !== null
                          ? `${parseFloat(s.score).toFixed(0)}%`
                          : "—"}
                      </td>
                      <td className="p-2">{s.warning_count}/3</td>
                      <td className="p-2">
                        {(s.status === "warned_out" ||
                          s.status === "auto_closed" ||
                          s.status === "completed") && (
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => handleReopen(s.submission_id)}
                              className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                            >
                              <RefreshCw className="w-3 h-3" /> Reopen
                            </button>
                            <button
                              onClick={() =>
                                handleResetAndReopen(s.submission_id)
                              }
                              className="text-xs text-red-600 hover:underline flex items-center gap-1"
                            >
                              <Trash2 className="w-3 h-3" /> Clear & Reopen
                            </button>
                          </div>
                        )}
                        {s.status === "in_progress" && (
                          <button
                            onClick={() =>
                              handleResetAndReopen(s.submission_id)
                            }
                            className="text-xs text-red-600 hover:underline flex items-center gap-1"
                          >
                            <Trash2 className="w-3 h-3" /> Clear & Reopen
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
