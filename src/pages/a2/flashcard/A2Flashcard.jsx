import { useEffect, useState, useRef, useCallback } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Shuffle,
  RotateCcw,
  Target,
  Award,
  Check,
  X,
  RefreshCw,
  Loader2,
  GripVertical,
} from "lucide-react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { getFlashcards, saveFlashcardProgress } from "../../../api/a2Api";
import api from "../../../api/axios";
import A2FlashcardDeck from "../../../components/a2/A2FlashcardDeck";
import ProgressBar from "../../../components/a2/ProgressBar";
import StreakCelebrationModal from "../../../components/StreakCelebrationModal";
import FloatingStreakCounter from "../../../components/FloatingStreakCounter";
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
import useTextToSpeech from "../../pronounce/hooks/useTextToSpeech";

// DnD Word Component
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

// Sentence Reorder Question for Quiz
function QuizSentenceReorder({ question, value, onChange }) {
  const [orderedWords, setOrderedWords] = useState(
    value || question.question_data?.words || [],
  );
  const [activeId, setActiveId] = useState(null);
  const [activeWord, setActiveWord] = useState(null);

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
      setOrderedWords((items) => {
        const oldIndex = items.indexOf(active.id);
        const newIndex = items.indexOf(over.id);
        const newOrder = arrayMove(items, oldIndex, newIndex);
        onChange(newOrder);
        return newOrder;
      });
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-600 mb-2">
        Hint: {question.question_data?.hint_en}
      </p>
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
      <p className="text-xs text-gray-400">Drag words to reorder</p>
    </div>
  );
}

// Matching Question for Quiz - NO AUTO-FEEDBACK, blue only, green/red after submit
function QuizMatching({ question, value, onChange, showResult }) {
  const [selected, setSelected] = useState(null);
  const [matches, setMatches] = useState({}); // { leftIdx: rightIdx }

  const leftItems = question.question_data?.left_items || [];
  const rightItems = question.question_data?.right_items || [];
  const correctPairs = question.question_data?.correct_pairs || [];

  const handleLeftClick = (idx) => {
    if (showResult) return;
    setSelected({ type: "left", idx });
  };

  const handleRightClick = (idx) => {
    if (showResult) return;
    if (selected?.type === "left") {
      // Make match - no instant feedback
      const newMatches = { ...matches, [selected.idx]: idx };
      setMatches(newMatches);
      // Report answer as array matching left to right
      const answer = leftItems.map((_, i) => rightItems[newMatches[i]]);
      onChange(answer);
      setSelected(null);
    } else {
      setSelected({ type: "right", idx });
    }
  };

  const getMatchStatus = (leftIdx) => {
    if (!showResult) return null;
    const rightIdx = matches[leftIdx];
    if (rightIdx === undefined) return "unanswered";
    return correctPairs[leftIdx] === rightItems[rightIdx]
      ? "correct"
      : "incorrect";
  };

  const isMatched = (type, idx) => {
    if (type === "left") return matches[idx] !== undefined;
    return Object.values(matches).includes(idx);
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        {/* Left Column */}
        <div className="flex-1 space-y-2">
          <p className="text-xs font-bold text-gray-400 uppercase text-center mb-2">
            German
          </p>
          {leftItems.map((item, idx) => {
            const status = getMatchStatus(idx);
            const matched = isMatched("left", idx);
            const isSelected =
              selected?.type === "left" && selected?.idx === idx;

            return (
              <button
                key={`left-${idx}`}
                onClick={() => handleLeftClick(idx)}
                disabled={showResult}
                className={`w-full px-4 py-3 rounded-xl font-semibold text-sm transition-all border-2 ${
                  showResult
                    ? status === "correct"
                      ? "bg-green-50 border-green-400 text-green-700"
                      : status === "incorrect"
                        ? "bg-red-50 border-red-400 text-red-600"
                        : "bg-gray-50 border-gray-200"
                    : isSelected
                      ? "bg-[#002856] text-white border-[#002856] scale-105 shadow-md"
                      : matched
                        ? "bg-[#edfaff] border-[#002856] text-[#002856]"
                        : "bg-white text-[#181d27] border-gray-100 hover:border-blue-200"
                }`}
              >
                {item}
              </button>
            );
          })}
        </div>
        {/* Right Column */}
        <div className="flex-1 space-y-2">
          <p className="text-xs font-bold text-gray-400 uppercase text-center mb-2">
            English
          </p>
          {rightItems.map((item, idx) => {
            const matched = isMatched("right", idx);
            const isSelected =
              selected?.type === "right" && selected?.idx === idx;
            // Find if this right item is correctly matched
            const matchedLeftIdx = Object.entries(matches).find(
              ([l, r]) => parseInt(r) === idx,
            )?.[0];
            const status =
              showResult && matchedLeftIdx !== undefined
                ? correctPairs[parseInt(matchedLeftIdx)] === item
                  ? "correct"
                  : "incorrect"
                : null;

            return (
              <button
                key={`right-${idx}`}
                onClick={() => handleRightClick(idx)}
                disabled={showResult}
                className={`w-full px-4 py-3 rounded-xl font-semibold text-sm transition-all border-2 ${
                  showResult
                    ? status === "correct"
                      ? "bg-green-50 border-green-400 text-green-700"
                      : status === "incorrect"
                        ? "bg-red-50 border-red-400 text-red-600"
                        : "bg-gray-50 border-gray-200"
                    : isSelected
                      ? "bg-[#002856] text-white border-[#002856] scale-105 shadow-md"
                      : matched
                        ? "bg-[#edfaff] border-[#002856] text-[#002856]"
                        : "bg-white text-[#181d27] border-gray-100 hover:border-blue-200"
                }`}
              >
                {item}
              </button>
            );
          })}
        </div>
      </div>
      {/* Matches Preview */}
      {Object.keys(matches).length > 0 && (
        <div className="mt-4 p-3 bg-gray-50 rounded-xl">
          <p className="text-xs font-bold text-gray-400 uppercase mb-2">
            Matched: {Object.keys(matches).length}/{leftItems.length}
          </p>
          <div className="space-y-1">
            {Object.entries(matches).map(([leftIdx, rightIdx]) => {
              const status = getMatchStatus(parseInt(leftIdx));
              return (
                <div
                  key={leftIdx}
                  className={`flex items-center justify-between text-sm p-2 rounded-lg border ${
                    showResult
                      ? status === "correct"
                        ? "bg-green-50 border-green-200"
                        : "bg-red-50 border-red-200"
                      : "bg-white border-gray-100"
                  }`}
                >
                  <span className="font-medium text-[#002856]">
                    {leftItems[parseInt(leftIdx)]}
                  </span>
                  <span className="text-gray-400">→</span>
                  <span className="font-medium text-gray-600">
                    {rightItems[rightIdx]}
                  </span>
                  {showResult &&
                    (status === "correct" ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <X className="w-4 h-4 text-red-500" />
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

export default function A2Flashcard() {
  const { chapterId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);

  const [currentCard, setCurrentCard] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [flashcardSet, setFlashcardSet] = useState([]);
  const [setId, setSetId] = useState(null);
  const [deckRotation, setDeckRotation] = useState(0);
  const [loading, setLoading] = useState(true);

  const [swipeDirection, setSwipeDirection] = useState(null);
  const [dragStart, setDragStart] = useState(null);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const [showTest, setShowTest] = useState(false);
  const [showTestPrompt, setShowTestPrompt] = useState(false);
  const [testQuestions, setTestQuestions] = useState([]);
  const [userAnswers, setUserAnswers] = useState({});
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [testResults, setTestResults] = useState(null);
  const [completedTests, setCompletedTests] = useState(new Set());
  const [isFinalTest, setIsFinalTest] = useState(false);

  // Streak tracking - like A1 FlashCard
  const flippedCardsRef = useRef(new Set());
  const prevIsFlipped = useRef(false);
  const [showStreakCelebration, setShowStreakCelebration] = useState(false);
  const [dailyGoalReached, setDailyGoalReached] = useState(false);
  const [streakInfo, setStreakInfo] = useState({
    todayFlashcards: 0,
    dailyGoal: 20,
    streakDays: 0,
  });

  // [NEW] Local state for smooth animation
  const [localStreakCount, setLocalStreakCount] = useState(0);

  // [NEW] Fetch initial streak data on mount
  useEffect(() => {
    if (!user?.user_id) return;
    api
      .get("/streak")
      .then((res) => {
        if (res.data) {
          setStreakInfo((prev) => ({
            ...prev,
            todayFlashcards: res.data.todayPoints,
            dailyGoal: res.data.dailyGoal,
            streakDays: res.data.currentStreak,
          }));
          setLocalStreakCount(res.data.todayPoints);
          if (res.data.dailyGoalMet) setDailyGoalReached(true);
        }
      })
      .catch((err) => console.error(err));
  }, [user?.user_id]);

  const { isSpeaking, isLoadingAudio, speakText, cancelSpeech } =
    useTextToSpeech();
  const totalCards = flashcardSet.length;
  const chapterName = searchParams.get("name") || "Chapter";

  // Track card flips for streak - count when card is flipped for the first time
  useEffect(() => {
    const justFlipped = isFlipped && !prevIsFlipped.current;
    prevIsFlipped.current = isFlipped;

    // Dispatch tour event on first flip
    if (justFlipped) {
      window.dispatchEvent(new Event("tour:a2FlashcardRevealed"));
    }

    if (!user?.user_id || loading) return;
    if (!justFlipped) return;

    // Only log if this card hasn't been flipped before in this session
    if (!flippedCardsRef.current.has(currentCard)) {
      flippedCardsRef.current.add(currentCard);

      // Optimistic update for UI (sync, outside async)
      setLocalStreakCount((prev) => prev + 1);

      const logActivity = async () => {
        try {
          // NOTE: A2 uses different flashcard tables, so we only call /streak/log
          // (not /streak/flip which uses A1's user_flipped_cards table)
          const streakRes = await api.post("/streak/log");

          // Sync with server data when daily goal is reached
          if (streakRes.data.streakUpdated) {
            setStreakInfo({
              todayFlashcards: streakRes.data.todayPoints,
              dailyGoal: streakRes.data.dailyGoal,
              streakDays: streakRes.data.currentStreak || 1,
            });
            setDailyGoalReached(true);
            setShowStreakCelebration(true);
          }
        } catch (err) {
          // Rollback optimistic update on failure
          setLocalStreakCount((prev) => Math.max(0, prev - 1));
          console.error("Error logging flashcard activity:", err);
        }
      };
      logActivity();
    }
  }, [isFlipped, currentCard, user?.user_id, loading]);

  useEffect(() => {
    if (!user) navigate("/login");
    const fetchData = async () => {
      setLoading(true);
      try {
        const response = await getFlashcards(chapterId);
        const data = response?.data || response;
        const cardArray = data?.cards || data || [];
        setFlashcardSet(cardArray);
        setSetId(data?.setId);
        // Priority: URL start_index param (from StreakWidget) > saved progress
        const urlStartIndex = parseInt(searchParams.get("start_index"));
        if (!isNaN(urlStartIndex) && urlStartIndex > 0) {
          setCurrentCard(Math.min(urlStartIndex, cardArray.length - 1));
        } else if (data?.progress?.current_index > 0) {
          setCurrentCard(
            Math.min(data.progress.current_index, cardArray.length - 1),
          );
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [chapterId, user, navigate]);

  useEffect(() => {
    if (!setId || totalCards === 0 || !user) return;
    saveFlashcardProgress({
      setId,
      currentIndex: currentCard,
      isCompleted: currentCard >= totalCards - 1,
    }).catch(console.error);
  }, [currentCard, user, setId, totalCards]);

  const handleSpeak = (text) => {
    if (text) speakText(text, "de-DE");
  };
  useEffect(() => {
    return () => cancelSpeech();
  }, []);

  // FIX: Quiz triggers AFTER 20 cards viewed (not 19)
  // currentCard is 0-indexed, so after viewing 20th card (index 19), next click should trigger
  const shouldShowTest = (nextCardIndex) => {
    // nextCardIndex is what we're about to move TO
    // Trigger at: 20, 40, 60... OR at end
    if (nextCardIndex === totalCards) return true; // End of deck
    if (nextCardIndex > 0 && nextCardIndex % 20 === 0) return true; // Every 20
    return false;
  };

  const handleDragStart = (e) => {
    setDragStart(e.type === "mousedown" ? e.clientX : e.touches[0].clientX);
    setIsDragging(true);
    setSwipeDirection(null);
  };

  const handleDragMove = (e) => {
    if (dragStart) {
      setDragOffset(
        (e.type === "mousemove" ? e.clientX : e.touches[0].clientX) - dragStart,
      );
    }
  };

  const handleDragEnd = () => {
    if (!dragStart) return;
    if (Math.abs(dragOffset) > 80) {
      if (dragOffset > 0 && currentCard > 0) {
        // Swipe right = previous
        setSwipeDirection("right");
        setTimeout(() => {
          setCurrentCard(currentCard - 1);
          setDeckRotation((p) => (p - 1 + 3) % 3);
          setIsFlipped(false);
          setSwipeDirection(null);
          setDragOffset(0);
        }, 250);
      } else if (dragOffset < 0) {
        // Swipe left = next
        const nextIndex = currentCard + 1;
        if (shouldShowTest(nextIndex)) {
          setShowTestPrompt(true);
          setDragOffset(0);
        } else if (currentCard < totalCards - 1) {
          setSwipeDirection("left");
          setTimeout(() => {
            setCurrentCard(nextIndex);
            setDeckRotation((p) => (p + 1) % 3);
            setIsFlipped(false);
            setSwipeDirection(null);
            setDragOffset(0);
          }, 250);
        } else {
          // At last card, trigger final test
          setShowTestPrompt(true);
          setDragOffset(0);
        }
      } else {
        setDragOffset(0);
      }
    } else {
      setDragOffset(0);
    }
    setDragStart(null);
    setIsDragging(false);
  };

  const handleCardClick = () => {
    if (!isDragging && Math.abs(dragOffset) < 10) setIsFlipped(!isFlipped);
  };

  const handleNextButton = () => {
    cancelSpeech();
    const nextIndex = currentCard + 1;
    if (shouldShowTest(nextIndex)) {
      setShowTestPrompt(true);
    } else if (currentCard < totalCards - 1) {
      setSwipeDirection("left");
      setTimeout(() => {
        setCurrentCard(nextIndex);
        setDeckRotation((p) => (p + 1) % 3);
        setIsFlipped(false);
        setSwipeDirection(null);
      }, 250);
    } else {
      setShowTestPrompt(true);
    }
  };

  const handlePreviousButton = () => {
    cancelSpeech();
    if (showTestPrompt) {
      setShowTestPrompt(false);
      setIsFlipped(false);
    } else if (currentCard > 0) {
      setSwipeDirection("right");
      setTimeout(() => {
        setCurrentCard(currentCard - 1);
        setDeckRotation((p) => (p - 1 + 3) % 3);
        setIsFlipped(false);
        setSwipeDirection(null);
      }, 250);
    }
  };

  const handleShuffle = () => {
    setFlashcardSet([...flashcardSet].sort(() => Math.random() - 0.5));
    setIsFlipped(false);
    setShowTestPrompt(false);
    setCompletedTests(new Set());
    setCurrentCard(0);
    setDeckRotation(0);
  };

  const handleReset = () => {
    setCurrentCard(0);
    setIsFlipped(false);
    setCompletedTests(new Set());
    setShowTestPrompt(false);
    setDeckRotation(0);
  };

  const generateTestQuestions = (indices, isFinal) => {
    const cards = indices.map((i) => flashcardSet[i]).filter(Boolean);
    if (!cards.length || cards.length < 4) return [];
    const shuffled = [...cards].sort(() => Math.random() - 0.5);
    let qs = [];
    const count = isFinal ? 25 : 10;
    const types = [
      "mcq",
      "truefalse",
      "fill_typing",
      "fill_options",
      "mcq_multi",
      "sentence_reorder",
      "sentence_correction",
      "matching",
    ];

    for (let i = 0; i < count && i < shuffled.length; i++) {
      const c = shuffled[i];
      const type = types[i % types.length];
      const wrongOpts = shuffled
        .filter((_, j) => j !== i)
        .slice(0, 3)
        .map((x) => x.front_meaning);

      if (type === "mcq" && wrongOpts.length >= 3) {
        qs.push({
          type: "mcq",
          question: c.front_de,
          questionLabel: "Choose correct meaning",
          options: [c.front_meaning, ...wrongOpts].sort(
            () => Math.random() - 0.5,
          ),
          correctAnswer: c.front_meaning,
        });
      } else if (type === "truefalse") {
        const isCorrect = Math.random() > 0.5;
        const wrongIdx = (i + 1) % shuffled.length;
        qs.push({
          type: "truefalse",
          question: c.front_de,
          displayAnswer: isCorrect
            ? c.front_meaning
            : shuffled[wrongIdx].front_meaning,
          questionLabel: "Is this correct?",
          correctAnswer: isCorrect,
        });
      } else if (type === "fill_typing") {
        qs.push({
          type: "fill_typing",
          question: `What is the German for "${c.front_meaning}"?`,
          questionLabel: "Type in German",
          correct: c.front_de.toLowerCase().trim(),
        });
      } else if (type === "fill_options" && wrongOpts.length >= 3) {
        qs.push({
          type: "fill_options",
          question: `Select the meaning of "${c.front_de}"`,
          questionLabel: "Select correct option",
          options: [c.front_meaning, ...wrongOpts].sort(
            () => Math.random() - 0.5,
          ),
          correctAnswer: c.front_meaning,
        });
      } else if (type === "mcq_multi" && wrongOpts.length >= 3) {
        qs.push({
          type: "mcq_multi",
          question: `Which is the meaning of "${c.front_de}"?`,
          questionLabel: "Select all correct",
          options: [c.front_meaning, ...wrongOpts].sort(
            () => Math.random() - 0.5,
          ),
          correctAnswer: [c.front_meaning],
        });
      } else if (type === "sentence_reorder") {
        const words = c.front_de.split(" ");
        if (words.length > 1) {
          qs.push({
            type: "sentence_reorder",
            questionLabel: "Order the words",
            question_data: {
              words: [...words].sort(() => Math.random() - 0.5),
              correct_order: words,
              hint_en: c.front_meaning,
            },
            correctAnswer: words.join(" "),
          });
        }
      } else if (type === "sentence_correction") {
        const words = c.front_de.split(" ");
        if (words.length > 1) {
          const wrongWord = words[0] + "xx";
          const incorrect = [wrongWord, ...words.slice(1)].join(" ");
          qs.push({
            type: "sentence_correction",
            questionLabel: "Correct the sentence",
            question_data: {
              incorrect_sentence: incorrect,
              correct_sentence: c.front_de,
              hint_en: c.front_meaning,
            },
            correctAnswer: c.front_de.toLowerCase().trim(),
          });
        }
      } else if (type === "matching" && shuffled.length >= 4) {
        const subset = shuffled.slice(0, 4);
        qs.push({
          type: "matching",
          questionLabel: "Match pairs",
          question_data: {
            left_items: subset.map((x) => x.front_de),
            right_items: subset
              .map((x) => x.front_meaning)
              .sort(() => Math.random() - 0.5),
            correct_pairs: subset.map((x) => x.front_meaning),
          },
          correctAnswer: subset.map((x) => x.front_meaning),
        });
      }
    }
    return qs.sort(() => Math.random() - 0.5);
  };

  const startTest = () => {
    const n = currentCard + 1;
    const isFin = n >= totalCards;
    const alreadyPassed = completedTests.has(n);
    setTestQuestions(
      generateTestQuestions(
        isFin
          ? Array.from({ length: totalCards }, (_, i) => i)
              .sort(() => Math.random() - 0.5)
              .slice(0, 25)
          : Array.from(
              { length: Math.min(20, n) },
              (_, i) => n - Math.min(20, n) + i,
            ),
        isFin,
      ),
    );
    setShowTest(true);
    setShowTestPrompt(false);
    setIsFinalTest(isFin);
    setUserAnswers({});
    if (alreadyPassed) {
      setTestResults({ correct: 10, total: 10, passed: true });
      setTestSubmitted(true);
    } else {
      setTestSubmitted(false);
      setTestResults(null);
    }
    setIsSubmitting(false);
  };

  const skipTest = () => {
    setShowTestPrompt(false);
    setShowTest(false);
    if (currentCard < totalCards - 1) {
      setCurrentCard(currentCard + 1);
      setDeckRotation((p) => (p + 1) % 3);
      setIsFlipped(false);
    }
  };

  const checkAnswer = (q, ans) => {
    if (q.type === "fill_typing" || q.type === "sentence_correction") {
      return (
        String(ans || "")
          .toLowerCase()
          .trim() ===
        String(q.correctAnswer || q.correct || "")
          .toLowerCase()
          .trim()
      );
    }
    if (q.type === "mcq_multi" || q.type === "matching") {
      return (
        JSON.stringify([...(ans || [])].sort()) ===
        JSON.stringify([...(q.correctAnswer || [])].sort())
      );
    }
    if (q.type === "sentence_reorder") {
      return (ans || []).join(" ") === q.correctAnswer;
    }
    return ans === q.correctAnswer;
  };

  const submitTest = () => {
    setIsSubmitting(true);
    setTimeout(() => {
      let c = 0;
      testQuestions.forEach((q, i) => {
        if (checkAnswer(q, userAnswers[i])) c++;
      });
      const p = c >= Math.ceil(testQuestions.length * 0.6);
      setTestResults({ correct: c, total: testQuestions.length, passed: p });
      if (isFinalTest && p)
        saveFlashcardProgress({
          setId,
          currentIndex: totalCards - 1,
          isCompleted: true,
        }).catch(console.error);
      if (!isFinalTest && p) {
        const nc = new Set(completedTests);
        nc.add(currentCard + 1);
        setCompletedTests(nc);
      }
      setTestSubmitted(true);
      setIsSubmitting(false);
    }, 1500);
  };

  const continueAfterTest = () => {
    setShowTest(false);
    if (isFinalTest) navigate("/a2/flashcard");
    else {
      setCurrentCard(currentCard + 1);
      setDeckRotation((p) => (p + 1) % 3);
    }
    setIsFlipped(false);
    setIsFinalTest(false);
  };

  const isAtFinalTest = currentCard >= totalCards - 1;
  const isPassed = completedTests.has(currentCard + 1);

  // Stable callback for when animation finishes
  const handleStreakCounterComplete = useCallback(() => {
    setDailyGoalReached(true);
    setShowStreakCelebration(true);
  }, []);

  // TEST PROMPT VIEW
  if (showTestPrompt) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <div className="px-4 py-2.5">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate("/a2/flashcard")}
              className="flex items-center gap-2 text-sm font-semibold text-[#181d27]"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
            <span className="text-sm font-semibold text-[#7b7b7b]">
              Test Time
            </span>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="bg-white rounded-2xl p-8 text-center max-w-md shadow-lg border border-[#e0e0e0]">
            <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-[#edb843] to-[#f5cc6a] rounded-2xl flex items-center justify-center shadow-md">
              {isAtFinalTest ? (
                <Award className="w-10 h-10 text-white" />
              ) : (
                <Target className="w-10 h-10 text-white" />
              )}
            </div>
            <h2 className="text-2xl font-bold text-[#002856] mb-2">
              {isAtFinalTest ? "Final Assessment!" : "Test Checkpoint!"}
            </h2>
            <p className="text-sm text-[#7b7b7b] mb-2">
              {isAtFinalTest
                ? "Complete the final test to finish."
                : `You've completed ${currentCard + 1} cards. Test time!`}
            </p>
            <div className="flex items-center justify-center gap-2 mb-6">
              <div className="px-3 py-1 bg-[#f0f0f0] rounded-full">
                <span className="text-xs font-medium text-[#002856]">
                  {isFinalTest ? "25 questions" : "10 questions"}
                </span>
              </div>
              <div className="px-3 py-1 bg-[#f0f0f0] rounded-full">
                <span className="text-xs font-medium text-[#002856]">
                  60% to pass
                </span>
              </div>
            </div>
            <div className="flex gap-3 justify-center">
              <button
                onClick={handlePreviousButton}
                className="p-3 bg-white border border-[#d9d9d9] rounded-xl shadow-sm hover:bg-gray-50"
              >
                <ChevronLeft className="w-5 h-5 text-[#414651]" />
              </button>
              <button
                onClick={startTest}
                className={`px-8 py-3 text-white rounded-xl font-semibold shadow-md ${
                  isPassed
                    ? "bg-[#019035] hover:bg-[#017a2c]"
                    : "bg-[#edb843] hover:bg-[#d9a53a]"
                }`}
              >
                {isPassed
                  ? "Review Results"
                  : isAtFinalTest
                    ? "Start Final Test"
                    : "Start Test"}
              </button>
              {!isAtFinalTest && (
                <button
                  onClick={skipTest}
                  className="p-3 bg-white border border-[#d9d9d9] rounded-xl shadow-sm hover:bg-gray-50"
                >
                  <ChevronRight className="w-5 h-5 text-[#414651]" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // TEST VIEW
  if (showTest) {
    const answeredCount = Object.keys(userAnswers).length;
    const progress = (answeredCount / testQuestions.length) * 100;

    return (
      <div className="min-h-screen bg-white flex flex-col">
        <div className="px-4 py-3 border-b border-[#efefef] bg-white sticky top-0 z-10">
          <div className="flex items-center justify-between mb-2">
            <button
              onClick={() => {
                setShowTest(false);
                setShowTestPrompt(true);
              }}
              className="flex items-center gap-2 text-sm font-semibold text-[#181d27]"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
            <span className="text-sm font-semibold text-[#002856]">
              {isFinalTest ? "Final Test" : "Quick Test"}
            </span>
            <span className="text-xs font-medium text-[#7b7b7b] bg-[#f0f0f0] px-2 py-1 rounded-full">
              {answeredCount}/{testQuestions.length}
            </span>
          </div>
          <div className="h-1.5 bg-[#f0f0f0] rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                isSubmitting ? "animate-pulse bg-blue-500" : "bg-[#edb843]"
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
        <div className="flex-1 px-4 py-6 overflow-y-auto">
          {!testSubmitted ? (
            <div className="space-y-4 max-w-2xl mx-auto">
              {testQuestions.map((q, qIndex) => (
                <div
                  key={qIndex}
                  className={`bg-white border rounded-2xl p-5 transition-all ${
                    userAnswers[qIndex] !== undefined
                      ? "border-[#edb843] shadow-sm"
                      : "border-[#e0e0e0]"
                  }`}
                >
                  <p className="text-[10px] text-gray-400 uppercase tracking-widest font-medium mb-2">
                    {q.questionLabel}
                  </p>
                  <p className="text-lg font-bold text-[#002856] mb-4 leading-snug">
                    <span className="inline-flex items-center justify-center w-6 h-6 bg-[#002856] text-white text-xs rounded-full mr-2">
                      {qIndex + 1}
                    </span>
                    {q.type === "truefalse"
                      ? `"${q.question}" = "${q.displayAnswer}"`
                      : q.type === "sentence_correction"
                        ? q.question_data?.incorrect_sentence
                        : q.type === "sentence_reorder"
                          ? `Arrange: ${q.question_data?.hint_en}`
                          : q.type === "matching"
                            ? "Match the pairs below"
                            : q.question || ""}
                  </p>
                  <div className="space-y-2">
                    {(q.type === "mcq" || q.type === "fill_options") &&
                      q.options?.map((opt, oIndex) => (
                        <div
                          key={oIndex}
                          onClick={() =>
                            setUserAnswers({ ...userAnswers, [qIndex]: opt })
                          }
                          className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                            userAnswers[qIndex] === opt
                              ? "border-[#edb843] bg-[#fffbf0]"
                              : "border-[#e0e0e0] hover:border-[#edb843]"
                          }`}
                        >
                          <div
                            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                              userAnswers[qIndex] === opt
                                ? "border-[#edb843] bg-[#edb843]"
                                : "border-[#d0d0d0]"
                            }`}
                          >
                            {userAnswers[qIndex] === opt && (
                              <Check className="w-3 h-3 text-white" />
                            )}
                          </div>
                          <span className="text-sm text-[#181d27]">{opt}</span>
                        </div>
                      ))}
                    {q.type === "truefalse" && (
                      <div className="flex gap-3">
                        {[true, false].map((val) => (
                          <div
                            key={String(val)}
                            onClick={() =>
                              setUserAnswers({ ...userAnswers, [qIndex]: val })
                            }
                            className={`flex-1 flex items-center justify-center gap-2 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                              userAnswers[qIndex] === val
                                ? "border-[#002856] bg-[#edfaff]"
                                : "border-[#e0e0e0] hover:border-[#888]"
                            }`}
                          >
                            <span
                              className={`text-sm font-semibold ${
                                userAnswers[qIndex] === val
                                  ? "text-[#002856]"
                                  : "text-[#555]"
                              }`}
                            >
                              {val ? "True" : "False"}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                    {(q.type === "fill_typing" ||
                      q.type === "sentence_correction") && (
                      <input
                        type="text"
                        className="w-full p-4 border rounded-xl"
                        placeholder={
                          q.type === "sentence_correction"
                            ? "Type corrected sentence"
                            : "Type your answer"
                        }
                        value={userAnswers[qIndex] || ""}
                        onChange={(e) =>
                          setUserAnswers({
                            ...userAnswers,
                            [qIndex]: e.target.value,
                          })
                        }
                      />
                    )}
                    {q.type === "mcq_multi" &&
                      q.options?.map((opt, oIndex) => {
                        const current = userAnswers[qIndex] || [];
                        const isSel = current.includes(opt);
                        return (
                          <div
                            key={oIndex}
                            onClick={() => {
                              const newArr = isSel
                                ? current.filter((x) => x !== opt)
                                : [...current, opt];
                              setUserAnswers({
                                ...userAnswers,
                                [qIndex]: newArr,
                              });
                            }}
                            className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                              isSel
                                ? "border-[#edb843] bg-[#fffbf0]"
                                : "border-[#e0e0e0]"
                            }`}
                          >
                            <div
                              className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                                isSel
                                  ? "border-[#edb843] bg-[#edb843]"
                                  : "border-[#d0d0d0]"
                              }`}
                            >
                              {isSel && (
                                <Check className="w-3 h-3 text-white" />
                              )}
                            </div>
                            <span className="text-sm text-[#181d27]">
                              {opt}
                            </span>
                          </div>
                        );
                      })}
                    {q.type === "sentence_reorder" && (
                      <QuizSentenceReorder
                        question={q}
                        value={userAnswers[qIndex]}
                        onChange={(val) =>
                          setUserAnswers({ ...userAnswers, [qIndex]: val })
                        }
                      />
                    )}
                    {q.type === "matching" && (
                      <QuizMatching
                        question={q}
                        value={userAnswers[qIndex]}
                        onChange={(val) =>
                          setUserAnswers({ ...userAnswers, [qIndex]: val })
                        }
                        showResult={false}
                      />
                    )}
                  </div>
                </div>
              ))}
              <button
                onClick={submitTest}
                disabled={
                  answeredCount !== testQuestions.length || isSubmitting
                }
                className={`w-full py-4 rounded-2xl font-bold text-lg transition-all flex items-center justify-center gap-2 ${
                  answeredCount === testQuestions.length && !isSubmitting
                    ? "bg-[#002856] text-white hover:bg-[#003a70] shadow-lg"
                    : "bg-[#e0e0e0] text-[#999] cursor-not-allowed"
                }`}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Submitting...</span>
                  </>
                ) : (
                  "Submit Test"
                )}
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 max-w-md mx-auto">
              <div
                className={`w-24 h-24 rounded-full flex items-center justify-center mb-6 shadow-lg ${
                  testResults.passed
                    ? "bg-gradient-to-br from-[#019035] to-[#34d399]"
                    : "bg-gradient-to-br from-[#dc2626] to-[#f87171]"
                }`}
              >
                {testResults.passed ? (
                  <Check className="w-12 h-12 text-white" />
                ) : (
                  <X className="w-12 h-12 text-white" />
                )}
              </div>
              <h2
                className={`text-3xl font-bold mb-2 ${
                  testResults.passed ? "text-[#019035]" : "text-[#dc2626]"
                }`}
              >
                {testResults.passed ? "Excellent!" : "Keep Trying!"}
              </h2>
              <p className="text-[#7b7b7b] text-center mb-4">
                {testResults.passed
                  ? "You've mastered these cards!"
                  : "Review the cards and try again."}
              </p>
              <div className="bg-[#f8f8f8] rounded-2xl p-6 w-full mb-6">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#7b7b7b]">Your Score</span>
                  <span
                    className={`text-2xl font-bold ${
                      testResults.passed ? "text-[#019035]" : "text-[#dc2626]"
                    }`}
                  >
                    {Math.round(
                      (testResults.correct / testResults.total) * 100,
                    )}
                    %
                  </span>
                </div>
                <div className="mt-2 h-2 bg-[#e0e0e0] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      testResults.passed ? "bg-[#019035]" : "bg-[#dc2626]"
                    }`}
                    style={{
                      width: `${
                        (testResults.correct / testResults.total) * 100
                      }%`,
                    }}
                  />
                </div>
                <p className="text-xs text-[#7b7b7b] mt-2 text-center">
                  {testResults.correct} of {testResults.total} correct
                </p>
              </div>
              {testResults.passed ? (
                <button
                  onClick={continueAfterTest}
                  className="w-full py-4 bg-[#019035] text-white rounded-2xl font-bold text-lg hover:bg-[#017a2c] shadow-lg"
                >
                  {isFinalTest ? "Complete Chapter ✓" : "Continue →"}
                </button>
              ) : (
                <div className="flex gap-3 w-full">
                  <button
                    onClick={() => {
                      setTestSubmitted(false);
                      setUserAnswers({});
                    }}
                    className="flex-1 py-4 bg-[#edb843] text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-[#d9a53a]"
                  >
                    <RefreshCw className="w-5 h-5" /> Retry
                  </button>
                  {!isFinalTest && (
                    <button
                      onClick={skipTest}
                      className="flex-1 py-4 bg-[#f0f0f0] text-[#666] rounded-2xl font-bold hover:bg-[#e0e0e0]"
                    >
                      Skip
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // MAIN VIEW
  return (
    <div className="min-h-100dvh bg-white flex flex-col">
      <div className="px-4 py-2.5">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate("/a2/flashcard")}
            className="flex items-center gap-2 text-sm font-semibold text-[#181d27]"
          >
            <ChevronLeft className="w-4 h-4" /> Back
          </button>
          <span className="text-sm font-semibold text-[#7b7b7b]">
            {chapterName}
          </span>
        </div>
      </div>
      <div className="bg-gradient-to-b from-[#edfaff] to-white px-4 pt-4 pb-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-[30px] font-semibold text-[#002856]">
            Flashcards
          </h1>
          <span className="text-base font-semibold text-[#002856]">
            {currentCard + 1}/{totalCards}
          </span>
        </div>
        <ProgressBar current={currentCard + 1} total={totalCards} />
      </div>
      <div
        id="flashcard-container"
        className="flex flex-col items-center justify-center px-4 py-10 relative overflow-hidden -mb-2"
      >
        {loading ? (
          <div className="w-[280px] h-[430px] bg-white rounded-[20px] shadow-lg animate-pulse flex flex-col items-center justify-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gray-200" />
            <div className="w-40 h-4 rounded bg-gray-200" />
            <div className="w-32 h-3 rounded bg-gray-100" />
          </div>
        ) : (
          <A2FlashcardDeck
            flashcardSet={flashcardSet}
            currentCard={currentCard}
            totalCards={totalCards}
            isFlipped={isFlipped}
            swipeDirection={swipeDirection}
            dragOffset={dragOffset}
            isDragging={isDragging}
            deckRotation={deckRotation}
            handleDragStart={handleDragStart}
            handleDragMove={handleDragMove}
            handleDragEnd={handleDragEnd}
            onCardClick={handleCardClick}
            isSpeaking={isSpeaking}
            isLoadingAudio={isLoadingAudio}
            onSpeak={handleSpeak}
          />
        )}
      </div>
      <div className="flex items-center justify-center gap-2 pb-8 z-10">
        <button
          onClick={handlePreviousButton}
          disabled={currentCard === 0}
          className="px-3 py-2 bg-white border border-[#d9d9d9] rounded-lg shadow-sm disabled:opacity-50 hover:bg-gray-50"
        >
          <ChevronLeft className="w-6 h-6 text-[#414651]" />
        </button>
        <button
          onClick={handleShuffle}
          className="px-3 py-2 bg-white border border-[#d9d9d9] rounded-lg shadow-sm hover:bg-gray-50 flex items-center gap-1.5"
        >
          <Shuffle className="w-[18px] h-[18px] text-[#181d27]" />
          <span className="text-sm font-semibold text-[#181d27]">Shuffle</span>
        </button>
        <button
          onClick={handleReset}
          className="px-3 py-2 bg-white border border-[#d9d9d9] rounded-lg shadow-sm hover:bg-gray-50 flex items-center gap-1.5"
        >
          <RotateCcw className="w-[18px] h-[18px] text-[#181d27]" />
          <span className="text-sm font-semibold text-[#181d27]">Reset</span>
        </button>
        <button
          onClick={handleNextButton}
          className="px-3 py-2 bg-white border border-[#d9d9d9] rounded-lg shadow-sm hover:bg-gray-50"
        >
          <ChevronRight className="w-6 h-6 text-[#414651]" />
        </button>
      </div>

      {/* Streak Celebration Modal */}
      <StreakCelebrationModal
        showStreakCelebration={showStreakCelebration}
        setShowStreakCelebration={setShowStreakCelebration}
        streakInfo={streakInfo}
      />

      {/* FLOATING COUNTER */}
      {!showStreakCelebration &&
        !dailyGoalReached &&
        localStreakCount <= streakInfo.dailyGoal && (
          <FloatingStreakCounter
            key={chapterId}
            current={localStreakCount}
            target={streakInfo.dailyGoal}
            onComplete={handleStreakCounterComplete}
          />
        )}
    </div>
  );
}
