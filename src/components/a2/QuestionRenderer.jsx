import React, { useState, useEffect } from "react";
import { Check, X } from "lucide-react";
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
      const shuffled = [...question_data.words].sort(() => Math.random() - 0.5);
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
                <span className="text-sm">
                  Correct sentence:{" "}
                  <strong>
                    "{Array.isArray(question_data?.correct_order)
                      ? typeof question_data.correct_order[0] === "number" &&
                        Array.isArray(question_data?.words)
                        ? question_data.correct_order
                            .map((i) => question_data.words[i])
                            .join(" ")
                        : question_data.correct_order.join(" ")
                      : question_data?.correct_sentence || "N/A"}"
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
  const [matchedPairs, setMatchedPairs] = useState([]);
  const [leftItems, setLeftItems] = useState([]);
  const [rightItems, setRightItems] = useState([]);
  const [matches, setMatches] = useState({}); // { leftIdx: rightIdx }

  useEffect(() => {
    let left = [];
    let right = [];
    let correctMap = {};

    // Format 1: pairs: [{de, en}] (Grammar module)
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
    }
    // Format 2: left_items/right_items (Test)
    else if (question_data?.left_items && question_data?.right_items) {
      left = question_data.left_items.map((text, i) => ({ id: i, text }));
      const correctPairs =
        question_data.correct_pairs || question_data.right_items;
      right = question_data.right_items.map((text, i) => ({
        id: i,
        text,
        correctIdx: correctPairs ? correctPairs.indexOf(text) : i,
      }));
    }
    // Format 3: items array (alternative)
    else if (question_data?.items && Array.isArray(question_data.items)) {
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

    // Shuffle right column only (keep left as reference)
    const shuffledRight = [...right].sort(() => Math.random() - 0.5);

    setLeftItems(left);
    setRightItems(shuffledRight);
    setMatches({});
    setSelected(null);
  }, [question_data]);

  const handleLeftClick = (idx) => {
    if (showResult) return;
    setSelected({ type: "left", idx });
  };

  const handleRightClick = (idx) => {
    if (showResult) return;
    if (selected?.type === "left") {
      // Make a match
      const newMatches = { ...matches, [selected.idx]: idx };
      setMatches(newMatches);
      // Report answer as array of pairs for backend
      const answer = Object.entries(newMatches).map(([leftIdx, rightIdx]) => ({
        de: leftItems[parseInt(leftIdx)]?.text,
        en: rightItems[rightIdx]?.text,
      }));
      onAnswer(answer);
      setSelected(null);
    } else {
      setSelected({ type: "right", idx });
    }
  };

  const getMatchStatus = (leftIdx) => {
    if (!showResult) return null;
    const rightIdx = matches[leftIdx];
    if (rightIdx === undefined) return "unanswered";
    const leftItem = leftItems[leftIdx];
    const rightItem = rightItems[rightIdx];
    // Check if this pair is correct
    return rightItem?.correctIdx === leftIdx ? "correct" : "incorrect";
  };

  return (
    <div className="space-y-4">
      <p className="text-lg font-medium text-gray-800 mb-2">Match the items:</p>
      <p className="text-xs text-gray-500 mb-4">
        Click a German word, then click its English translation
      </p>

      <div className="flex gap-4">
        {/* Left Column (German) */}
        <div className="flex-1 space-y-2">
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
                onClick={() => handleLeftClick(idx)}
                disabled={showResult}
                className={`w-full px-4 py-3 rounded-xl font-semibold text-sm transition-all border-2 ${
                  showResult
                    ? status === "correct"
                      ? "border-green-500 bg-green-50 text-green-700"
                      : status === "incorrect"
                      ? "border-red-500 bg-red-50 text-red-700"
                      : "border-gray-200 bg-gray-50"
                    : isSelected
                    ? "border-[#002856] bg-[#002856] text-white scale-105 shadow-md"
                    : isMatched
                    ? "border-[#002856] bg-[#edfaff] text-[#002856]"
                    : "border-gray-200 bg-white hover:border-gray-300"
                }`}
              >
                {item.text}
              </button>
            );
          })}
        </div>

        {/* Right Column (English) */}
        <div className="flex-1 space-y-2">
          <p className="text-xs font-bold text-gray-400 uppercase text-center mb-2">
            English
          </p>
          {rightItems.map((item, idx) => {
            const isSelected =
              selected?.type === "right" && selected?.idx === idx;
            const isMatched = Object.values(matches).includes(idx);
            // Find if this right item is correctly matched
            const matchedLeftIdx = Object.entries(matches).find(
              ([l, r]) => r === idx,
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
                onClick={() => handleRightClick(idx)}
                disabled={showResult}
                className={`w-full px-4 py-3 rounded-xl font-semibold text-sm transition-all border-2 ${
                  showResult
                    ? status === "correct"
                      ? "border-green-500 bg-green-50 text-green-700"
                      : status === "incorrect"
                      ? "border-red-500 bg-red-50 text-red-700"
                      : "border-gray-200 bg-gray-50"
                    : isSelected
                    ? "border-[#002856] bg-[#002856] text-white scale-105 shadow-md"
                    : isMatched
                    ? "border-[#002856] bg-[#edfaff] text-[#002856]"
                    : "border-gray-200 bg-white hover:border-gray-300"
                }`}
              >
                {item.text}
              </button>
            );
          })}
        </div>
      </div>

      {/* Matches Preview */}
      {Object.keys(matches).length > 0 && (
        <div className="mt-4 pt-3 border-t border-gray-200">
          <p className="text-xs font-bold text-gray-400 uppercase mb-2">
            Your Matches ({Object.keys(matches).length}/{leftItems.length})
          </p>
          <div className="space-y-1">
            {Object.entries(matches).map(([leftIdx, rightIdx]) => {
              const status = getMatchStatus(parseInt(leftIdx));
              return (
                <div
                  key={leftIdx}
                  className={`flex items-center gap-2 p-2 rounded-lg text-sm ${
                    showResult
                      ? status === "correct"
                        ? "bg-green-50"
                        : "bg-red-50"
                      : "bg-gray-50"
                  }`}
                >
                  <span className="font-medium">
                    {leftItems[parseInt(leftIdx)]?.text}
                  </span>
                  <span className="text-gray-400">→</span>
                  <span>{rightItems[rightIdx]?.text}</span>
                  {showResult &&
                    (status === "correct" ? (
                      <Check className="w-4 h-4 text-green-500 ml-auto" />
                    ) : (
                      <X className="w-4 h-4 text-red-500 ml-auto" />
                    ))}
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
    if (question_data?.correct) return question_data.correct;
    if (question_data?.correct_answer) return question_data.correct_answer;
    if (question_data?.correctAnswer) return question_data.correctAnswer;
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
            const isCorrectOption = Array.isArray(correctArr) && (
              correctArr.includes(option) || 
              correctArr.includes(idx) ||
              correctArr.includes(String(idx))
            );
            
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
                    {showResult && isCorrectOption && !multiAnswer.includes(option) && (
                      <Check className="w-3 h-3 text-green-500" />
                    )}
                  </div>
                  <span>{option}</span>
                  {showResult && isCorrectOption && (
                    <span className="ml-auto text-xs text-green-600 font-medium">✓ Correct</span>
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
                    return correctArr.map(i => opts[i] || `[${i}]`).join(", ");
                  }
                  return correctArr.join(", ");
                })()}
              </span>
            </p>
          )}
        </div>
      );

    case "true_false":
    case "truefalse":
      return (
        <div className="space-y-4">
          <p className="text-lg font-medium text-gray-800 mb-4">
            {getQuestionText()}
          </p>
          <div className="flex gap-4">
            {[true, false].map((value) => (
              <button
                key={String(value)}
                onClick={() => !showResult && handleSelect(value)}
                disabled={showResult}
                className={`flex-1 p-4 rounded-xl border-2 font-semibold transition-all ${
                  localAnswer === value
                    ? showResult
                      ? isCorrect
                        ? "border-green-500 bg-green-50 text-green-700"
                        : "border-red-500 bg-red-50 text-red-700"
                      : "border-[#002856] bg-[#edfaff] text-[#002856]"
                    : showResult && value === getCorrectAnswer()
                    ? "border-green-500 bg-green-50 text-green-700"
                    : "border-gray-200 hover:border-gray-300 text-gray-600"
                }`}
              >
                {value ? "True" : "False"}
              </button>
            ))}
          </div>
        </div>
      );

    case "fill_typing":
    case "fill_blank_typing":
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
          <div className="flex flex-wrap gap-2">
            {getOptions().map((option, idx) => (
              <button
                key={idx}
                onClick={() => !showResult && handleSelect(option)}
                disabled={showResult}
                className={`px-4 py-2 rounded-full border-2 font-medium transition-all ${
                  localAnswer === option
                    ? showResult
                      ? isCorrect
                        ? "border-green-500 bg-green-50 text-green-700"
                        : "border-red-500 bg-red-50 text-red-700"
                      : "border-[#002856] bg-[#002856] text-white"
                    : showResult && option === getCorrectAnswer()
                    ? "border-green-500 bg-green-50 text-green-700"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                {option}
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
