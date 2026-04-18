import React, { useState, useEffect, useRef } from "react";
import { Check, X, ChevronRight } from "lucide-react";
import UmlautKeyboard from "./UmlautKeyboard";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragOverlay,
  pointerWithin,
  rectIntersection,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

function shuffleNonIdentity(items, identityRef = items) {
  const arr = Array.isArray(items) ? [...items] : [];
  if (arr.length <= 1) return arr;

  for (let attempt = 0; attempt < 8; attempt += 1) {
    arr.sort(() => Math.random() - 0.5);
    const changed = arr.some((item, idx) => item !== identityRef[idx]);
    if (changed) return [...arr];
  }

  const fallback = [...items];
  const first = fallback.shift();
  fallback.push(first);
  return fallback;
}

function normalizeBool(value) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const v = value.trim().toLowerCase();
    if (v === "true") return true;
    if (v === "false") return false;
  }
  if (typeof value === "number") {
    if (value === 1) return true;
    if (value === 0) return false;
  }
  return null;
}

function WordItem({ word, isDragging, isOverlay }) {
  return (
    <div
      className={`px-4 py-2.5 rounded-xl font-semibold text-base select-none touch-none transition-all ${
        isOverlay
          ? "bg-[#002856] text-white shadow-2xl scale-110 cursor-grabbing z-50"
          : isDragging
            ? "opacity-30 scale-95 bg-gray-200"
            : "bg-white text-[#002856] border-2 border-[#002856] shadow-sm cursor-grab active:cursor-grabbing hover:shadow-md hover:-translate-y-0.5"
      }`}
    >
      {word}
    </div>
  );
}

function DraggableWord({ id, word }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <WordItem word={word} isDragging={isDragging} />
    </div>
  );
}

function SentenceOrderingQuestion({
  question,
  onAnswer,
  showResult,
  isCorrect,
}) {
  const { question_data } = question;
  const [orderedWords, setOrderedWords] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [activeWord, setActiveWord] = useState(null);

  useEffect(() => {
    if (question_data?.words) {
      const shuffled = shuffleNonIdentity(
        question_data.words,
        question_data.correct_order || question_data.words,
      );
      setOrderedWords(shuffled);
    }
  }, [question_data]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 100, tolerance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const customCollisionDetection = (args) => {
    const pointer = pointerWithin(args);
    if (pointer.length > 0) return pointer;
    const rect = rectIntersection(args);
    if (rect.length > 0) return rect;
    return closestCenter(args);
  };

  const handleDragStart = (event) => {
    setActiveId(event.active.id);
    setActiveWord(orderedWords.find((w) => w === event.active.id));
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    setActiveId(null);
    setActiveWord(null);
    if (active.id !== over?.id && over) {
      const oldIndex = orderedWords.indexOf(active.id);
      const newIndex = orderedWords.indexOf(over.id);
      const newOrder = arrayMove(orderedWords, oldIndex, newIndex);
      setOrderedWords(newOrder);
      // Call onAnswer outside of setState callback to avoid "Cannot update while rendering" error
      setTimeout(() => onAnswer(newOrder), 0);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-lg font-medium text-gray-800 mb-2">
        Arrange the words to form a correct German sentence:
      </p>
      {question_data?.hint_en && (
        <div className="p-4 bg-blue-50 rounded-xl border border-blue-200 mb-4">
          <p className="text-sm font-medium text-blue-800">
            <span className="text-blue-600">English meaning: </span>"
            {question_data.hint_en}"
          </p>
        </div>
      )}
      <DndContext
        sensors={sensors}
        collisionDetection={customCollisionDetection}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={orderedWords}
          strategy={horizontalListSortingStrategy}
        >
          <div className="flex flex-wrap gap-3 p-4 bg-gray-50 rounded-xl min-h-[80px] border-2 border-dashed border-gray-200">
            {orderedWords.map((word) => (
              <DraggableWord key={word} id={word} word={word} />
            ))}
          </div>
        </SortableContext>
        <DragOverlay dropAnimation={null}>
          {activeId && activeWord ? (
            <WordItem word={activeWord} isOverlay={true} />
          ) : null}
        </DragOverlay>
      </DndContext>
      {showResult && (
        <div
          className={`p-4 rounded-xl ${
            isCorrect
              ? "bg-green-50 border border-green-200"
              : "bg-red-50 border border-red-200"
          }`}
        >
          <p
            className={`font-medium ${
              isCorrect ? "text-green-700" : "text-red-700"
            }`}
          >
            {isCorrect ? (
              "✓ Correct! Well done!"
            ) : (
              <>
                ✗ Not quite right.
                <br />
                <span className="text-sm text-green-600">
                  Correct sentence:{" "}
                  <strong className="text-green-600">
                    "
                    {Array.isArray(question_data?.correct_order)
                      ? typeof question_data.correct_order[0] === "number" &&
                        Array.isArray(question_data?.words)
                        ? question_data.correct_order
                            .map((i) => question_data.words[i])
                            .join(" ")
                        : question_data.correct_order.join(" ")
                      : question_data?.correct_sentence || "N/A"}
                    "
                  </strong>
                </span>
              </>
            )}
          </p>
        </div>
      )}
    </div>
  );
}

// MATCHING: Two-column, NO auto-validation, blue selection only, green/red ONLY after submit
function MatchingQuestion({
  question,
  onAnswer,
  showResult,
  isCorrect,
  userAnswer,
}) {
  const { question_data } = question;
  const [selected, setSelected] = useState(null);
  const [leftItems, setLeftItems] = useState([]);
  const [rightItems, setRightItems] = useState([]);
  const [matches, setMatches] = useState({});
  const [arrows, setArrows] = useState([]);

  const containerRef = useRef(null);
  const leftRefs = useRef([]);
  const rightRefs = useRef([]);

  useEffect(() => {
    let left = [];
    let right = [];

    if (question_data?.pairs && Array.isArray(question_data.pairs)) {
      left = question_data.pairs.map((p, i) => ({
        id: i,
        text: p.de || p.left || p.german || String(p),
      }));
      right = question_data.pairs.map((p, i) => ({
        id: i,
        text: p.en || p.right || p.english || String(p),
        correctIdx: i,
      }));
    } else if (question_data?.left_items && question_data?.right_items) {
      left = question_data.left_items.map((text, i) => ({ id: i, text }));
      const correctPairs =
        question_data.correct_pairs || question_data.right_items;
      right = question_data.right_items.map((text, i) => ({
        id: i,
        text,
        correctIdx: correctPairs ? correctPairs.indexOf(text) : i,
      }));
    } else if (question_data?.items && Array.isArray(question_data.items)) {
      left = question_data.items.map((item, i) => ({
        id: i,
        text: item.left || item.de || item.german,
      }));
      right = question_data.items.map((item, i) => ({
        id: i,
        text: item.right || item.en || item.english,
        correctIdx: i,
      }));
    }

    const shuffledRight = shuffleNonIdentity(right, right);

    setLeftItems(left);
    setRightItems(shuffledRight);
    setMatches({});
    setSelected(null);
    setArrows([]);
  }, [question_data]);

  // Recalculate arrow positions whenever matches change
  useEffect(() => {
    if (!containerRef.current) return;
    const containerRect = containerRef.current.getBoundingClientRect();
    const newArrows = [];

    Object.entries(matches).forEach(([leftIdxStr, rightIdx]) => {
      const leftIdx = parseInt(leftIdxStr);
      const leftEl = leftRefs.current[leftIdx];
      const rightEl = rightRefs.current[rightIdx];
      if (!leftEl || !rightEl) return;

      const lr = leftEl.getBoundingClientRect();
      const rr = rightEl.getBoundingClientRect();

      newArrows.push({
        leftIdx,
        rightIdx,
        x1: lr.right - containerRect.left,
        y1: lr.top + lr.height / 2 - containerRect.top,
        x2: rr.left - containerRect.left,
        y2: rr.top + rr.height / 2 - containerRect.top,
      });
    });

    setArrows(newArrows);
  }, [matches]);

  const handleLeftClick = (idx) => {
    if (showResult) return;
    setSelected(
      selected?.type === "left" && selected?.idx === idx
        ? null
        : { type: "left", idx },
    );
  };

  const handleRightClick = (idx) => {
    if (showResult) return;
    if (selected?.type === "left") {
      const newMatches = { ...matches, [selected.idx]: idx };
      setMatches(newMatches);
      const answer = Object.entries(newMatches).map(([li, ri]) => ({
        de: leftItems[parseInt(li)]?.text,
        en: rightItems[ri]?.text,
      }));
      onAnswer(answer);
      setSelected(null);
    } else {
      setSelected(
        selected?.type === "right" && selected?.idx === idx
          ? null
          : { type: "right", idx },
      );
    }
  };

  const getMatchStatus = (leftIdx) => {
    if (!showResult) return null;
    const rightIdx = matches[leftIdx];
    if (rightIdx === undefined) return "unanswered";
    return rightItems[rightIdx]?.correctIdx === leftIdx
      ? "correct"
      : "incorrect";
  };

  return (
    <div className="space-y-4">
      <p className="text-lg font-medium text-gray-800 mb-2">Match the items:</p>
      <p className="text-xs text-gray-500 mb-4">
        Tap a word on the left, then its match on the right
      </p>

      <div ref={containerRef} className="relative flex gap-1 overflow-hidden">
        {/* Left Column (German) */}
        <div className="flex-1 min-w-0 space-y-2">
          <p className="text-xs font-bold text-gray-400 uppercase text-center mb-2">
            German
          </p>
          {leftItems.map((item, idx) => {
            const isSelected =
              selected?.type === "left" && selected?.idx === idx;
            const isMatched = matches[idx] !== undefined;
            const status = getMatchStatus(idx);

            return (
              <button
                key={idx}
                ref={(el) => {
                  leftRefs.current[idx] = el;
                }}
                onClick={() => handleLeftClick(idx)}
                disabled={showResult}
                className={`w-full px-3 py-3 rounded-xl font-semibold text-sm transition-all border-2 text-left break-words ${
                  showResult
                    ? status === "correct"
                      ? "border-green-500 bg-green-50 text-green-700"
                      : status === "incorrect"
                        ? "border-red-500 bg-red-50 text-red-700"
                        : "border-gray-200 bg-gray-50 text-gray-500"
                    : isSelected
                      ? "border-[#002856] bg-[#002856] text-white shadow-md"
                      : isMatched
                        ? "border-[#002856]/40 bg-[#edfaff] text-[#002856]"
                        : "border-gray-200 bg-white hover:border-gray-300"
                }`}
              >
                {item.text}
              </button>
            );
          })}
        </div>

        {/* Middle spacer (where arrows pass through) */}
        <div className="w-10 flex-shrink-0" />

        {/* Right Column (English) */}
        <div className="flex-1 min-w-0 space-y-2">
          <p className="text-xs font-bold text-gray-400 uppercase text-center mb-2">
            English
          </p>
          {rightItems.map((item, idx) => {
            const isSelected =
              selected?.type === "right" && selected?.idx === idx;
            const isMatched = Object.values(matches).includes(idx);
            const matchedLeftIdx = Object.entries(matches).find(
              ([, r]) => r === idx,
            )?.[0];
            const status =
              showResult && matchedLeftIdx !== undefined
                ? item.correctIdx === parseInt(matchedLeftIdx)
                  ? "correct"
                  : "incorrect"
                : null;

            return (
              <button
                key={idx}
                ref={(el) => {
                  rightRefs.current[idx] = el;
                }}
                onClick={() => handleRightClick(idx)}
                disabled={showResult}
                className={`w-full px-3 py-3 rounded-xl font-semibold text-sm transition-all border-2 text-left break-words ${
                  showResult
                    ? status === "correct"
                      ? "border-green-500 bg-green-50 text-green-700"
                      : status === "incorrect"
                        ? "border-red-500 bg-red-50 text-red-700"
                        : "border-gray-200 bg-gray-50 text-gray-500"
                    : isSelected
                      ? "border-[#002856] bg-[#002856] text-white shadow-md"
                      : isMatched
                        ? "border-[#002856]/40 bg-[#edfaff] text-[#002856]"
                        : "border-gray-200 bg-white hover:border-gray-300"
                }`}
              >
                {item.text}
              </button>
            );
          })}
        </div>

        {/* SVG Arrow Overlay */}
        <svg
          className="absolute inset-0 pointer-events-none"
          style={{ width: "100%", height: "100%", overflow: "visible" }}
        >
          <defs>
            <marker
              id="qr-arrow-navy"
              markerWidth="6"
              markerHeight="6"
              refX="6"
              refY="3"
              orient="auto"
            >
              <polygon points="0,0 6,3 0,6" fill="#002856" />
            </marker>
            <marker
              id="qr-arrow-correct"
              markerWidth="6"
              markerHeight="6"
              refX="6"
              refY="3"
              orient="auto"
            >
              <polygon points="0,0 6,3 0,6" fill="#16a34a" />
            </marker>
            <marker
              id="qr-arrow-incorrect"
              markerWidth="6"
              markerHeight="6"
              refX="6"
              refY="3"
              orient="auto"
            >
              <polygon points="0,0 6,3 0,6" fill="#dc2626" />
            </marker>
          </defs>
          <style>{`
            @keyframes qr-fade {
              from { opacity: 0; transform: scale(0.92); }
              to   { opacity: 1; transform: scale(1); }
            }
          `}</style>
          {arrows.map(({ leftIdx, x1, y1, x2, y2 }) => {
            const status = getMatchStatus(leftIdx);
            const markerId = showResult
              ? status === "correct"
                ? "qr-arrow-correct"
                : "qr-arrow-incorrect"
              : "qr-arrow-navy";
            const color = showResult
              ? status === "correct"
                ? "#16a34a"
                : "#dc2626"
              : "#002856";
            return (
              <g
                key={leftIdx}
                style={{ animation: "qr-fade 0.2s ease-out both" }}
              >
                <line
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke={color}
                  strokeWidth="1.5"
                  strokeOpacity="0.85"
                  markerEnd={`url(#${markerId})`}
                />
                <circle cx={x1} cy={y1} r="3.5" fill={color} />
              </g>
            );
          })}
        </svg>
      </div>

      {/* Correct answer review — shown after Check Answer */}
      {showResult && (
        <div className="mt-4 rounded-xl border border-[#002856]/20 overflow-hidden">
          <div className="px-4 py-2 bg-[#edfaff] border-b border-[#002856]/10">
            <p className="text-xs font-bold text-[#002856] uppercase tracking-wider">
              Correct Pairs
            </p>
          </div>
          <div className="divide-y divide-[#002856]/10">
            {leftItems.map((leftItem, leftIdx) => {
              const correctRightItem = rightItems.find(
                (r) => r.correctIdx === leftIdx,
              );
              return (
                <div
                  key={leftIdx}
                  className="flex items-center gap-2 px-4 py-2.5 bg-[#edfaff]/60"
                >
                  <span className="text-sm font-semibold text-[#002856] flex-1">
                    {leftItem.text}
                  </span>
                  <span className="text-[#002856]/40 text-xs">→</span>
                  <span className="text-sm text-[#002856] flex-1 text-right">
                    {correctRightItem?.text ?? "—"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function QuestionRenderer({
  question,
  onAnswer,
  showResult,
  userAnswer,
  isCorrect,
}) {
  const { question_type, question_data } = question;
  const [localAnswer, setLocalAnswer] = useState(userAnswer ?? null);

  useEffect(() => {
    setLocalAnswer(userAnswer ?? null);
  }, [userAnswer]);

  const handleSelect = (value) => {
    setLocalAnswer(value);
    onAnswer(value);
  };

  const handleMultiSelect = (value) => {
    // FIX: Ensure localAnswer is always an array for multi-select
    const current = Array.isArray(localAnswer) ? localAnswer : [];
    const updated = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    setLocalAnswer(updated);
    onAnswer(updated);
  };

  const getQuestionText = () =>
    question_data?.question ||
    question_data?.text ||
    question_data?.prompt ||
    "";
  const getOptions = () => question_data?.options || [];
  const getCorrectAnswer = () => {
    // Check for string correct answers first
    if (question_data && question_data.correct !== undefined)
      return question_data.correct;
    if (question_data && question_data.correct_answer !== undefined)
      return question_data.correct_answer;
    if (question_data && question_data.correctAnswer !== undefined)
      return question_data.correctAnswer;
    // Handle correct_answers array (fill_blank_typing uses this)
    if (Array.isArray(question_data?.correct_answers)) {
      return question_data.correct_answers.join(" / ");
    }
    return "";
  };

  switch (question_type) {
    case "mcq_single":
    case "mcq":
      return (
        <div className="space-y-3">
          <p className="text-lg font-medium text-gray-800 mb-4">
            {getQuestionText()}
          </p>
          {getOptions().map((option, idx) => (
            <button
              key={idx}
              onClick={() => !showResult && handleSelect(option)}
              disabled={showResult}
              className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                localAnswer === option
                  ? showResult
                    ? isCorrect
                      ? "border-green-500 bg-green-50"
                      : "border-red-500 bg-red-50"
                    : "border-[#002856] bg-[#edfaff]"
                  : showResult && option === getCorrectAnswer()
                    ? "border-green-500 bg-green-50"
                    : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <div className="flex items-center justify-between">
                <span>{option}</span>
                {showResult &&
                  localAnswer === option &&
                  (isCorrect ? (
                    <Check className="w-5 h-5 text-green-500" />
                  ) : (
                    <X className="w-5 h-5 text-red-500" />
                  ))}
                {showResult && !isCorrect && option === getCorrectAnswer() && (
                  <Check className="w-5 h-5 text-green-500" />
                )}
              </div>
            </button>
          ))}
        </div>
      );

    case "mcq_multi":
      // FIX: Ensure we use array safely
      const multiAnswer = Array.isArray(localAnswer) ? localAnswer : [];
      return (
        <div className="space-y-3">
          <p className="text-lg font-medium text-gray-800 mb-2">
            {getQuestionText()}
          </p>
          <p className="text-sm text-gray-500 mb-4">Select all that apply</p>
          {getOptions().map((option, idx) => {
            // For mcq_multi, correct may be indices or values
            const correctArr = question_data?.correct || [];
            const isCorrectOption =
              Array.isArray(correctArr) &&
              (correctArr.includes(option) ||
                correctArr.includes(idx) ||
                correctArr.includes(String(idx)));

            return (
              <button
                key={idx}
                onClick={() => !showResult && handleMultiSelect(option)}
                disabled={showResult}
                className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                  multiAnswer.includes(option)
                    ? showResult
                      ? isCorrectOption
                        ? "border-green-500 bg-green-50"
                        : "border-red-500 bg-red-50"
                      : "border-[#002856] bg-[#edfaff]"
                    : showResult && isCorrectOption
                      ? "border-green-500 bg-green-50"
                      : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                      multiAnswer.includes(option)
                        ? showResult
                          ? isCorrectOption
                            ? "border-green-500 bg-green-500"
                            : "border-red-500 bg-red-500"
                          : "border-[#002856] bg-[#002856]"
                        : "border-gray-300"
                    }`}
                  >
                    {multiAnswer.includes(option) && (
                      <Check className="w-3 h-3 text-white" />
                    )}
                    {showResult &&
                      isCorrectOption &&
                      !multiAnswer.includes(option) && (
                        <Check className="w-3 h-3 text-green-500" />
                      )}
                  </div>
                  <span>{option}</span>
                  {showResult && isCorrectOption && (
                    <span className="ml-auto text-xs text-green-600 font-medium">
                      ✓ Correct
                    </span>
                  )}
                </div>
              </button>
            );
          })}
          {showResult && !isCorrect && (
            <p className="text-sm text-gray-600 mt-2">
              Correct answers:{" "}
              <span className="font-semibold text-green-600">
                {(() => {
                  const correctArr = question_data?.correct || [];
                  const opts = question_data?.options || [];
                  if (typeof correctArr[0] === "number") {
                    return correctArr
                      .map((i) => opts[i] || `[${i}]`)
                      .join(", ");
                  }
                  return correctArr.join(", ");
                })()}
              </span>
            </p>
          )}
        </div>
      );

    case "true_false":
    case "truefalse": {
      const normalizedCorrect = normalizeBool(getCorrectAnswer());
      return (
        <div className="space-y-4">
          <p className="text-lg font-medium text-gray-800 mb-4">
            {getQuestionText()}
          </p>
          <div className="flex gap-4">
            {[true, false].map((value) => {
              const isSelected = normalizeBool(localAnswer) === value;
              const isCorrectOption = normalizedCorrect === value;

              return (
                <button
                  key={String(value)}
                  onClick={() => !showResult && handleSelect(value)}
                  disabled={showResult}
                  className={`flex-1 p-4 rounded-xl border-2 font-semibold transition-all ${
                    isSelected
                      ? showResult
                        ? isCorrectOption
                          ? "border-green-500 bg-green-50 text-green-700"
                          : "border-red-500 bg-red-50 text-red-700"
                        : "border-[#002856] bg-[#edfaff] text-[#002856]"
                      : showResult && isCorrectOption
                        ? "border-green-500 bg-green-50 text-green-700"
                        : "border-gray-200 hover:border-gray-300 text-gray-600"
                  }`}
                >
                  {value ? "True" : "False"}
                </button>
              );
            })}
          </div>
        </div>
      );
    }

    case "fill_typing":
    case "fill_blank_typing": {
      const fillInputId = `qr-fill-${question_type}-${
        question_data?.question?.slice(0, 10) || Math.random()
      }`;
      return (
        <div className="space-y-4">
          <p className="text-lg font-medium text-gray-800">
            {getQuestionText()}
          </p>
          {question_data?.explanation && (
            <p className="text-sm text-gray-500 italic">
              {question_data.explanation}
            </p>
          )}
          <input
            id={fillInputId}
            type="text"
            value={localAnswer || ""}
            onChange={(e) => {
              setLocalAnswer(e.target.value);
              onAnswer(e.target.value);
            }}
            disabled={showResult}
            placeholder="Type your answer..."
            className={`w-full p-4 rounded-xl border-2 text-lg ${
              showResult
                ? isCorrect
                  ? "border-green-500 bg-green-50"
                  : "border-red-500 bg-red-50"
                : "border-gray-200 focus:border-[#002856] focus:outline-none"
            }`}
          />
          {!showResult && (
            <UmlautKeyboard
              onInsert={(char) => {
                const input = document.getElementById(fillInputId);
                const current = localAnswer || "";
                if (!input) {
                  const newVal = current + char;
                  setLocalAnswer(newVal);
                  onAnswer(newVal);
                  return;
                }
                const start = input.selectionStart ?? current.length;
                const end = input.selectionEnd ?? start;
                const newVal =
                  current.slice(0, start) + char + current.slice(end);
                setLocalAnswer(newVal);
                onAnswer(newVal);
                requestAnimationFrame(() => {
                  input.focus();
                  input.setSelectionRange(
                    start + char.length,
                    start + char.length,
                  );
                });
              }}
            />
          )}
          {showResult && !isCorrect && (
            <p className="text-sm text-gray-600">
              Correct answer:{" "}
              <span className="font-semibold text-green-600">
                {getCorrectAnswer()}
              </span>
            </p>
          )}
        </div>
      );
    }

    case "fill_options":
    case "fill_blank_options":
      return (
        <div className="space-y-4">
          <p className="text-lg font-medium text-gray-800">
            {getQuestionText()}
          </p>
          {question_data?.explanation && (
            <p className="text-sm text-gray-500 italic mb-4">
              {question_data.explanation}
            </p>
          )}
          <div className="space-y-2">
            {getOptions().map((option, idx) => (
              <button
                key={idx}
                onClick={() => !showResult && handleSelect(option)}
                disabled={showResult}
                className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                  localAnswer === option
                    ? showResult
                      ? isCorrect
                        ? "border-green-500 bg-green-50 text-green-700"
                        : "border-red-500 bg-red-50 text-red-700"
                      : "border-[#002856] bg-[#edfaff] text-[#002856]"
                    : showResult && option === getCorrectAnswer()
                      ? "border-green-500 bg-green-50 text-green-700"
                      : "border-gray-200 bg-gray-50 hover:border-gray-300"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span>{option}</span>
                  {showResult &&
                    localAnswer === option &&
                    (isCorrect ? (
                      <Check className="w-5 h-5 text-green-500" />
                    ) : (
                      <X className="w-5 h-5 text-red-500" />
                    ))}
                  {showResult &&
                    !isCorrect &&
                    option === getCorrectAnswer() && (
                      <Check className="w-5 h-5 text-green-500" />
                    )}
                </div>
              </button>
            ))}
          </div>
        </div>
      );

    case "sentence_reorder":
    case "sentence_ordering":
      return (
        <SentenceOrderingQuestion
          question={question}
          onAnswer={onAnswer}
          showResult={showResult}
          isCorrect={isCorrect}
        />
      );

    case "sentence_correction": {
      const incorrectText =
        question_data?.incorrect_sentence ||
        question_data?.incorrect ||
        question_data?.sentence ||
        question_data?.question ||
        "";
      const correctText =
        question_data?.correct_sentence || question_data?.correct || "";
      const hintText = question_data?.hint_en || question_data?.hint || "";
      const corrInputId = `qr-correction-${incorrectText
        .slice(0, 10)
        .replace(/\s/g, "")}`;

      return (
        <div className="space-y-4">
          <p className="text-lg font-medium text-gray-800">
            Correct this sentence:
          </p>
          <div className="p-4 bg-red-50 rounded-xl border-2 border-red-200">
            <p className="text-red-800 font-medium">{incorrectText}</p>
          </div>
          {hintText && (
            <p className="text-sm text-gray-500">Hint: {hintText}</p>
          )}
          <input
            id={corrInputId}
            type="text"
            value={localAnswer || ""}
            onChange={(e) => {
              setLocalAnswer(e.target.value);
              onAnswer(e.target.value);
            }}
            disabled={showResult}
            placeholder="Type the corrected sentence..."
            className={`w-full p-4 rounded-xl border-2 text-lg ${
              showResult
                ? isCorrect
                  ? "border-green-500 bg-green-50"
                  : "border-red-500 bg-red-50"
                : "border-gray-200 focus:border-[#002856] focus:outline-none"
            }`}
          />
          {!showResult && (
            <UmlautKeyboard
              onInsert={(char) => {
                const input = document.getElementById(corrInputId);
                const current = localAnswer || "";
                if (!input) {
                  const newVal = current + char;
                  setLocalAnswer(newVal);
                  onAnswer(newVal);
                  return;
                }
                const start = input.selectionStart ?? current.length;
                const end = input.selectionEnd ?? start;
                const newVal =
                  current.slice(0, start) + char + current.slice(end);
                setLocalAnswer(newVal);
                onAnswer(newVal);
                requestAnimationFrame(() => {
                  input.focus();
                  input.setSelectionRange(
                    start + char.length,
                    start + char.length,
                  );
                });
              }}
            />
          )}
          {showResult && !isCorrect && (
            <p className="text-sm text-gray-600">
              Correct:{" "}
              <span className="font-semibold text-green-600">
                {correctText}
              </span>
            </p>
          )}
        </div>
      );
    }

    case "matching":
      return (
        <MatchingQuestion
          question={question}
          onAnswer={onAnswer}
          showResult={showResult}
          isCorrect={isCorrect}
          userAnswer={userAnswer}
        />
      );

    default:
      return (
        <div className="p-4 bg-yellow-50 rounded-xl border border-yellow-200">
          <p className="text-yellow-800 font-medium">
            Unknown question type: {question_type}
          </p>
          <p className="text-sm text-yellow-600 mt-2">
            Data: {JSON.stringify(question_data).slice(0, 200)}...
          </p>
        </div>
      );
  }
}
