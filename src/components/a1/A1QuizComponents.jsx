import React, { useState, useEffect, useRef } from "react";
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

// DnD Word Component
export function WordItem({ word, isDragging, isOverlay }) {
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

export function DraggableWord({ id, word }) {
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

// Sentence Reorder Question Removed
// Matching Question
export function QuizMatching({ question, value, onChange, showResult }) {
  const { question_data } = question;
  const leftItems = question_data?.left_items || [];
  const rightItemsRaw = question_data?.right_items || [];
  const correctPairs = question_data?.correct_pairs || rightItemsRaw;

  const hasImages = leftItems.some(
    (i) => typeof i === "string" && i.startsWith("http"),
  );

  const [rightItems] = useState(() =>
    [...rightItemsRaw].sort(() => Math.random() - 0.5),
  );
  const [selected, setSelected] = useState(null);
  const [matches, setMatches] = useState({});
  const [arrows, setArrows] = useState([]);

  const containerRef = useRef(null);
  const leftRefs = useRef([]);
  const rightRefs = useRef([]);

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
  }, [matches, showResult, leftItems, rightItems]);

  const handleLeftClick = (idx) => {
    if (showResult) return;
    setSelected(
      selected?.type === "left" && selected?.idx === idx
        ? null
        : { type: "left", idx },
    );
  };

  const handleRightClick = (rightIdx) => {
    if (showResult) return;
    if (selected?.type === "left") {
      const newMatches = { ...matches, [selected.idx]: rightIdx };
      setMatches(newMatches);
      const answer = Object.entries(newMatches).map(([li, ri]) => ({
        left: leftItems[parseInt(li)],
        right: rightItems[ri],
      }));
      onChange(answer);
      setSelected(null);
    } else {
      setSelected(
        selected?.type === "right" && selected?.idx === rightIdx
          ? null
          : { type: "right", idx: rightIdx },
      );
    }
  };

  const getMatchStatus = (leftIdx) => {
    if (!showResult) return null;
    const rightIdx = matches[leftIdx];
    if (rightIdx === undefined) return "unanswered";
    return rightItems[rightIdx] === correctPairs[leftIdx]
      ? "correct"
      : "incorrect";
  };

  const renderContent = (item) => {
    if (typeof item === "string" && item.startsWith("http")) {
      return (
        <div className="w-full h-[100px] rounded-[10px] overflow-hidden bg-gray-50 flex items-center justify-center">
          <img
            src={item}
            alt="Matching"
            className="max-w-full max-h-full object-contain pointer-events-none"
          />
        </div>
      );
    }
    return <span className="pointer-events-none text-[15px]">{item}</span>;
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-500">
        Tap an item on the left, then its match on the right
      </p>
      <div ref={containerRef} className="relative flex gap-1 overflow-hidden">
        {/* Left Column */}
        <div className="flex-1 min-w-0 space-y-2 relative z-10">
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
                className={`w-full transition-all border-2 text-left break-words ${
                  hasImages
                    ? `min-h-[108px] rounded-2xl flex items-center font-semibold ${
                        typeof item === "string" && item.startsWith("http")
                          ? "p-1.5"
                          : "px-5 py-4"
                      }`
                    : "px-4 py-3 rounded-xl font-semibold text-sm"
                } ${
                  showResult
                    ? status === "correct"
                      ? "border-[#adebb8] bg-[#f0fdf4] text-[#166534]"
                      : status === "incorrect"
                        ? "border-[#fecaca] bg-[#fef2f2] text-[#991b1b]"
                        : "border-[#e5e7eb] bg-[#f9fafb] text-[#6b7280]"
                    : isSelected
                      ? "border-[#002856] bg-[#002856] text-white shadow-lg relative z-20 scale-[1.02]"
                      : isMatched
                        ? "border-[#002856]/30 bg-[#f0f7ff] text-[#002856]"
                        : "border-[#e5e7eb] bg-white hover:border-[#d1d5db] hover:bg-gray-50 relative z-20"
                }`}
              >
                {renderContent(item)}
              </button>
            );
          })}
        </div>

        {/* Middle spacer */}
        <div
          className={`${
            hasImages ? "w-16" : "w-10"
          } flex-shrink-0 relative z-0`}
        />

        {/* Right Column */}
        <div className="flex-1 min-w-0 space-y-2 relative z-10">
          {rightItems.map((item, idx) => {
            const isSelected =
              selected?.type === "right" && selected?.idx === idx;
            const isMatched = Object.values(matches).includes(idx);
            const matchedLeftIdx = Object.entries(matches).find(
              ([, r]) => r === idx,
            )?.[0];
            const status =
              showResult && matchedLeftIdx !== undefined
                ? rightItems[idx] === correctPairs[parseInt(matchedLeftIdx)]
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
                className={`w-full transition-all border-2 text-left break-words ${
                  hasImages
                    ? `min-h-[108px] rounded-2xl flex items-center font-semibold ${
                        typeof item === "string" && item.startsWith("http")
                          ? "p-1.5"
                          : "px-5 py-4"
                      }`
                    : "px-4 py-3 rounded-xl font-semibold text-sm"
                } ${
                  showResult
                    ? status === "correct"
                      ? "border-[#adebb8] bg-[#f0fdf4] text-[#166534]"
                      : status === "incorrect"
                        ? "border-[#fecaca] bg-[#fef2f2] text-[#991b1b]"
                        : "border-[#e5e7eb] bg-[#f9fafb] text-[#6b7280]"
                    : isSelected
                      ? "border-[#002856] bg-[#002856] text-white shadow-lg relative z-20 scale-[1.02]"
                      : isMatched
                        ? "border-[#002856]/30 bg-[#f0f7ff] text-[#002856]"
                        : "border-[#e5e7eb] bg-white hover:border-[#d1d5db] hover:bg-gray-50 relative z-20"
                }`}
              >
                {renderContent(item)}
              </button>
            );
          })}
        </div>

        {/* SVG Arrow Overlay */}
        <svg
          className="absolute inset-0 pointer-events-none z-0"
          style={{ width: "100%", height: "100%", overflow: "visible" }}
        >
          <defs>
            <marker
              id="fc-arrow-navy"
              markerWidth="6"
              markerHeight="6"
              refX="6"
              refY="3"
              orient="auto"
            >
              <polygon points="0,0 6,3 0,6" fill="#002856" />
            </marker>
            <marker
              id="fc-arrow-correct"
              markerWidth="6"
              markerHeight="6"
              refX="6"
              refY="3"
              orient="auto"
            >
              <polygon points="0,0 6,3 0,6" fill="#16a34a" />
            </marker>
            <marker
              id="fc-arrow-incorrect"
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
            @keyframes fc-fade {
              from { opacity: 0; transform: scale(0.92); }
              to   { opacity: 1; transform: scale(1); }
            }
          `}</style>
          {arrows.map(({ leftIdx, x1, y1, x2, y2 }) => {
            const status = getMatchStatus(leftIdx);
            const markerId = showResult
              ? status === "correct"
                ? "fc-arrow-correct"
                : "fc-arrow-incorrect"
              : "fc-arrow-navy";
            const color = showResult
              ? status === "correct"
                ? "#16a34a"
                : "#dc2626"
              : "#002856";
            return (
              <g
                key={leftIdx}
                style={{ animation: "fc-fade 0.2s ease-out both" }}
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
    </div>
  );
}

export const generateTestQuestions = (flashcardSet, indices, isFinal) => {
  const cards = indices.map((i) => flashcardSet[i]).filter(Boolean);
  if (!cards.length || cards.length < 4) return [];
  const withNormalizedImage = cards.map((card) => ({
    ...card,
    front_image_url:
      card.front_image_url || card.front_image || card.image_url || null,
  }));
  const shuffled = [...withNormalizedImage].sort(() => Math.random() - 0.5);
  let qs = [];
  const count = isFinal ? 25 : 10;

  const types = [
    "mcq",
    "image_mcq",
    "truefalse",
    "fill_typing",
    "fill_options",
    "sentence_correction",
    "matching",
  ];

  for (let i = 0; i < count && i < shuffled.length; i++) {
    const c = shuffled[i];
    let type = types[i % types.length];

    // Fallbacks if data doesn't support the type
    if (type === "image_mcq" && !c.front_image_url) type = "mcq";
    if (type === "sentence_correction" && !c.sample_sentence_de)
      type = "fill_typing";
    if (type === "matching" && shuffled.length < 4) type = "mcq";

    const wrongOptsEn = shuffled
      .filter((_, j) => j !== i)
      .slice(0, 3)
      .map((x) => x.meaning_en);

    const wrongOptsDe = shuffled
      .filter((_, j) => j !== i)
      .slice(0, 3)
      .map((x) => x.word_de);

    if (type === "mcq" && wrongOptsEn.length >= 3) {
      qs.push({
        type: "mcq",
        question: c.word_de,
        questionLabel: "Choose correct meaning",
        options: [c.meaning_en, ...wrongOptsEn].sort(() => Math.random() - 0.5),
        correctAnswer: c.meaning_en,
      });
    } else if (
      type === "image_mcq" &&
      c.front_image_url &&
      wrongOptsDe.length >= 3
    ) {
      qs.push({
        type: "image_mcq",
        question: "", // Image is used instead
        question_image: c.front_image_url,
        questionLabel: "Match the correct word to this image",
        options: [c.word_de, ...wrongOptsDe].sort(() => Math.random() - 0.5),
        correctAnswer: c.word_de,
      });
    } else if (type === "truefalse") {
      const isCorrect = Math.random() > 0.5;
      const wrongIdx = (i + 1) % shuffled.length;
      qs.push({
        type: "truefalse",
        question: c.word_de,
        displayAnswer: isCorrect ? c.meaning_en : shuffled[wrongIdx].meaning_en,
        questionLabel: "Is this correct?",
        correctAnswer: isCorrect,
      });
    } else if (type === "fill_typing") {
      qs.push({
        type: "fill_typing",
        question: `What is the German for "${c.meaning_en}"?`,
        questionLabel: "Type in German",
        correct: (c.word_de || "").toLowerCase().trim(),
      });
    } else if (type === "fill_options" && wrongOptsEn.length >= 3) {
      qs.push({
        type: "fill_options",
        question: `Select the meaning of "${c.word_de}"`,
        questionLabel: "Select correct option",
        options: [c.meaning_en, ...wrongOptsEn].sort(() => Math.random() - 0.5),
        correctAnswer: c.meaning_en,
      });
    } else if (type === "sentence_correction") {
      const words = c.sample_sentence_de.split(" ");
      if (words.length > 1) {
        const w = words[0];
        const midIdx = Math.floor(w.length / 2);
        const wrongWord =
          w.slice(0, midIdx) +
          (w[midIdx] === "e" ? "a" : "e") +
          w.slice(midIdx + 1);
        const incorrect = [wrongWord, ...words.slice(1)].join(" ");
        qs.push({
          type: "sentence_correction",
          questionLabel: "Correct the sentence",
          question_data: {
            incorrect_sentence: incorrect,
            correct_sentence: c.sample_sentence_de,
            hint_en: c.meaning_en,
          },
          correctAnswer: c.sample_sentence_de.toLowerCase().trim(),
        });
      }
    } else if (type === "matching" && shuffled.length >= 4) {
      // Create matching: mix of images and words if available
      const subset = shuffled.slice(0, 4);
      const useImages =
        Math.random() > 0.5 && subset.every((x) => x.front_image_url);

      qs.push({
        type: "matching",
        questionLabel: useImages ? "Match images with words" : "Match pairs",
        question_data: {
          left_items: subset.map((x) =>
            useImages ? x.front_image_url : x.word_de,
          ),
          right_items: subset
            .map((x) => (useImages ? x.word_de : x.meaning_en))
            .sort(() => Math.random() - 0.5),
          correct_pairs: subset.map((x) =>
            useImages ? x.word_de : x.meaning_en,
          ),
        },
        correctAnswer: subset.map((x) =>
          useImages ? x.word_de : x.meaning_en,
        ),
      });
    }
  }
  return qs.sort(() => Math.random() - 0.5);
};
