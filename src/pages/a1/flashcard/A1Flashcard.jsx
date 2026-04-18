import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Shuffle,
  RotateCcw,
  Target,
  Award,
  Loader2,
  Check,
  X,
} from "lucide-react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useSelector } from "react-redux";

import A1FlashcardDeck from "../../../components/a1/A1FlashcardDeck";
import {
  generateTestQuestions,
  QuizMatching,
} from "../../../components/a1/A1QuizComponents";
import ProgressBar from "../../../components/a2/ProgressBar";
import UmlautKeyboard from "../../../components/a2/UmlautKeyboard";
import { getFlashcards, saveFlashcardProgress } from "../../../api/a1Api";
import api from "../../../api/axios";
import FloatingStreakCounter from "../../../components/FloatingStreakCounter";
import StreakCelebrationModal from "../../../components/StreakCelebrationModal";
import useTextToSpeech from "../../pronounce/hooks/useTextToSpeech";
import { usePostHog } from "@posthog/react";

const CustomDropdown = ({
  options,
  value,
  onChange,
  disabled,
  placeholder = "Select...",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 });

  useEffect(() => {
    const handleInteraction = (event) => {
      if (dropdownRef.current && dropdownRef.current.contains(event.target)) {
        return;
      }
      setIsOpen(false);
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleInteraction);
      window.addEventListener("scroll", handleInteraction, true);
      window.addEventListener("resize", handleInteraction);
    }

    return () => {
      document.removeEventListener("mousedown", handleInteraction);
      window.removeEventListener("scroll", handleInteraction, true);
      window.removeEventListener("resize", handleInteraction);
    };
  }, [isOpen]);

  const toggleDropdown = () => {
    if (disabled) return;

    if (!isOpen && dropdownRef.current) {
      const rect = dropdownRef.current.getBoundingClientRect();
      setDropdownPos({
        top: rect.bottom + 8,
        left: rect.left,
        width: rect.width,
      });
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  };

  const selectedLabel =
    value !== undefined && value !== null && value !== "" ? value : placeholder;

  return (
    <div className="relative flex-1 min-w-[140px]" ref={dropdownRef}>
      <button
        onClick={toggleDropdown}
        disabled={disabled}
        className={`w-full p-3 rounded-xl border-2 flex items-center justify-between transition-all ${
          isOpen
            ? "border-[#002856] ring-2 ring-[#002856]/10 bg-white text-[#002856]"
            : value
              ? "border-[#002856] bg-[#edfaff] text-[#002856]"
              : "border-gray-200 bg-white text-gray-700"
        } ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}
      >
        <span className="mr-2 text-left">{selectedLabel}</span>
        <ChevronDown
          className={`w-4 h-4 shrink-0 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen &&
        !disabled &&
        createPortal(
          <div
            className="fixed z-[9999] bg-white border border-gray-100 rounded-xl shadow-xl max-h-60 overflow-y-auto"
            style={{
              top: dropdownPos.top,
              left: dropdownPos.left,
              width: dropdownPos.width,
            }}
          >
            <div className="p-1">
              {(options || []).map((opt, idx) => (
                <button
                  key={idx}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onChange(opt);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                    value === opt
                      ? "bg-[#edfaff] text-[#002856]"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
};

const normalizeGermanDisplay = (value) => {
  const text = String(value || "").trim();
  if (!text) return "";
  const parts = text.split(/\s+/);
  if (parts.length >= 2) {
    const first = parts[0].toLowerCase();
    if (first === "der" || first === "die" || first === "das") {
      const noun = parts.slice(1).join(" ");
      return `${first} ${noun.charAt(0).toUpperCase() + noun.slice(1)}`;
    }
  }
  return text;
};

export default function A1Flashcard() {
  const { chapterId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const posthog = usePostHog();

  const [currentCard, setCurrentCard] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [flashcardSet, setFlashcardSet] = useState([]);
  const [setId, setSetId] = useState(null);
  const [deckRotation, setDeckRotation] = useState(0);
  const [loading, setLoading] = useState(true);

  const [swipeDirection, setSwipeDirection] = useState(null);

  const [showTestPrompt, setShowTestPrompt] = useState(false);
  const [showTest, setShowTest] = useState(false);
  const [testQuestions, setTestQuestions] = useState([]);
  const [userAnswers, setUserAnswers] = useState({});
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [testResults, setTestResults] = useState(null);
  const [completedTests, setCompletedTests] = useState(new Set());
  const [isFinalTest, setIsFinalTest] = useState(false);
  const [lockedCorrectSet, setLockedCorrectSet] = useState(new Set());
  const [originalTestTotal, setOriginalTestTotal] = useState(0);
  const [activeQIndices, setActiveQIndices] = useState([]);
  const [quizSnapshots, setQuizSnapshots] = useState({});
  const [currentQuizKey, setCurrentQuizKey] = useState("");

  // --- Streak tracking (aligned with A2 flow) ---
  const flippedCardsRef = useRef(new Set());
  const prevIsFlipped = useRef(false);
  const [showStreakCelebration, setShowStreakCelebration] = useState(false);
  const [dailyGoalReached, setDailyGoalReached] = useState(false);
  const [streakInfo, setStreakInfo] = useState({
    todayFlashcards: 0,
    dailyGoal: 20,
    streakDays: 0,
  });
  const [localStreakCount, setLocalStreakCount] = useState(0);

  const { isSpeaking, isLoadingAudio, speakText, cancelSpeech } =
    useTextToSpeech();

  const totalCards = flashcardSet.length;
  const chapterName = searchParams.get("name") || "Chapter";
  const isAtFinalCard = currentCard >= totalCards - 1;

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      try {
        const response = await getFlashcards(chapterId);
        const data = response?.data || {};
        const cards = data.cards || [];
        setFlashcardSet(cards);
        setSetId(data.setId || null);
        posthog?.capture("learning_module_started", {
          module: "A1 Flashcard",
          level: "A1",
          chapter_id: chapterId,
          total_cards: cards.length,
        });

        const urlStartIndex = parseInt(searchParams.get("start_index"), 10);
        if (!Number.isNaN(urlStartIndex) && urlStartIndex >= 0) {
          setCurrentCard(
            Math.min(urlStartIndex, Math.max(cards.length - 1, 0)),
          );
        } else if (data.progress?.current_index > 0) {
          setCurrentCard(
            Math.min(
              data.progress.current_index,
              Math.max(cards.length - 1, 0),
            ),
          );
        }

        const tests = new Set();
        if (data.progress?.mini_quiz_passed) {
          tests.add(20);
        }
        if (data.progress?.final_quiz_passed) {
          tests.add(cards.length);
        }
        setCompletedTests(tests);
        setQuizSnapshots({});
      } catch (err) {
        console.error("Error loading A1 flashcards:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [chapterId, user, navigate, searchParams]);

  useEffect(() => {
    if (!setId || totalCards === 0 || !user) return;
    saveFlashcardProgress({
      setId,
      currentIndex: currentCard,
      isCompleted: completedTests.has(totalCards),
    }).catch((err) => console.error("Progress save failed:", err));
  }, [currentCard, user, setId, totalCards, completedTests]);

  useEffect(() => {
    return () => cancelSpeech();
  }, [cancelSpeech]);

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

  const handleStreakComplete = () => {
    setDailyGoalReached(true);
    setShowStreakCelebration(true);
  };

  useEffect(() => {
    const justFlipped = isFlipped && !prevIsFlipped.current;
    prevIsFlipped.current = isFlipped;

    if (!user?.user_id || loading) return;
    if (!justFlipped) return;

    // Count only the first flip of each card in this session.
    if (!flippedCardsRef.current.has(currentCard)) {
      flippedCardsRef.current.add(currentCard);
      setLocalStreakCount((prev) => prev + 1);

      api
        .post("/streak/log")
        .then((streakRes) => {
          if (streakRes.data.streakUpdated) {
            setStreakInfo({
              todayFlashcards: streakRes.data.todayPoints,
              dailyGoal: streakRes.data.dailyGoal,
              streakDays: streakRes.data.currentStreak || 1,
            });
            setDailyGoalReached(true);
            setShowStreakCelebration(true);
          }
        })
        .catch((err) => {
          setLocalStreakCount((prev) => Math.max(0, prev - 1));
          console.error("Error logging A1 flashcard streak:", err);
        });
    }
  }, [isFlipped, currentCard, user?.user_id, loading]);

  const handleSpeak = (text, lang = "de-DE") => {
    if (text) speakText(text, lang);
  };

  const shouldOpenTestPrompt = (nextCardIndex) => {
    if (nextCardIndex >= totalCards) return true;
    if (nextCardIndex > 0 && nextCardIndex % 20 === 0) return true;
    return false;
  };

  const moveToNextCard = () => {
    if (currentCard >= totalCards - 1 || swipeDirection) return;

    setSwipeDirection("left");
    setTimeout(() => {
      setCurrentCard((prev) => prev + 1);
      setDeckRotation((prev) => (prev + 1) % 3);
      setIsFlipped(false);
      setSwipeDirection(null);
    }, 250);
  };

  const moveToPreviousCard = () => {
    if (currentCard <= 0 || swipeDirection) return;

    setSwipeDirection("right");
    setTimeout(() => {
      setCurrentCard((prev) => prev - 1);
      setDeckRotation((prev) => (prev - 1 + 3) % 3);
      setIsFlipped(false);
      setSwipeDirection(null);
    }, 250);
  };

  const handleNextButton = () => {
    if (swipeDirection) return;
    cancelSpeech();
    const nextIndex = currentCard + 1;

    if (shouldOpenTestPrompt(nextIndex)) {
      setIsFinalTest(nextIndex >= totalCards);
      setShowTestPrompt(true);
      return;
    }

    moveToNextCard();
  };

  const handlePreviousButton = () => {
    if (swipeDirection) return;
    cancelSpeech();
    if (showTestPrompt) {
      setShowTestPrompt(false);
      setIsFlipped(false);
      return;
    }
    moveToPreviousCard();
  };

  const handleShuffle = () => {
    setFlashcardSet((prev) => [...prev].sort(() => Math.random() - 0.5));
    setCurrentCard(0);
    setDeckRotation(0);
    setIsFlipped(false);
    setShowTestPrompt(false);
    setQuizSnapshots({});
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleReset = () => {
    setCurrentCard(0);
    setDeckRotation(0);
    setIsFlipped(false);
    setShowTestPrompt(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const buildQuestionSignature = (q) => {
    if (!q) return "";

    if (q.type === "matching") {
      const left = JSON.stringify(q.question_data?.left_items || []);
      const correct = JSON.stringify(q.correctAnswer || []);
      return `matching|${left}|${correct}`;
    }

    const qText = String(q.question || "")
      .trim()
      .toLowerCase();
    const qImg = String(q.question_image || "")
      .trim()
      .toLowerCase();
    const correct = String(q.correctAnswer ?? q.correct ?? "")
      .trim()
      .toLowerCase();

    return `${q.type || ""}|${qText}|${qImg}|${correct}`;
  };

  const buildTestIndices = (isFin, n) => {
    if (isFin) {
      return Array.from({ length: totalCards }, (_, i) => i)
        .sort(() => Math.random() - 0.5)
        .slice(0, 25);
    }

    return Array.from(
      { length: Math.min(20, n) },
      (_, i) => n - Math.min(20, n) + i,
    );
  };

  const startTest = (forceReplay = false) => {
    const n = currentCard + 1;
    const isFin = n >= totalCards;
    const alreadyPassed = !forceReplay && completedTests.has(n);
    const targetCount = isFin ? Math.min(25, totalCards) : 10;
    const snapshotKey = isFin ? `final-${totalCards}` : `mini-${n}`;

    // Re-open the same in-progress quiz (mini/final) without resetting correct locks.
    if (
      !forceReplay &&
      currentQuizKey === snapshotKey &&
      testQuestions.length > 0 &&
      (lockedCorrectSet.size > 0 ||
        testSubmitted ||
        Object.keys(userAnswers || {}).length > 0)
    ) {
      setShowTest(true);
      setShowTestPrompt(false);
      setIsFinalTest(isFin);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    let qs = quizSnapshots[snapshotKey] || [];

    if (!qs.length) {
      const seen = new Set();
      const uniqueQuestions = [];

      // Retry a few times to avoid duplicate questions in the same test.
      for (let attempt = 0; attempt < 5; attempt++) {
        const candidate = generateTestQuestions(
          flashcardSet,
          buildTestIndices(isFin, n),
          isFin,
        );

        for (const q of candidate) {
          const key = buildQuestionSignature(q);
          if (!key || seen.has(key)) continue;
          seen.add(key);
          uniqueQuestions.push(q);
          if (uniqueQuestions.length >= targetCount) break;
        }

        if (uniqueQuestions.length >= targetCount) break;
      }

      qs = uniqueQuestions.slice(0, targetCount);
      setQuizSnapshots((prev) => ({ ...prev, [snapshotKey]: qs }));
    }

    const allIdx = Array.from({ length: qs.length }, (_, i) => i);
    setTestQuestions(qs);
    setOriginalTestTotal(qs.length);
    setActiveQIndices(allIdx);
    setLockedCorrectSet(new Set());
    setCurrentQuizKey(snapshotKey);
    setShowTest(true);
    setShowTestPrompt(false);
    setIsFinalTest(isFin);
    setUserAnswers({});
    window.scrollTo({ top: 0, behavior: "smooth" });

    if (alreadyPassed) {
      setTestResults({
        correct: qs.length,
        total: qs.length,
        passed: true,
        wrongIndices: [],
      });
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
    if (!isAtFinalCard) {
      setCurrentCard(currentCard + 1);
      setDeckRotation((p) => (p + 1) % 3);
      setIsFlipped(false);
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
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
    if (q.type === "matching") {
      if (!Array.isArray(ans)) return false;
      const leftItems = q.question_data?.left_items || [];
      const correctPairs = q.correctAnswer || [];
      if (ans.length !== leftItems.length) return false;
      const correctMap = {};
      leftItems.forEach((l, i) => {
        correctMap[l] = correctPairs[i];
      });
      return ans.every((pair) => pair.right === correctMap[pair.left]);
    }
    return ans === q.correctAnswer;
  };

  const submitTest = () => {
    setIsSubmitting(true);
    setTimeout(() => {
      const newCorrectIndices = [];
      const wrongIndices = [];
      activeQIndices.forEach((origIdx) => {
        if (lockedCorrectSet.has(origIdx)) return;
        if (checkAnswer(testQuestions[origIdx], userAnswers[origIdx])) {
          newCorrectIndices.push(origIdx);
        } else {
          wrongIndices.push(origIdx);
        }
      });
      const newLocked = new Set([...lockedCorrectSet, ...newCorrectIndices]);
      setLockedCorrectSet(newLocked);
      const total = originalTestTotal || testQuestions.length;
      const correct = newLocked.size;
      const p = correct >= Math.ceil(total * 0.6);
      posthog?.capture("learning_module_submitted", {
        module: "A1 Flashcard",
        level: "A1",
        chapter_id: chapterId,
        quiz_type: isFinalTest ? "final" : "mini",
        score_percent: total > 0 ? (correct / total) * 100 : 0,
        passed: p,
      });
      posthog?.capture("flashcard_quiz_submitted", {
        module: "A1 Flashcard",
        level: "A1",
        chapter_id: chapterId,
        quiz_type: isFinalTest ? "final" : "mini",
        score_percent: total > 0 ? (correct / total) * 100 : 0,
        passed: p,
      });
      setTestResults({ correct, total, passed: p, wrongIndices });

      if (isFinalTest && p) {
        saveFlashcardProgress({
          setId,
          currentIndex: totalCards - 1,
          isCompleted: true,
        }).catch(console.error);
        const nc = new Set(completedTests);
        nc.add(totalCards);
        setCompletedTests(nc);
      }
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
    if (isFinalTest) {
      posthog?.capture("learning_module_completed", {
        module: "A1 Flashcard",
        level: "A1",
        chapter_id: chapterId,
        total_cards: totalCards,
      });
      navigate("/a1/flashcard");
    } else {
      setCurrentCard(currentCard + 1);
      setDeckRotation((p) => (p + 1) % 3);
    }
    setIsFlipped(false);
    setIsFinalTest(false);
    setCurrentQuizKey("");
    setLockedCorrectSet(new Set());
    setUserAnswers({});
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const retryWrongOnly = () => {
    const wrong = testResults?.wrongIndices || [];
    if (!wrong.length) return;

    // Keep locked correct answers and clear only wrong attempts.
    setUserAnswers((prev) => {
      const next = { ...prev };
      wrong.forEach((idx) => {
        delete next[idx];
      });
      return next;
    });

    // Keep full list visible so correct ones appear grayed out.
    setActiveQIndices(
      Array.from({ length: testQuestions.length }, (_, i) => i),
    );
    setTestSubmitted(false);
    setTestResults(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const isAtFinalTest = currentCard >= totalCards - 1;
  const isPassed = completedTests.has(currentCard + 1);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#002856]" />
      </div>
    );
  }

  if (!flashcardSet.length) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center">
        <h2 className="text-2xl font-bold text-[#002856] mb-2">No Cards Yet</h2>
        <p className="text-sm text-gray-500 mb-6">
          This chapter does not have flashcards yet.
        </p>
        <button
          onClick={() => navigate("/a1/flashcard")}
          className="px-6 py-3 bg-[#002856] text-white rounded-xl font-semibold"
        >
          Back to Chapters
        </button>
      </div>
    );
  }

  // TEST PROMPT VIEW
  if (showTestPrompt) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <div className="px-4 py-2.5">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate("/a1/flashcard")}
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
                  {isFinalTest ? "Up to 25 questions" : "Up to 10 questions"}
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
                onClick={() => startTest(false)}
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
    const unlocked = activeQIndices.filter((i) => !lockedCorrectSet.has(i));
    const answeredCount = unlocked.filter(
      (i) => userAnswers[i] !== undefined,
    ).length;
    const totalActive = unlocked.length;
    const progress =
      totalActive > 0 ? (answeredCount / totalActive) * 100 : 100;

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
              {answeredCount}/{totalActive}
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
              {activeQIndices.map((origIdx) => {
                const q = testQuestions[origIdx];
                const qIndex = origIdx;
                const isLocked = lockedCorrectSet.has(qIndex);
                return (
                  <div
                    key={qIndex}
                    className={`border rounded-2xl p-5 transition-all ${
                      isLocked
                        ? "border-gray-300 bg-gray-100/90"
                        : userAnswers[qIndex] !== undefined
                          ? "border-[#edb843] bg-white shadow-sm"
                          : "border-[#e0e0e0] bg-white"
                    }`}
                    style={isLocked ? { pointerEvents: "none" } : {}}
                  >
                    {isLocked && (
                      <div className="mb-2 inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-100 text-green-700 text-[11px] font-semibold uppercase tracking-wide border border-green-200">
                        <Check className="w-3 h-3" />
                        Correct
                      </div>
                    )}
                    <p className="text-[10px] text-gray-400 uppercase tracking-widest font-medium mb-2">
                      {q.questionLabel}
                    </p>
                    <p className="text-lg font-bold text-[#002856] mb-4 leading-snug">
                      <span className="inline-flex items-center justify-center w-6 h-6 bg-[#002856] text-white text-xs rounded-full mr-2">
                        {qIndex + 1}
                      </span>
                      {q.type === "truefalse"
                        ? `"${normalizeGermanDisplay(q.question)}" = "${q.displayAnswer}"`
                        : q.type === "sentence_correction"
                          ? q.question_data?.incorrect_sentence
                          : q.type === "matching"
                            ? "Match the pairs below"
                            : q.type === "image_dropdown" ||
                                q.type === "image_mcq"
                              ? "Select the correct word from the dropdown"
                              : q.question || ""}
                    </p>
                    {(q.type === "image_mcq" || q.type === "image_dropdown") &&
                      q.question_image && (
                        <div className="mb-4 flex justify-center">
                          <img
                            src={q.question_image}
                            alt="Question Context"
                            className="h-40 object-contain rounded-xl border-2 border-dashed border-[#002856]/20"
                          />
                        </div>
                      )}
                    <div className="space-y-2">
                      {(q.type === "mcq" ||
                        q.type === "mcq_single" ||
                        q.type === "fill_options") && (
                        <div className="space-y-3">
                          {(q.options || []).map((opt, oIndex) => {
                            const optionLabel =
                              typeof opt === "object"
                                ? (opt.text ?? opt.label ?? opt.value ?? "")
                                : opt;
                            const isSelected =
                              userAnswers[qIndex] === optionLabel;

                            return (
                              <div
                                key={oIndex}
                                onClick={() =>
                                  setUserAnswers({
                                    ...userAnswers,
                                    [qIndex]: optionLabel,
                                  })
                                }
                                className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                                  isSelected
                                    ? "border-[#edb843] bg-[#fffbf0]"
                                    : "border-[#e0e0e0] hover:border-[#edb843]"
                                }`}
                              >
                                <div
                                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                    isSelected
                                      ? "border-[#edb843] bg-[#edb843]"
                                      : "border-[#d0d0d0]"
                                  }`}
                                >
                                  {isSelected && (
                                    <Check className="w-3 h-3 text-white" />
                                  )}
                                </div>
                                <span className="text-sm text-[#181d27]">
                                  {optionLabel}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                      {(q.type === "image_dropdown" ||
                        q.type === "image_mcq") && (
                        <div className="space-y-2">
                          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block">
                            Select one option
                          </label>
                          <CustomDropdown
                            options={(q.options || []).map((opt) =>
                              typeof opt === "object"
                                ? (opt.text ?? opt.label ?? opt.value ?? "")
                                : opt,
                            )}
                            value={userAnswers[qIndex] ?? ""}
                            onChange={(selectedValue) =>
                              setUserAnswers({
                                ...userAnswers,
                                [qIndex]: selectedValue,
                              })
                            }
                            disabled={isLocked}
                            placeholder="Select an answer"
                          />
                        </div>
                      )}
                      {q.type === "truefalse" && (
                        <div className="flex gap-3">
                          {[true, false].map((val) => (
                            <div
                              key={String(val)}
                              onClick={() =>
                                setUserAnswers({
                                  ...userAnswers,
                                  [qIndex]: val,
                                })
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
                        <div className="space-y-0">
                          <input
                            id={`fc-test-input-${qIndex}`}
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
                          <UmlautKeyboard
                            onInsert={(char) => {
                              const input = document.getElementById(
                                `fc-test-input-${qIndex}`,
                              );
                              const current = userAnswers[qIndex] || "";
                              if (!input) {
                                setUserAnswers({
                                  ...userAnswers,
                                  [qIndex]: current + char,
                                });
                                return;
                              }
                              const start =
                                input.selectionStart ?? current.length;
                              const end = input.selectionEnd ?? start;
                              const newVal =
                                current.slice(0, start) +
                                char +
                                current.slice(end);
                              setUserAnswers({
                                ...userAnswers,
                                [qIndex]: newVal,
                              });
                              requestAnimationFrame(() => {
                                input.focus();
                                input.setSelectionRange(
                                  start + char.length,
                                  start + char.length,
                                );
                              });
                            }}
                          />
                        </div>
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
                );
              })}
              <button
                onClick={submitTest}
                disabled={answeredCount !== totalActive || isSubmitting}
                className={`w-full py-4 rounded-2xl font-bold text-lg transition-all flex items-center justify-center gap-2 ${
                  answeredCount === totalActive && !isSubmitting
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
                  ? "You've mastered these words!"
                  : "Review the words and try again."}
              </p>
              <div className="bg-[#f8f8f8] rounded-2xl p-6 w-full mb-6">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#7b7b7b]">Words Mastered</span>
                  <span
                    className={`text-2xl font-bold ${
                      testResults.passed ? "text-[#019035]" : "text-[#dc2626]"
                    }`}
                  >
                    {testResults.correct} / {testResults.total}
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
                  {testResults.passed
                    ? "You need 60% to progress — great job!"
                    : `${testResults.total - testResults.correct} word${
                        testResults.total - testResults.correct !== 1 ? "s" : ""
                      } still need practice`}
                </p>
              </div>

              {(testResults.wrongIndices || []).length > 0 && (
                <div className="w-full mt-2 mb-6">
                  <p className="text-sm font-bold text-[#002856] mb-3">
                    Review Incorrect Answers
                  </p>
                  <div className="space-y-3">
                    {(testResults.wrongIndices || []).map((i) => {
                      const q = testQuestions[i];
                      if (!q) return null;

                      if (q.type === "matching") {
                        const leftItems = q.question_data?.left_items || [];
                        const correctPairs = q.correctAnswer || [];

                        return (
                          <div
                            key={i}
                            className="bg-red-50 border border-red-200 rounded-2xl p-4"
                          >
                            <div className="flex items-start gap-3 mb-3">
                              <span className="inline-flex items-center justify-center w-6 h-6 bg-red-500 text-white text-xs font-bold rounded-full flex-shrink-0 mt-0.5">
                                <X className="w-3 h-3" />
                              </span>
                              <div>
                                <p className="text-sm font-medium text-gray-800 mb-1">
                                  Match the pairs
                                </p>
                                <p className="text-xs text-gray-500">
                                  Correct matching table
                                </p>
                              </div>
                            </div>

                            <div className="overflow-hidden rounded-xl border border-red-200 bg-white">
                              <div className="grid grid-cols-2 bg-red-100/70 text-[11px] font-bold text-red-700 uppercase tracking-wide">
                                <div className="px-3 py-2 border-r border-red-200">
                                  Prompt
                                </div>
                                <div className="px-3 py-2">Correct Answer</div>
                              </div>
                              {leftItems.map((leftItem, rowIdx) => {
                                const isImage =
                                  typeof leftItem === "string" &&
                                  leftItem.startsWith("http");

                                return (
                                  <div
                                    key={`${i}-row-${rowIdx}`}
                                    className="grid grid-cols-2 border-t border-red-100"
                                  >
                                    <div className="px-3 py-2.5 border-r border-red-100">
                                      {isImage ? (
                                        <img
                                          src={leftItem}
                                          alt={`Matching prompt ${rowIdx + 1}`}
                                          className="h-14 w-full object-contain rounded-md bg-gray-50"
                                        />
                                      ) : (
                                        <span className="text-sm text-gray-800 font-medium">
                                          {normalizeGermanDisplay(leftItem)}
                                        </span>
                                      )}
                                    </div>
                                    <div className="px-3 py-2.5 text-sm text-green-700 font-semibold">
                                      {normalizeGermanDisplay(
                                        correctPairs[rowIdx],
                                      ) || "-"}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      }

                      const qText =
                        q.type === "sentence_correction"
                          ? q.question_data?.incorrect_sentence
                          : q.type === "truefalse"
                            ? `"${normalizeGermanDisplay(q.question)}" = "${q.displayAnswer}"`
                            : q.question || "Image Context";
                      const ansText = Array.isArray(q.correctAnswer)
                        ? q.correctAnswer
                            .map((v) => normalizeGermanDisplay(v))
                            .join(", ")
                        : q.type === "fill_typing"
                          ? q.correct || q.correctAnswer || ""
                          : q.type === "sentence_correction"
                            ? q.question_data?.correct_sentence ||
                              q.correctAnswer ||
                              ""
                            : q.type === "truefalse"
                              ? q.correctAnswer
                                ? "True"
                                : "False"
                              : normalizeGermanDisplay(
                                  String(q.correctAnswer ?? ""),
                                );
                      return (
                        <div
                          key={i}
                          className="bg-red-50 border border-red-200 rounded-2xl p-4"
                        >
                          <div className="flex items-start gap-3">
                            <span className="inline-flex items-center justify-center w-6 h-6 bg-red-500 text-white text-xs font-bold rounded-full flex-shrink-0 mt-0.5">
                              <X className="w-3 h-3" />
                            </span>
                            <div>
                              <p className="text-sm font-medium text-gray-800 mb-1">
                                {qText}
                              </p>
                              {q.type === "image_mcq" && q.question_image && (
                                <img
                                  src={q.question_image}
                                  className="h-16 rounded mt-1 mb-2"
                                  alt="Review"
                                />
                              )}
                              <p className="text-sm text-green-700 font-semibold bg-green-100/50 px-2 py-1 rounded inline-block mt-1">
                                Correct: {ansText}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="w-full flex gap-3">
                {!testResults.passed && (
                  <button
                    onClick={retryWrongOnly}
                    className="flex-1 py-4 rounded-2xl font-bold shadow-md transition-all bg-[#002856] text-white hover:bg-[#003a70]"
                  >
                    Retry Wrong Only
                  </button>
                )}
                {testResults.passed && (
                  <button
                    onClick={continueAfterTest}
                    className="flex-1 py-4 text-white bg-[#019035] hover:bg-[#017a2c] rounded-2xl font-bold shadow-md transition-all"
                  >
                    {isFinalTest ? "Finish Chapter" : "Continue"}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col relative overflow-hidden">
      <div className="px-4 py-2.5">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate("/a1/flashcard")}
            className="flex items-center gap-2 text-sm font-semibold text-[#181d27]"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Back</span>
          </button>
          <span className="text-sm font-semibold text-[#7b7b7b]">
            {chapterName}
          </span>
        </div>
      </div>

      <div className="bg-gradient-to-b from-[#edfaff] to-white px-4 pt-3 pb-3">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-[30px] font-semibold text-[#002856]">
            Flashcards
          </h1>
          <span className="text-base font-semibold text-[#002856]">
            {Math.min(currentCard + 1, totalCards)}/{totalCards}
          </span>
        </div>
        <ProgressBar current={currentCard + 1} total={totalCards} />
      </div>

      <div className="flex items-center justify-center px-2 pt-10 pb-4">
        <A1FlashcardDeck
          flashcardSet={flashcardSet}
          currentCard={currentCard}
          totalCards={totalCards}
          deckRotation={deckRotation}
          isFlipped={isFlipped}
          swipeDirection={swipeDirection}
          onSwipeLeft={moveToNextCard}
          onSwipeRight={moveToPreviousCard}
          shouldOpenTestPrompt={shouldOpenTestPrompt}
          onTestPromptTrigger={(nextIndex) => {
            setIsFinalTest(nextIndex >= totalCards);
            setShowTestPrompt(true);
          }}
          containerId="A1-flashcard-container"
          onCardClick={() => {
            setIsFlipped((prev) => {
              const next = !prev;
              if (next) {
                window.dispatchEvent(new Event("tour:A1FlashcardRevealed"));
              }
              return next;
            });
          }}
          onSpeak={handleSpeak}
          isSpeaking={isSpeaking}
          isLoadingAudio={isLoadingAudio}
        />
      </div>

      <div className="flex items-center justify-center gap-2 pb-8 z-10 w-full px-4">
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
          {isAtFinalCard ? (
            <span className="text-sm font-semibold text-[#181d27] px-1">
              Finish
            </span>
          ) : (
            <ChevronRight className="w-6 h-6 text-[#414651]" />
          )}
        </button>
      </div>

      <StreakCelebrationModal
        showStreakCelebration={showStreakCelebration}
        setShowStreakCelebration={setShowStreakCelebration}
        streakInfo={streakInfo}
      />

      {!showStreakCelebration &&
        !dailyGoalReached &&
        localStreakCount <= streakInfo.dailyGoal && (
          <FloatingStreakCounter
            key={chapterId}
            current={localStreakCount}
            target={streakInfo.dailyGoal}
            onComplete={handleStreakComplete}
          />
        )}
    </div>
  );
}
