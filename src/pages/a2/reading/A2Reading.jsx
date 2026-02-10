import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  ChevronLeft,
  Volume2,
  Loader2,
  BookOpen,
  BookOpenText,
} from "lucide-react";
import { getReadingContent, saveReadingProgress } from "../../../api/a2Api";
import ReadingRenderer from "../../../components/a2/ReadingRenderer";
import useTextToSpeech from "../../pronounce/hooks/useTextToSpeech";
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

// Drag-and-drop sentence ordering components
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

function SentenceOrderingInline({ question, onAnswer, showResult, isCorrect }) {
  const words = question.words || [];
  const correctOrder = question.correct_order || [];
  const hintEn = question.hint_en || "";

  const [orderedWords, setOrderedWords] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [activeWord, setActiveWord] = useState(null);

  useEffect(() => {
    if (words.length > 0 && orderedWords.length === 0) {
      const shuffled = [...words].sort(() => Math.random() - 0.5);
      setOrderedWords(shuffled);
    }
  }, [words]);

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
      setTimeout(() => onAnswer(newOrder), 0);
    }
  };

  return (
    <div className="space-y-4">
      {hintEn && (
        <div className="p-3 bg-blue-50 rounded-xl border border-blue-200">
          <p className="text-sm font-medium text-blue-800">
            <span className="text-blue-600">Hint: </span>"{hintEn}"
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
          <div
            className={`flex flex-wrap gap-3 p-4 rounded-xl min-h-[80px] border-2 border-dashed ${
              showResult
                ? isCorrect
                  ? "border-green-400 bg-green-50"
                  : "border-red-400 bg-red-50"
                : "border-gray-300 bg-gray-50"
            }`}
          >
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
                  Correct: <strong>"{correctOrder.join(" ")}"</strong>
                </span>
              </>
            )}
          </p>
        </div>
      )}
    </div>
  );
}

export default function A2Reading() {
  const { chapterId } = useParams();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const { isSpeaking, speakText } = useTextToSpeech();
  const [contentList, setContentList] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedVocab, setSelectedVocab] = useState(null);
  const [phase, setPhase] = useState("reading");
  const [answers, setAnswers] = useState({});
  const [showAnswers, setShowAnswers] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);

  const currentContent = contentList[currentIndex];
  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }
    const fetchContent = async () => {
      setLoading(true);
      try {
        const res = await getReadingContent(chapterId);
        const data = Array.isArray(res.data) ? res.data : [res.data];
        setContentList(data.filter(Boolean));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchContent();
  }, [user, chapterId, navigate]);
  const handleVocabClick = (word) => {
    const vocab = currentContent?.vocabulary?.find(
      (v) => v.word.toLowerCase() === word.toLowerCase(),
    );
    if (vocab) setSelectedVocab(vocab);
  };
  const renderVocabContent = () => {
    if (!currentContent?.content) return null;
    const text = currentContent.content;
    const vocabulary = currentContent.vocabulary || [];
    const vocabWords = vocabulary.map((v) => v.word.toLowerCase());
    const words = text.split(/(\s+)/);
    return words.map((word, i) => {
      const cleanWord = word.replace(/[.,!?;:]/g, "").toLowerCase();
      const isVocab = vocabWords.includes(cleanWord);
      if (isVocab) {
        return (
          <span
            key={i}
            onClick={() => handleVocabClick(cleanWord)}
            className="bg-yellow-200/60 px-1 rounded cursor-pointer hover:bg-yellow-300/80 border-b-2 border-yellow-400/60"
          >
            {word}
          </span>
        );
      }
      return <span key={i}>{word}</span>;
    });
  };
  const handleAnswer = (qIdx, answer) =>
    setAnswers({ ...answers, [qIdx]: answer });
  const handleSubmitQuiz = () => {
    setShowAnswers(true);
  };
  const handleTryAgain = () => {
    setAnswers({});
    setShowAnswers(false);
  };
  const handleNext = () => {
    if (currentIndex < contentList.length - 1) {
      setCurrentIndex((p) => p + 1);
      setPhase("reading");
      setAnswers({});
      setShowAnswers(false);
    }
  };
  const handleFinish = async () => {
    setIsFinishing(true);
    try {
      // Pass contentId, not chapterId - backend expects contentId
      await saveReadingProgress({
        contentId: currentContent.id,
        isCompleted: true,
      });
      navigate("/a2/reading");
    } catch {
    } finally {
      setIsFinishing(false);
    }
  };
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#002856]" />
      </div>
    );
  }
  if (!currentContent) {
    return (
      <div className="min-h-screen bg-white p-4">
        <button
          onClick={() => navigate("/a2/reading")}
          className="flex items-center gap-2 mb-4"
        >
          <ChevronLeft className="w-4 h-4" /> Back
        </button>
        <p className="text-center text-gray-500 py-12">No content available.</p>
      </div>
    );
  }
  const questions = currentContent?.questions || [];
  const hasQuestions = questions.length > 0;
  const contentType = currentContent.content_type || "article";
  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="px-4 py-2.5 flex items-center justify-between border-b border-gray-100">
        <button
          onClick={() => navigate("/a2/reading")}
          className="flex items-center gap-2 text-sm font-semibold"
        >
          <ChevronLeft className="w-4 h-4" /> Back
        </button>
        <div className="flex-1" />
        {phase === "reading" ? (
          <span className="text-sm font-semibold text-[#7b7b7b]">Reading</span>
        ) : (
          <button
            onClick={() => setPhase("reading")}
            className="flex items-center gap-1 px-3 py-0.5 bg-[#edfaff] border border-[#002856] text-[#002856] text-sm font-semibold rounded-lg hover:bg-[#002856] hover:text-white transition-colors"
            title="Back to Content"
          >
            <BookOpenText className="w-4 h-4" />
            <span>Read</span>
          </button>
        )}
      </div>

      {/* Content */}
      <div id="a2-reading-content" className="flex-1 p-4 overflow-y-auto">
        {phase === "reading" && (
          <ReadingRenderer
            content={currentContent}
            type={contentType}
            onWordClick={handleVocabClick}
            renderContent={renderVocabContent}
          />
        )}
        {phase === "quiz" && (
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xl font-bold text-[#002856]">
                Comprehension Quiz
              </h2>
              <span className="text-sm font-medium text-gray-500">
                {questions.length} Questions
              </span>
            </div>
            {questions.map((q, qIdx) => {
              const userAns = answers[qIdx];
              const qType = q.type;

              // Calculate isCorrect based on question type
              let isCorrect = false;
              if (qType === "true_false" || qType === "truefalse") {
                isCorrect = userAns === q.correct;
              } else if (qType === "mcq_multi") {
                // Multi-select: compare selected option TEXTS to correct array
                const correctArr = q.correct || [];
                const userArr = Array.isArray(userAns) ? userAns : [];
                // Convert user indices to option texts for comparison
                const userTexts = userArr
                  .map((idx) => q.options?.[idx])
                  .filter(Boolean);
                isCorrect =
                  correctArr.length === userTexts.length &&
                  correctArr.every((c) => userTexts.includes(c));
              } else if (
                qType === "fill_typing" ||
                qType === "fill_blank_typing" ||
                qType === "sentence_correction"
              ) {
                // Text input: compare strings (case-insensitive, punctuation-stripped)
                const stripPunctuation = (str) =>
                  str
                    .replace(/[.,!?;:'"()]/g, "")
                    .replace(/\s+/g, " ")
                    .trim();
                const correctText = stripPunctuation(
                  (
                    q.correct ||
                    q.correct_answer ||
                    q.correct_sentence ||
                    ""
                  ).toLowerCase(),
                );
                const userText = stripPunctuation(
                  (userAns || "").toLowerCase(),
                );
                isCorrect = userText === correctText;
              } else if (
                qType === "sentence_ordering" ||
                qType === "sentence_reorder"
              ) {
                // Sentence ordering: compare arrays
                const correctOrder = q.correct_order || [];
                const userOrder = Array.isArray(userAns) ? userAns : [];
                isCorrect =
                  correctOrder.length === userOrder.length &&
                  correctOrder.every((word, idx) => userOrder[idx] === word);
              } else if (
                qType === "fill_options" ||
                qType === "fill_blank_options"
              ) {
                isCorrect = userAns === q.correct;
              } else {
                // MCQ single
                isCorrect =
                  userAns !== undefined && q.options?.[userAns] === q.correct;
              }

              return (
                <div key={qIdx}>
                  <p className="text-sm text-gray-400 mb-2 mt-2 font-semibold">
                    Question {qIdx + 1} of {questions.length}
                  </p>
                  <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
                    <p className="font-medium text-gray-800 mb-2">
                      {q.question}
                    </p>
                    {qType === "true_false" || qType === "truefalse" ? (
                      <div className="flex gap-3">
                        {[true, false].map((val, i) => {
                          const isSelected = userAns === val;
                          const isCorrectOpt = val === q.correct;
                          let cls =
                            "border-gray-200 bg-white hover:border-gray-300";
                          if (showAnswers) {
                            if (isCorrectOpt)
                              cls =
                                "border-green-500 bg-green-50 text-green-700";
                            else if (isSelected)
                              cls = "border-red-500 bg-red-50 text-red-700";
                          } else if (isSelected)
                            cls =
                              "border-[#002856] bg-[#edfaff] text-[#002856]";
                          return (
                            <button
                              key={i}
                              onClick={() =>
                                !showAnswers && handleAnswer(qIdx, val)
                              }
                              disabled={showAnswers}
                              className={`flex-1 py-3 rounded-xl border-2 font-medium transition-all ${cls}`}
                            >
                              {val ? "True" : "False"}
                            </button>
                          );
                        })}
                      </div>
                    ) : qType === "mcq_multi" ? (
                      /* MCQ Multi-select */
                      <div className="space-y-2 ">
                        <p className="text-sm text-gray-500 mb-2">
                          Select all that apply
                        </p>
                        {q.options?.map((opt, i) => {
                          const correctArr = q.correct || [];
                          const userArr = Array.isArray(userAns) ? userAns : [];
                          const isSelected = userArr.includes(i);
                          const isCorrectOpt =
                            correctArr.includes(i) || correctArr.includes(opt);
                          let cls =
                            "border-gray-200 bg-gray-50 hover:border-gray-300";

                          if (showAnswers) {
                            if (isCorrectOpt)
                              cls =
                                "border-green-500 bg-green-50 text-green-700";
                            else if (isSelected)
                              cls = "border-red-500 bg-red-50 text-red-700";
                          } else if (isSelected) {
                            cls =
                              "border-[#002856] bg-[#edfaff] text-[#002856]";
                          }

                          return (
                            <button
                              key={i}
                              onClick={() => {
                                if (showAnswers) return;
                                const current = Array.isArray(userAns)
                                  ? [...userAns]
                                  : [];
                                const idx = current.indexOf(i);
                                if (idx > -1) current.splice(idx, 1);
                                else current.push(i);
                                handleAnswer(qIdx, current);
                              }}
                              disabled={showAnswers}
                              className={`w-full p-3.5 rounded-xl border-2 text-left font-medium transition-all ${cls}`}
                            >
                              <span className="flex items-center gap-3">
                                <span
                                  className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                                    showAnswers && isCorrectOpt
                                      ? "border-green-500 bg-green-500"
                                      : showAnswers && isSelected
                                      ? "border-red-500 bg-red-500"
                                      : isSelected
                                      ? "border-[#002856] bg-[#002856]"
                                      : "border-gray-300"
                                  }`}
                                >
                                  {isSelected && (
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
                                </span>
                                {opt}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    ) : qType === "fill_typing" ||
                      qType === "fill_blank_typing" ? (
                      /* Fill-in-the-blank Typing */
                      <div className=" space-y-3">
                        {q.explanation && (
                          <p className="text-sm text-gray-500 italic">
                            {q.explanation}
                          </p>
                        )}
                        <input
                          type="text"
                          value={userAns || ""}
                          onChange={(e) => handleAnswer(qIdx, e.target.value)}
                          disabled={showAnswers}
                          placeholder="Type your answer..."
                          className={`w-full p-3.5 rounded-xl border-2 text-lg font-medium transition-all ${
                            showAnswers
                              ? isCorrect
                                ? "border-green-500 bg-green-50 text-green-700"
                                : "border-red-500 bg-red-50 text-red-700"
                              : "border-gray-200 focus:border-[#002856] focus:outline-none"
                          }`}
                        />
                        {showAnswers && !isCorrect && (
                          <p className="text-sm text-gray-600">
                            Correct:{" "}
                            <span className="font-semibold text-green-600">
                              {q.correct || q.correct_answer}
                            </span>
                          </p>
                        )}
                      </div>
                    ) : qType === "fill_options" ||
                      qType === "fill_blank_options" ? (
                      /* Fill-in-the-blank with Options */
                      <div className=" space-y-3">
                        {q.explanation && (
                          <p className="text-sm text-gray-500 italic mb-2">
                            {q.explanation}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-2">
                          {q.options?.map((opt, i) => {
                            const isSelected = userAns === opt;
                            const isCorrectOpt = opt === q.correct;
                            let cls = "border-gray-200 hover:border-gray-300";

                            if (showAnswers) {
                              if (isCorrectOpt)
                                cls =
                                  "border-green-500 bg-green-50 text-green-700";
                              else if (isSelected)
                                cls = "border-red-500 bg-red-50 text-red-700";
                            } else if (isSelected) {
                              cls = "border-[#002856] bg-[#002856] text-white";
                            }

                            return (
                              <button
                                key={i}
                                onClick={() =>
                                  !showAnswers && handleAnswer(qIdx, opt)
                                }
                                disabled={showAnswers}
                                className={`px-4 py-2 rounded-full border-2 font-medium transition-all ${cls}`}
                              >
                                {opt}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ) : qType === "sentence_correction" ? (
                      /* Sentence Correction */
                      <div className=" space-y-3">
                        <div className="p-4 bg-red-50 rounded-xl border-2 border-red-200">
                          <p className="text-red-800 font-medium">
                            {q.incorrect_sentence || q.incorrect || q.sentence}
                          </p>
                        </div>
                        {q.hint_en && (
                          <p className="text-sm text-gray-500">
                            Hint: {q.hint_en}
                          </p>
                        )}
                        <input
                          type="text"
                          value={userAns || ""}
                          onChange={(e) => handleAnswer(qIdx, e.target.value)}
                          disabled={showAnswers}
                          placeholder="Type the corrected sentence..."
                          className={`w-full p-3.5 rounded-xl border-2 text-lg font-medium transition-all ${
                            showAnswers
                              ? isCorrect
                                ? "border-green-500 bg-green-50 text-green-700"
                                : "border-red-500 bg-red-50 text-red-700"
                              : "border-gray-200 focus:border-[#002856] focus:outline-none"
                          }`}
                        />
                        {showAnswers && !isCorrect && (
                          <p className="text-sm text-gray-600">
                            Correct:{" "}
                            <span className="font-semibold text-green-600">
                              {q.correct_sentence || q.correct}
                            </span>
                          </p>
                        )}
                      </div>
                    ) : qType === "sentence_ordering" ||
                      qType === "sentence_reorder" ? (
                      /* Sentence Ordering - Drag and Drop */
                      <div className="">
                        <SentenceOrderingInline
                          question={q}
                          onAnswer={(order) => handleAnswer(qIdx, order)}
                          showResult={showAnswers}
                          isCorrect={isCorrect}
                        />
                      </div>
                    ) : (
                      /* Default: MCQ Single */
                      <div className="space-y-2 ">
                        {q.options?.map((opt, i) => {
                          const isSelected = userAns === i;
                          const isCorrectOpt = opt === q.correct;
                          let cls =
                            "border-gray-200 bg-gray-50 hover:border-gray-300";
                          if (showAnswers) {
                            if (isCorrectOpt)
                              cls =
                                "border-green-500 bg-green-50 text-green-700";
                            else if (isSelected)
                              cls = "border-red-500 bg-red-50 text-red-700";
                          } else if (isSelected)
                            cls =
                              "border-[#002856] bg-[#edfaff] text-[#002856]";
                          return (
                            <button
                              key={i}
                              onClick={() =>
                                !showAnswers && handleAnswer(qIdx, i)
                              }
                              disabled={showAnswers}
                              className={`w-full p-3.5 rounded-xl border-2 text-left font-medium transition-all ${cls}`}
                            >
                              <span className="flex items-center gap-3">
                                <span
                                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                    showAnswers && isCorrectOpt
                                      ? "border-green-500 bg-green-500"
                                      : showAnswers && isSelected
                                      ? "border-red-500 bg-red-500"
                                      : isSelected
                                      ? "border-[#002856] bg-[#002856]"
                                      : "border-gray-300"
                                  }`}
                                >
                                  {(isSelected ||
                                    (showAnswers && isCorrectOpt)) && (
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
                                </span>
                                {opt}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      {/* Vocabulary Modal - Centered & Modern with TTS */}
      {selectedVocab && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedVocab(null)}
        >
          <div
            className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => speakText(selectedVocab.word)}
              className={`w-14 h-14 mx-auto mb-4 rounded-full flex items-center justify-center transition-all ${
                isSpeaking
                  ? "bg-[#EDB843] text-white animate-pulse"
                  : "bg-[#FFF5DF] text-[#EDB843] hover:bg-[#fbedcf]"
              }`}
            >
              <Volume2 className="w-6 h-6" />
            </button>
            <h3 className="text-2xl font-bold text-[#002856] text-center mb-2">
              {selectedVocab.word}
            </h3>
            <p className="text-gray-600 text-center text-lg mb-6">
              {selectedVocab.meaning}
            </p>
            {selectedVocab.example && (
              <p className="text-sm text-gray-500 text-center italic mb-6 px-4">
                "{selectedVocab.example}"
              </p>
            )}
            <button
              onClick={() => setSelectedVocab(null)}
              className="w-full py-3 bg-[#002856] text-white rounded-xl font-semibold"
            >
              Got it!
            </button>
          </div>
        </div>
      )}
      {/* Navigation */}
      <div className="flex items-center justify-center gap-3 p-4 border-t border-gray-100">
        {phase === "reading" && hasQuestions && (
          <button
            id="a2-reading-quiz-btn"
            onClick={() => {
              window.dispatchEvent(new Event("tour:a2ReadingQuiz"));
              setPhase("quiz");
              window.scrollTo(0, 0);
            }}
            className="px-8 py-3 bg-[#002856] text-white rounded-xl font-semibold"
          >
            Take Quiz
          </button>
        )}
        {phase === "reading" &&
          !hasQuestions &&
          (currentIndex === contentList.length - 1 ? (
            <button
              onClick={handleFinish}
              className="px-8 py-3 bg-[#019035] text-white rounded-xl font-semibold"
            >
              Finish
            </button>
          ) : (
            <button
              onClick={handleNext}
              className="px-8 py-3 bg-[#002856] text-white rounded-xl font-semibold"
            >
              Next
            </button>
          ))}
        {phase === "quiz" && !showAnswers && (
          <button
            onClick={handleSubmitQuiz}
            disabled={
              Object.keys(answers).length < questions.length || isSubmitting
            }
            className="px-8 py-3 bg-[#002856] text-white rounded-xl font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" /> Checking...
              </>
            ) : (
              "Submit"
            )}
          </button>
        )}
        {phase === "quiz" && showAnswers && (
          <>
            <button
              onClick={handleTryAgain}
              className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold"
            >
              Try Again
            </button>
            {currentIndex === contentList.length - 1 ? (
              <button
                onClick={handleFinish}
                disabled={isFinishing}
                className="px-8 py-3 bg-[#019035] text-white rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isFinishing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" /> Finishing...
                  </>
                ) : (
                  "Finish"
                )}
              </button>
            ) : (
              <button
                onClick={handleNext}
                className="px-8 py-3 bg-[#002856] text-white rounded-xl font-semibold"
              >
                Next
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
