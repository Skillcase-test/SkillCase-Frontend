import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ChevronLeft,
  ChevronRight,
  Shuffle,
  RotateCcw,
  Target,
  Award,
  Loader2,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useSelector } from "react-redux";

import A1FlashcardDeck from "../../../components/a1/A1FlashcardDeck";
import NursingCard from "../../../components/a1/nursing/NursingCard";
import NursingQuiz from "../../../components/a1/nursing/NursingQuiz";
import NursingDocumentSheet from "../../../components/a1/nursing/NursingDocumentSheet";
import NursingSegmentedBar from "../../../components/a1/nursing/NursingSegmentedBar";
import {
  getNursingChapter,
  saveNursingProgress,
  getNursingQuickQuiz,
  getNursingFinalQuiz,
  submitNursingQuiz,
} from "../../../api/a1NursingApi";
import api from "../../../api/axios";

import FloatingStreakCounter from "../../../components/FloatingStreakCounter";
import StreakCelebrationModal from "../../../components/StreakCelebrationModal";
import useTextToSpeech from "../../../hooks/useTextToSpeech";
import FlashcardDeckSkeleton from "../../../components/common/FlashcardDeckSkeleton";
import { useFirstPartyAnalytics } from "../../../telemetry/legacyAnalytics";
import { useFlashcardTelemetry } from "../../../telemetry/learning";
import { useUsageLimits } from "../../../hooks/useUsageLimits";
import { useFeatureFlags } from "../../../hooks/useFeatureFlags";

const MODULE_LABEL = "A1 Nursing";
const QUICK_CHECK_EVERY = 20;

export default function A1NursingChapter() {
  const { chapterId } = useParams();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const analytics = useFirstPartyAnalytics();
  const { guardUsage } = useUsageLimits();
  const { isFeatureEnabled, loading: flagsLoading } = useFeatureFlags();

  const savedCardRef = useRef(null);
  const saveAttemptRef = useRef(0);
  const quizAttemptRef = useRef(0);

  const [cards, setCards] = useState([]);
  const [chapter, setChapter] = useState(null);
  const [currentCard, setCurrentCard] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [deckRotation, setDeckRotation] = useState(0);
  const [swipeDirection, setSwipeDirection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [locked, setLocked] = useState(false);
  const [overlayDoc, setOverlayDoc] = useState(null);

  // phase: cards | quickPrompt | finalPrompt | quiz | result
  const [phase, setPhase] = useState("cards");
  const [pendingIndex, setPendingIndex] = useState(null);
  const [quizType, setQuizType] = useState(null); // quick | final
  const [quizQuestions, setQuizQuestions] = useState([]);
  const [quizLoading, setQuizLoading] = useState(false);
  const [quizResult, setQuizResult] = useState(null);
  const [quizPassed, setQuizPassed] = useState(false);

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

  const totalCards = cards.length;
  const quickCheckEvery =
    Number(chapter?.rules?.quick_check_every_cards) || QUICK_CHECK_EVERY;
  const passMark = Number(chapter?.rules?.quiz_pass_mark) || 0.7;
  const emergencyCount = Number(
    chapter?.rules?.quiz_composition?.emergency_translate,
  );
  const isEmergency = emergencyCount > 0;

  const recordNavigation = useFlashcardTelemetry({
    level: "A1",
    chapterId,
    currentCard,
    totalCards,
    cardId: cards[currentCard]?.id || null,
    isFlipped,
    loading,
    module: "nursing",
  });

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }
    if (flagsLoading) return;
    if (!isFeatureEnabled("nursing_german")) {
      navigate("/", { replace: true });
      return;
    }

    // Route stays mounted on param change — drop the previous chapter's
    // run state or the old result screen re-renders over the new chapter.
    setPhase("cards");
    setQuizResult(null);
    setQuizQuestions([]);
    setQuizType(null);
    setPendingIndex(null);
    setLocked(false);
    setOverlayDoc(null);
    setIsFlipped(false);
    setSwipeDirection(null);
    setDeckRotation(0);
    savedCardRef.current = null;
    window.scrollTo({ top: 0 });

    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await getNursingChapter(chapterId);
        const data = res?.data || {};
        setChapter(data.chapter || null);
        setCards(data.cards || []);
        setQuizPassed(!!data.progress?.quiz_passed);
        const resume = Number(data.progress?.current_index) || 0;
        const resumeIdx = Math.min(
          resume,
          Math.max((data.cards || []).length - 1, 0),
        );
        setCurrentCard(resumeIdx);
        // Re-offer a checkpoint the learner reached but never completed.
        const every =
          Number(data.chapter?.rules?.quick_check_every_cards) ||
          QUICK_CHECK_EVERY;
        const done = (data.progress?.checkpoints_done || []).map(Number);
        if (resumeIdx > 0 && resumeIdx % every === 0 && !done.includes(resumeIdx)) {
          setPendingIndex(resumeIdx);
          setPhase("quickPrompt");
        }
        analytics?.capture("learning_module_started", {
          module: MODULE_LABEL,
          level: "A1",
          chapter_id: chapterId,
          chapter_number: data.chapter?.chapter_number,
          resume_index: resume,
          total_cards: (data.cards || []).length,
        });
      } catch (err) {
        if (err?.response?.status === 403 && err?.response?.data?.locked) {
          setLocked(true);
        }
        console.error("Error loading A1 nursing chapter:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapterId, user?.user_id, navigate, flagsLoading]);

  // Progress writes mirror the flashcard rule: only a forward advance counts.
  useEffect(() => {
    if (!chapter?.id || totalCards === 0 || !user) return;
    const previousSavedCard = savedCardRef.current;
    const advanced =
      previousSavedCard !== null && currentCard > previousSavedCard;
    savedCardRef.current = currentCard;
    const saveAttempt = ++saveAttemptRef.current;
    saveNursingProgress({
      chapterId: chapter.id,
      currentIndex: currentCard,
      advanced,
    }).catch((err) => {
      if (
        err?.response?.status === 402 &&
        saveAttempt === saveAttemptRef.current &&
        savedCardRef.current === currentCard
      ) {
        const rollbackCard = previousSavedCard ?? Math.max(0, currentCard - 1);
        savedCardRef.current = rollbackCard;
        setCurrentCard((card) => (card === currentCard ? rollbackCard : card));
      }
      console.error("Error saving A1 nursing progress:", err);
    });
  }, [currentCard, user, chapter?.id, totalCards]);

  useEffect(() => {
    return () => cancelSpeech();
  }, [cancelSpeech]);

  // Prefetch upcoming card images so flips never stall.
  useEffect(() => {
    if (!cards.length) return;
    for (
      let i = currentCard;
      i <= Math.min(currentCard + 4, cards.length - 1);
      i += 1
    ) {
      const url = cards[i]?.image_url;
      if (url) {
        const img = new Image();
        img.decoding = "async";
        img.src = url;
      }
    }
  }, [cards, currentCard]);

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

  useEffect(() => {
    const justFlipped = isFlipped && !prevIsFlipped.current;
    prevIsFlipped.current = isFlipped;

    if (!user?.user_id || loading || !justFlipped) return;
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
          console.error("Error logging A1 nursing streak:", err);
        });
    }
  }, [isFlipped, currentCard, user?.user_id, loading]);

  const handleSpeak = (text, lang = "de-DE") => {
    if (text) speakText(text, lang);
  };

  // Boundaries: end of deck → chapter quiz; every N cards → quick check.
  const boundaryFor = (nextIndex) => {
    if (nextIndex >= totalCards) return "final";
    if (nextIndex > 0 && nextIndex % quickCheckEvery === 0) return "quick";
    return null;
  };

  const moveToNextCard = (inputMethod = "swipe") => {
    if (currentCard >= totalCards - 1 || swipeDirection) return;
    if (!guardUsage("A1", "nursing")) return;

    recordNavigation({
      fromIndex: currentCard,
      toIndex: currentCard + 1,
      inputMethod: typeof inputMethod === "string" ? inputMethod : "swipe",
      direction: "next",
    });

    setSwipeDirection("left");
    setTimeout(() => {
      setCurrentCard((prev) => prev + 1);
      setDeckRotation((prev) => (prev + 1) % 3);
      setIsFlipped(false);
      setSwipeDirection(null);
    }, 250);
  };

  const moveToPreviousCard = (inputMethod = "swipe") => {
    if (currentCard <= 0 || swipeDirection) return;

    recordNavigation({
      fromIndex: currentCard,
      toIndex: currentCard - 1,
      inputMethod: typeof inputMethod === "string" ? inputMethod : "swipe",
      direction: "previous",
    });

    setSwipeDirection("right");
    setTimeout(() => {
      setCurrentCard((prev) => prev - 1);
      setDeckRotation((prev) => (prev - 1 + 3) % 3);
      setIsFlipped(false);
      setSwipeDirection(null);
    }, 250);
  };

  const promptBoundary = (nextIndex) => {
    setPendingIndex(nextIndex);
    setPhase(nextIndex >= totalCards ? "finalPrompt" : "quickPrompt");
  };

  const handleNext = () => {
    if (swipeDirection) return;
    cancelSpeech();
    const nextIndex = currentCard + 1;
    if (boundaryFor(nextIndex)) {
      promptBoundary(nextIndex);
      return;
    }
    moveToNextCard("button");
  };

  const handlePrevious = () => {
    if (swipeDirection) return;
    cancelSpeech();
    moveToPreviousCard("button");
  };

  // Shuffle only reorders what hasn't been reached yet; position is kept.
  const handleShuffle = () => {
    setCards((prev) => {
      const seen = prev.slice(0, currentCard + 1);
      const remaining = prev.slice(currentCard + 1);
      for (let i = remaining.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [remaining[i], remaining[j]] = [remaining[j], remaining[i]];
      }
      return [...seen, ...remaining];
    });
    setIsFlipped(false);
  };

  const handleReset = () => {
    if (chapter?.id) {
      savedCardRef.current = 0;
      saveNursingProgress({
        chapterId: chapter.id,
        currentIndex: 0,
        advanced: false,
        reset: true,
      }).catch((err) =>
        console.error("Error resetting A1 nursing progress:", err),
      );
    }
    setCurrentCard(0);
    setDeckRotation(0);
    setIsFlipped(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const startQuiz = async (type) => {
    setQuizLoading(true);
    try {
      const res =
        type === "quick"
          ? await getNursingQuickQuiz(
              chapter.id,
              pendingIndex,
              cards.slice(0, pendingIndex).map((c) => c.id),
            )
          : await getNursingFinalQuiz(chapter.id);
      const qs = res?.data?.questions || [];
      if (!qs.length) throw new Error("No questions");
      setQuizQuestions(qs);
      setQuizType(type);
      setPhase("quiz");
    } catch (err) {
      console.error("Error loading nursing quiz:", err);
    } finally {
      setQuizLoading(false);
    }
  };

  const finishQuiz = async (answers) => {
    if (!quizType) return;
    quizAttemptRef.current += 1;
    try {
      const res = await submitNursingQuiz({
        chapterId: chapter.id,
        quizType,
        answers,
        checkpoint: quizType === "quick" ? pendingIndex : undefined,
      });
      const data = res?.data || {};

      analytics?.capture("learning_module_submitted", {
        module: MODULE_LABEL,
        level: "A1",
        chapter_id: chapterId,
        chapter_number: chapter.chapter_number,
        quiz_type: quizType,
        right: data.correct,
        total: data.total,
        score_percent: data.score,
        passed: data.passed,
        attempt: quizAttemptRef.current,
      });
      analytics?.capture("flashcard_quiz_submitted", {
        module: MODULE_LABEL,
        level: "A1",
        chapter_id: chapterId,
        chapter_number: chapter.chapter_number,
        quiz_type: quizType,
        right: data.correct,
        total: data.total,
        score_percent: data.score,
        passed: data.passed,
        attempt: quizAttemptRef.current,
      });

      if (quizType === "quick") {
        // Back to the deck at the checkpoint card.
        setPhase("cards");
        setQuizQuestions([]);
        setQuizType(null);
        if (!guardUsage("A1", "nursing")) return;
        setCurrentCard(pendingIndex);
        setDeckRotation((p) => (p + 1) % 3);
        setIsFlipped(false);
        setPendingIndex(null);
        return;
      }

      setQuizResult(data);
      if (data.passed) setQuizPassed(true);
      setPhase("result");
    } catch (err) {
      console.error("Error submitting nursing quiz:", err);
      setPhase("cards");
    }
  };

  const exitQuiz = () => {
    setPhase("cards");
    setQuizQuestions([]);
    setQuizType(null);
    setPendingIndex(null);
  };

  const skipQuickCheck = () => {
    setPhase("cards");
    if (!guardUsage("A1", "nursing")) return;
    setCurrentCard(pendingIndex);
    setDeckRotation((p) => (p + 1) % 3);
    setIsFlipped(false);
    setPendingIndex(null);
  };

  if (loading || flagsLoading) {
    return <FlashcardDeckSkeleton title="Nursing German" />;
  }

  if (locked) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center">
        <h2 className="text-2xl font-bold text-[#002856] mb-2">
          Chapter Locked
        </h2>
        <p className="text-sm text-gray-500 mb-6">
          Pass the previous chapter's quiz to unlock this one.
        </p>
        <button
          onClick={() => navigate("/a1/nursing")}
          className="px-6 py-3 bg-[#002856] text-white rounded-xl font-semibold"
        >
          Back to Chapters
        </button>
      </div>
    );
  }

  if (!cards.length) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center">
        <h2 className="text-2xl font-bold text-[#002856] mb-2">No Cards Yet</h2>
        <p className="text-sm text-gray-500 mb-6">
          This chapter does not have cards yet.
        </p>
        <button
          onClick={() => navigate("/a1/nursing")}
          className="px-6 py-3 bg-[#002856] text-white rounded-xl font-semibold"
        >
          Back to Chapters
        </button>
      </div>
    );
  }

  const chapterLabel = `Chapter ${chapter?.chapter_number ?? ""}`;

  if (phase === "quickPrompt" || phase === "finalPrompt") {
    const isFinal = phase === "finalPrompt";
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <div
          className="px-4 pb-2.5"
          style={{ paddingTop: "calc(0.625rem + env(safe-area-inset-top, 0px))" }}
        >
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate("/a1/nursing")}
              className="flex items-center gap-2 text-sm font-semibold text-[#181d27]"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
            <span className="text-sm font-semibold text-[#7b7b7b]">
              {isFinal ? (isEmergency ? "Emergency drill" : "Chapter Quiz") : "Quick Check"}
            </span>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="bg-white rounded-2xl p-8 text-center max-w-md shadow-lg border border-[#e0e0e0]">
            <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-[#edb843] to-[#f5cc6a] rounded-2xl flex items-center justify-center shadow-md">
              {isFinal ? (
                <Award className="w-10 h-10 text-white" />
              ) : (
                <Target className="w-10 h-10 text-white" />
              )}
            </div>
            <h2 className="text-2xl font-bold text-[#002856] mb-2">
              {isFinal ? (isEmergency ? "Emergency drill!" : "Chapter Quiz!") : "Quick Check!"}
            </h2>
            <p className="text-sm text-[#7b7b7b] mb-2">
              {isFinal
                ? isEmergency
                  ? "Timed emergency situations — answer before the clock runs out."
                  : `Finish ${chapter?.title_en || "this chapter"} to unlock the next one.`
                : `You've seen ${pendingIndex} cards — let's check a few.`}
            </p>
            <div className="flex items-center justify-center gap-2 mb-6">
              <div className="px-3 py-1 bg-[#f0f0f0] rounded-full">
                <span className="text-xs font-medium text-[#002856]">
                  {isFinal
                    ? isEmergency
                      ? `${emergencyCount} situations`
                      : `${chapter?.rules?.quiz_questions_per_attempt || 12} questions`
                    : `${chapter?.rules?.quick_check_questions || 5} questions`}
                </span>
              </div>
              {isFinal && (
                <div className="px-3 py-1 bg-[#f0f0f0] rounded-full">
                  <span className="text-xs font-medium text-[#002856]">
                    {isEmergency
                      ? "8s each"
                      : `${Math.round(passMark * 100)}% to pass`}
                  </span>
                </div>
              )}
            </div>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => {
                  setPhase("cards");
                  setPendingIndex(null);
                }}
                className="p-3 bg-white border border-[#d9d9d9] rounded-xl shadow-sm hover:bg-gray-50"
              >
                <ChevronLeft className="w-5 h-5 text-[#414651]" />
              </button>
              <button
                onClick={() => startQuiz(isFinal ? "final" : "quick")}
                disabled={quizLoading}
                className="px-8 py-3 text-white rounded-xl font-semibold shadow-md bg-[#edb843] hover:bg-[#d9a53a] disabled:opacity-60"
              >
                {quizLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : quizPassed && isFinal ? (
                  "Review Quiz"
                ) : (
                  "Start"
                )}
              </button>
              {!isFinal && (
                <button
                  onClick={skipQuickCheck}
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

  if (phase === "quiz") {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <div
          className="px-4 pb-3"
          style={{ paddingTop: "calc(0.75rem + env(safe-area-inset-top, 0px))" }}
        >
          <NursingQuiz
            questions={quizQuestions}
            title={
              quizType === "final"
                ? isEmergency
                  ? "Emergency drill"
                  : "Chapter Quiz"
                : "Quick Check"
            }
            chapterId={chapter?.id}
            onFinish={finishQuiz}
            onExit={exitQuiz}
            speak={handleSpeak}
            isSpeaking={isSpeaking}
            isLoadingAudio={isLoadingAudio}
          />
        </div>
      </div>
    );
  }

  if (phase === "result" && quizResult) {
    const passed = quizResult.passed;
    const nextChapter = quizResult.next_chapter;
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <div
          className="px-4 pb-2.5"
          style={{ paddingTop: "calc(0.625rem + env(safe-area-inset-top, 0px))" }}
        >
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate("/a1/nursing")}
              className="flex items-center gap-2 text-sm font-semibold text-[#181d27]"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
            <span className="text-sm font-semibold text-[#7b7b7b]">
              {chapterLabel}
            </span>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="bg-white rounded-2xl p-8 text-center max-w-md shadow-lg border border-[#e0e0e0] w-full">
            <div
              className={`w-20 h-20 mx-auto mb-6 rounded-2xl flex items-center justify-center shadow-md ${
                passed
                  ? "bg-gradient-to-br from-[#019035] to-[#02b347]"
                  : "bg-gradient-to-br from-[#edb843] to-[#f5cc6a]"
              }`}
            >
              <Award className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-[#002856] mb-2">
              {passed
                ? `${chapter?.title_en || "Chapter"} complete!`
                : "Almost there"}
            </h2>
            <p className="text-sm text-[#7b7b7b] mb-1">
              {quizResult.correct} of {quizResult.total} right ·{" "}
              {Math.round(quizResult.score)}%
            </p>
            <p className="text-xs text-[#7b7b7b] mb-6">
              {passed
                ? nextChapter
                  ? "Next chapter unlocked."
                  : "You've finished the whole nursing path. Gut gemacht!"
                : `${Math.round(passMark * 100)}% needed — try again or review the cards.`}
            </p>
            <div className="flex flex-col gap-2">
              {passed && nextChapter && (
                <button
                  onClick={() => navigate(`/a1/nursing/${nextChapter.id}`)}
                  className="w-full py-3 rounded-xl bg-[#019035] text-white text-sm font-bold"
                >
                  Start Chapter {nextChapter.chapter_number}
                </button>
              )}
              {passed && !nextChapter && (
                <button
                  onClick={() => navigate("/a1/nursing")}
                  className="w-full py-3 rounded-xl bg-[#019035] text-white text-sm font-bold"
                >
                  Back to Chapters
                </button>
              )}
              {!passed && (
                <>
                  <button
                    onClick={() => startQuiz("final")}
                    disabled={quizLoading}
                    className="w-full py-3 rounded-xl bg-[#edb843] text-white text-sm font-bold disabled:opacity-60"
                  >
                    {quizLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                    ) : (
                      "Try again"
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setPhase("cards");
                      setQuizResult(null);
                    }}
                    className="w-full py-3 rounded-xl bg-white border border-[#d9d9d9] text-sm font-bold text-[#002856]"
                  >
                    Review cards
                  </button>
                  {nextChapter && (
                    <button
                      onClick={() =>
                        navigate(`/a1/nursing/${nextChapter.id}`)
                      }
                      className="w-full py-2 text-[13px] font-semibold text-[#535862] underline underline-offset-2"
                    >
                      Continue to Chapter {nextChapter.chapter_number} anyway
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div
        className="px-4 pb-2.5"
        style={{ paddingTop: "calc(0.625rem + env(safe-area-inset-top, 0px))" }}
      >
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate("/a1/nursing")}
            className="flex items-center gap-2 text-sm font-semibold text-[#181d27]"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Back</span>
          </button>
          <span className="text-sm font-semibold text-[#7b7b7b]">
            {chapter?.title_en || chapterLabel}
          </span>
          <span className="text-xs font-medium text-[#7b7b7b]">
            {currentCard + 1}/{totalCards}
          </span>
        </div>
      </div>

      <div className="px-4">
        <NursingSegmentedBar
          current={currentCard + 1}
          total={totalCards}
          every={quickCheckEvery}
        />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-4 py-6">
        <A1FlashcardDeck
          flashcardSet={cards}
          currentCard={currentCard}
          totalCards={totalCards}
          deckRotation={deckRotation}
          isFlipped={isFlipped}
          swipeDirection={swipeDirection}
          onSwipeLeft={() => moveToNextCard("swipe")}
          onSwipeRight={() => moveToPreviousCard("swipe")}
          shouldOpenTestPrompt={boundaryFor}
          onTestPromptTrigger={promptBoundary}
          onCardClick={() => setIsFlipped((f) => !f)}
          onSpeak={handleSpeak}
          isSpeaking={isSpeaking}
          isLoadingAudio={isLoadingAudio}
          containerId="a1-nursing-deck"
          CardComponent={NursingCard}
          cardExtraProps={{ onViewDocument: setOverlayDoc }}
        />
      </div>

      <div className="px-4 pb-6">
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={handlePrevious}
            disabled={currentCard <= 0}
            className="p-3 bg-white border border-[#d9d9d9] rounded-xl shadow-sm hover:bg-gray-50 disabled:opacity-40"
          >
            <ChevronLeft className="w-5 h-5 text-[#414651]" />
          </button>
          <button
            onClick={handleShuffle}
            className="p-3 bg-white border border-[#d9d9d9] rounded-xl shadow-sm hover:bg-gray-50"
            title="Shuffle remaining cards"
          >
            <Shuffle className="w-5 h-5 text-[#414651]" />
          </button>
          <button
            onClick={handleReset}
            className="p-3 bg-white border border-[#d9d9d9] rounded-xl shadow-sm hover:bg-gray-50"
            title="Back to card 1"
          >
            <RotateCcw className="w-5 h-5 text-[#414651]" />
          </button>
          <button
            onClick={handleNext}
            className="px-8 py-3 bg-[#edb843] text-white rounded-xl font-semibold shadow-md hover:bg-[#d9a53a]"
          >
            Next
          </button>
        </div>
      </div>

      <FloatingStreakCounter
        streakDays={streakInfo.streakDays}
        todayCount={localStreakCount}
        dailyGoal={streakInfo.dailyGoal}
      />
      <StreakCelebrationModal
        open={showStreakCelebration}
        onClose={() => setShowStreakCelebration(false)}
        streakDays={streakInfo.streakDays}
        dailyGoalReached={dailyGoalReached}
      />

      {overlayDoc &&
        createPortal(
          <div
            className="fixed inset-0 z-[999] bg-black/60 flex items-center justify-center p-4"
            onClick={() => setOverlayDoc(null)}
          >
            <div
              className="bg-white rounded-2xl p-4 max-w-md w-full max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-bold text-[#002856]">
                  {overlayDoc.title_de || "Document"}
                </span>
                <button
                  onClick={() => setOverlayDoc(null)}
                  className="w-7 h-7 flex items-center justify-center rounded-full bg-gray-100 text-gray-600"
                >
                  ✕
                </button>
              </div>
              <NursingDocumentSheet document={overlayDoc} />
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
