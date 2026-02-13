import React, { useEffect, useState, useRef, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useSelector } from "react-redux";
import api from "../../api/axios";
import FloatingStreakCounter from "../../components/FloatingStreakCounter";
import StreakCelebrationModal from "../../components/StreakCelebrationModal";
import Navbar from "../../components/Navbar";
// Local imports
import CardDeck from "./components/CardDeck";
import ProgressBar from "./components/ProgressBar";
import useVoiceRecorder from "./hooks/useVoiceRecorder";
import useTextToSpeech from "./hooks/useTextToSpeech";
import useCardSwipe from "./hooks/useCardSwipe";
import { useTour } from "../../tour/TourContext";
import { TOUR_PAGES } from "../../tour/tourSteps";

const Pronounce = () => {
  const { user } = useSelector((state) => state.auth);
  const { isTourActive, tourPage, pronounceStep } = useTour();
  const navigate = useNavigate();
  const { prof_level, pronounce_id } = useParams();
  const [searchParams] = useSearchParams();
  const pronounce_name = searchParams.get("pronounce_name");

  // Detect if we're in tour mode for pronunciation practice
  const isTourMode = isTourActive && tourPage === TOUR_PAGES.PRONOUNCE_PRACTICE;

  // Data states
  const [flashcardSet, setFlashcardSet] = useState([]);
  const [currentCard, setCurrentCard] = useState(0);
  const [deckRotation, setDeckRotation] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [buttonSwipeDirection, setButtonSwipeDirection] = useState(null);

  // --- Streak tracking ---
  const [showStreakCelebration, setShowStreakCelebration] = useState(false);
  const [dailyGoalReached, setDailyGoalReached] = useState(false);
  const [streakInfo, setStreakInfo] = useState({
    todayFlashcards: 0,
    dailyGoal: 20,
    streakDays: 0,
  });

  const [localStreakCount, setLocalStreakCount] = useState(0);
  const recordedCardsRef = useRef(new Set());

  // Fetch initial streak data
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
  const handleStreakComplete = useCallback(() => {
    setDailyGoalReached(true);
    setShowStreakCelebration(true);
  }, []);

  const [loading, setLoading] = useState(true);

  const totalCards = flashcardSet.length;
  const chapterNumber = pronounce_name?.match(/\d+/)?.[0] || "01";
  // Custom hooks
  const {
    isRecording,
    isUploading,
    uploadStatus,
    recordingTime,
    assesmentResult,
    startRecording,
    stopRecording,
    formatTime,
    resetRecording,
    setAssesmentResult,
  } = useVoiceRecorder(flashcardSet[currentCard]?.back_content);
  const { isSpeaking, isLoadingAudio, speakText, cancelSpeech } =
    useTextToSpeech();
  const handleNext = async () => {
    cancelSpeech();
    if (currentCard < totalCards - 1) {
      const nextCard = currentCard + 1;
      setCurrentCard(nextCard);
      setDeckRotation((prev) => (prev + 1) % 3);
      setAssesmentResult(null);
      resetRecording();
      try {
        await api.put(`/pronounce/progress/${pronounce_id}`, {
          current_card_index: nextCard,
          completed: false,
        });
      } catch (err) {
        console.error("Error saving progress:", err);
      }
    }
  };
  const handlePrevious = async () => {
    cancelSpeech();
    if (currentCard > 0) {
      const prevCard = currentCard - 1;
      setCurrentCard(prevCard);
      setDeckRotation((prev) => (prev - 1 + 3) % 3);
      setAssesmentResult(null);
      resetRecording();
      try {
        await api.put(`/pronounce/progress/${pronounce_id}`, {
          current_card_index: prevCard,
          completed: false,
        });
      } catch (err) {
        console.error("Error saving progress:", err);
      }
    }
  };
  const {
    swipeDirection,
    isDragging,
    dragOffset,
    handleDragStart,
    handleDragMove,
    handleDragEnd,
  } = useCardSwipe({
    onNext: handleNext,
    onPrevious: handlePrevious,
    canGoNext: currentCard < totalCards - 1,
    canGoPrevious: currentCard > 0,
    disabled: isRecording || isUploading,
  });
  const handleFinish = async () => {
    try {
      await api.put(`/pronounce/progress/${pronounce_id}`, {
        current_card_index: totalCards - 1,
        completed: true,
      });
      setIsCompleted(true);
      navigate(`/pronounce/${prof_level}`);
    } catch (err) {
      console.error("Error marking as complete:", err);
    }
  };
  const handleSpeak = (e) => {
    e.stopPropagation();
    if (flashcardSet[currentCard]?.back_content) {
      speakText(flashcardSet[currentCard].back_content, "de-DE");

      // Dispatch tour event when user listens (step 0 -> step 1)
      if (isTourMode) {
        window.dispatchEvent(
          new CustomEvent("tour:pronounceStep", { detail: { step: 1 } }),
        );
      }
    }
  };

  const handleStartRecording = () => {
    startRecording();

    // Dispatch tour event when user starts recording (step 1 -> step 2)
    if (isTourMode) {
      window.dispatchEvent(
        new CustomEvent("tour:pronounceStep", { detail: { step: 2 } }),
      );
    }
  };

  const handleStopRecording = () => {
    stopRecording(flashcardSet[currentCard]?.back_content);
    if (isTourMode && localPronounceStep === 2) {
      setLocalPronounceStep(3);
      window.dispatchEvent(
        new CustomEvent("tour:pronounceStep", { detail: { step: 3 } }),
      );
    }

    // Streak: +1 point per recording (only first recording per card)
    if (user?.user_id && !recordedCardsRef.current.has(currentCard)) {
      recordedCardsRef.current.add(currentCard);
      setLocalStreakCount((prev) => prev + 1);
      api
        .post("/streak/log", { points: 1 })
        .then((res) => {
          if (res.data.streakUpdated) {
            setStreakInfo({
              todayFlashcards: res.data.todayPoints,
              dailyGoal: res.data.dailyGoal,
              streakDays: res.data.currentStreak || 1,
            });
            setDailyGoalReached(true);
            setShowStreakCelebration(true);
          }
        })
        .catch(() => setLocalStreakCount((prev) => Math.max(0, prev - 1)));
    }
  };

  // Load data
  useEffect(() => {
    const getCards = async () => {
      setLoading(true);
      try {
        const res = await api.get(
          `pronounce/getPronounceCards/${pronounce_id}`,
        );
        setFlashcardSet(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    getCards();
  }, [user, navigate, pronounce_id]);
  useEffect(() => {
    const loadProgress = async () => {
      if (!pronounce_id) return;
      try {
        const res = await api.get(`/pronounce/progress/${pronounce_id}`);
        const { current_card_index, completed } = res.data;
        setCurrentCard(current_card_index || 0);
        setIsCompleted(completed || false);
      } catch (err) {
        console.error("Error loading progress:", err);
        setCurrentCard(0);
        setIsCompleted(false);
      }
    };
    loadProgress();
  }, [pronounce_id]);
  useEffect(() => {
    return () => cancelSpeech();
  }, []);

  // Dispatch tour event when assessment result is shown (step 3 -> step 4)
  useEffect(() => {
    if (isTourMode && assesmentResult) {
      window.dispatchEvent(
        new CustomEvent("tour:pronounceStep", { detail: { step: 4 } }),
      );
    }
  }, [isTourMode, assesmentResult]);

  const handleNextButton = async () => {
    if (currentCard < totalCards - 1 && !isRecording && !isUploading) {
      cancelSpeech();
      setButtonSwipeDirection("left");
      setTimeout(async () => {
        const nextCard = currentCard + 1;
        setCurrentCard(nextCard);
        setDeckRotation((prev) => (prev + 1) % 3);
        setAssesmentResult(null);
        resetRecording();
        setButtonSwipeDirection(null);

        // API call happens after animation
        try {
          await api.put(`/pronounce/progress/${pronounce_id}`, {
            current_card_index: nextCard,
            completed: false,
          });
        } catch (err) {
          console.error("Error saving progress:", err);
        }
      }, 250);
    }
  };
  const handlePreviousButton = async () => {
    if (currentCard > 0 && !isRecording && !isUploading) {
      cancelSpeech();
      setButtonSwipeDirection("right");
      setTimeout(async () => {
        const prevCard = currentCard - 1;
        setCurrentCard(prevCard);
        setDeckRotation((prev) => (prev - 1 + 3) % 3);
        setAssesmentResult(null);
        resetRecording();
        setButtonSwipeDirection(null);

        // API call happens after animation
        try {
          await api.put(`/pronounce/progress/${pronounce_id}`, {
            current_card_index: prevCard,
            completed: false,
          });
        } catch (err) {
          console.error("Error saving progress:", err);
        }
      }, 250);
    }
  };

  return (
    <div className="min-h-100dvh bg-white flex flex-col">
      {/* Back Navigation */}
      <div className="px-4 py-2.5">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate(`/pronounce/${prof_level}`)}
            className="flex items-center gap-2 text-sm font-semibold text-[#181d27]"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Back</span>
          </button>
          <span className="text-sm font-semibold text-[#7b7b7b]">
            Vocabulary Practice
          </span>
        </div>
      </div>
      {/* Header Section */}
      <div className="bg-gradient-to-b from-[#edfaff] to-white px-4 pt-4 pb-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-[30px] font-semibold text-[#002856] leading-[38px]">
            Ch. {chapterNumber.padStart(2, "0")}
          </h1>
          <span className="text-base font-semibold text-[#002856]">
            German Level: {prof_level?.toUpperCase()}
          </span>
        </div>
        <p className="text-xs text-black opacity-70 mb-3">
          Card {currentCard + 1} of {totalCards}
        </p>
        <ProgressBar currentCard={currentCard} totalCards={totalCards} />
      </div>
      {/* Card Deck Area */}
      <div
        id="pronounce-container"
        className="flex-1 flex flex-col items-center justify-center px-4 py-12 relative overflow-hidden"
      >
        {loading ? (
          <div className="w-[280px] h-[430px] bg-white rounded-[20px] shadow-lg animate-pulse flex flex-col items-center justify-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gray-200" />
            <div className="w-40 h-4 rounded bg-gray-200" />
            <div className="w-32 h-3 rounded bg-gray-100" />
          </div>
        ) : (
          <CardDeck
            flashcardSet={flashcardSet}
            currentCard={currentCard}
            totalCards={totalCards}
            deckRotation={deckRotation}
            swipeDirection={swipeDirection || buttonSwipeDirection}
            isDragging={isDragging}
            dragOffset={dragOffset}
            handleDragStart={handleDragStart}
            handleDragMove={handleDragMove}
            handleDragEnd={handleDragEnd}
            isRecording={isRecording}
            isUploading={isUploading}
            recordingTime={recordingTime}
            formatTime={formatTime}
            onStartRecording={handleStartRecording}
            onStopRecording={handleStopRecording}
            isSpeaking={isSpeaking}
            isLoadingAudio={isLoadingAudio}
            onSpeak={handleSpeak}
            assesmentResult={assesmentResult}
            onRetry={resetRecording}
            isTourMode={isTourMode}
            tourPronounceStep={pronounceStep}
          />
        )}
        {uploadStatus && uploadStatus.includes("Error") && (
          <div className="absolute bottom-4 left-4 right-4 p-3 bg-red-100 rounded-lg text-center text-red-800 text-sm z-50">
            {uploadStatus}
          </div>
        )}
      </div>
      {/* Navigation Buttons */}
      <div className="flex items-center justify-center gap-2 pb-8">
        <button
          onClick={handlePreviousButton}
          disabled={currentCard === 0 || isRecording || isUploading}
          className="px-3 py-2 bg-white border border-[#d9d9d9] rounded-lg shadow-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
        >
          <ChevronLeft className="w-6 h-6 text-[#414651]" />
        </button>
        {currentCard === totalCards - 1 ? (
          <button
            onClick={handleFinish}
            disabled={isRecording || isUploading}
            className="px-6 py-2 bg-[#019035] text-white rounded-lg shadow-sm font-semibold hover:bg-[#017a2c] transition-colors"
          >
            Finish
          </button>
        ) : (
          <button
            onClick={handleNextButton}
            disabled={
              currentCard === totalCards - 1 || isRecording || isUploading
            }
            className="px-3 py-2 bg-white border border-[#d9d9d9] rounded-lg shadow-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
          >
            <ChevronRight className="w-6 h-6 text-[#414651]" />
          </button>
        )}
      </div>

      {/* Streak Celebration Modal */}
      <StreakCelebrationModal
        showStreakCelebration={showStreakCelebration}
        setShowStreakCelebration={setShowStreakCelebration}
        streakInfo={streakInfo}
      />
      {/* Floating Streak Counter */}
      {!showStreakCelebration &&
        !dailyGoalReached &&
        localStreakCount <= streakInfo.dailyGoal && (
          <FloatingStreakCounter
            current={localStreakCount}
            target={streakInfo.dailyGoal}
            onComplete={handleStreakComplete}
          />
        )}
    </div>
  );
};
export default Pronounce;
