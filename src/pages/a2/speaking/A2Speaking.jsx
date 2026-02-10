import React, { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { getSpeakingContent, saveSpeakingProgress } from "../../../api/a2Api";
import useCardSwipe from "./hooks/useCardSwipe";
import useVoiceRecorder from "./hooks/useVoiceRecorder";
import useTextToSpeech from "../../pronounce/hooks/useTextToSpeech";
import SpeakingCardDeck from "../../../components/a2/SpeakingCardDeck";
import { useA2Tour } from "../../../tour/A2TourContext";

export default function A2Speaking() {
  const { chapterId } = useParams();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);

  const [content, setContent] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [deckRotation, setDeckRotation] = useState(0);
  const [loading, setLoading] = useState(true);
  const [buttonSwipeDirection, setButtonSwipeDirection] = useState(null);
  const totalCards = content.length;
  const currentCard = content[currentIndex];
  const {
    isRecording,
    isUploading,
    recordingTime,
    assessmentResult,
    startRecording,
    stopRecording,
    formatTime,
    resetRecording,
    setAssessmentResult,
  } = useVoiceRecorder(currentCard?.text_de);
  const { isSpeaking, isLoadingAudio, speakText, cancelSpeech } =
    useTextToSpeech();

  // Tour integration
  const { isTourActive, currentFeature, speakingStep } = useA2Tour();
  const isTourMode = isTourActive && currentFeature === "speaking";

  // Tour-aware recording handlers
  const handleTourStartRecording = () => {
    startRecording();
    if (isTourMode && speakingStep === 1) {
      window.dispatchEvent(
        new CustomEvent("tour:a2SpeakingStep", { detail: { step: 2 } }),
      );
    }
  };

  const handleTourStopRecording = () => {
    stopRecording(currentCard?.text_de);
    if (isTourMode && speakingStep === 2) {
      window.dispatchEvent(
        new CustomEvent("tour:a2SpeakingStep", { detail: { step: 3 } }),
      );
    }
  };

  // Dispatch step 4 when assessment appears during tour
  useEffect(() => {
    if (isTourMode && speakingStep === 3 && assessmentResult) {
      window.dispatchEvent(
        new CustomEvent("tour:a2SpeakingStep", { detail: { step: 4 } }),
      );
    }
  }, [isTourMode, speakingStep, assessmentResult]);

  const handleNext = async () => {
    cancelSpeech();
    if (currentIndex < totalCards - 1) {
      setCurrentIndex((p) => p + 1);
      setDeckRotation((p) => (p + 1) % 3);
      setAssessmentResult(null);
      resetRecording();
      try {
        await saveSpeakingProgress({
          chapterId: parseInt(chapterId),
          contentIndex: currentIndex + 1,
        });
      } catch {}
    } else {
      // On last card, mark as complete and navigate to chapter select
      try {
        await saveSpeakingProgress({
          chapterId: parseInt(chapterId),
          contentIndex: totalCards - 1,
          isCompleted: true,
        });
      } catch {}
      navigate("/a2/speaking");
    }
  };
  const handlePrevious = async () => {
    cancelSpeech();
    if (currentIndex > 0) {
      setCurrentIndex((p) => p - 1);
      setDeckRotation((p) => (p - 1 + 3) % 3);
      setAssessmentResult(null);
      resetRecording();
      try {
        await saveSpeakingProgress({
          chapterId: parseInt(chapterId),
          contentIndex: currentIndex - 1,
        });
      } catch {}
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
    canGoNext: true, // Always allow - handleNext handles completion when on last card
    canGoPrevious: currentIndex > 0,
    disabled: isRecording || isUploading,
  });
  const handleSpeak = (e) => {
    e.stopPropagation();
    if (currentCard?.text_de) speakText(currentCard.text_de, "de-DE");
  };
  const handleFinish = async () => {
    try {
      await saveSpeakingProgress({
        chapterId: parseInt(chapterId),
        contentIndex: totalCards - 1,
        isCompleted: true,
      });
      navigate("/a2/speaking");
    } catch {}
  };
  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }
    const fetchContent = async () => {
      setLoading(true);
      try {
        const res = await getSpeakingContent(chapterId);
        setContent(res.data.content || []);
        setCurrentIndex(res.data.progress?.current_content_index || 0);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchContent();
  }, [user, chapterId, navigate]);
  useEffect(() => () => cancelSpeech(), []);
  const handleNextButton = () => {
    if (currentIndex < totalCards - 1 && !isRecording && !isUploading) {
      setButtonSwipeDirection("left");
      setTimeout(() => {
        handleNext();
        setButtonSwipeDirection(null);
      }, 250);
    }
  };
  const handlePreviousButton = () => {
    if (currentIndex > 0 && !isRecording && !isUploading) {
      setButtonSwipeDirection("right");
      setTimeout(() => {
        handlePrevious();
        setButtonSwipeDirection(null);
      }, 250);
    }
  };
  return (
    <div className="min-h-100dvh bg-white flex flex-col">
      <div className="px-4 py-2.5 flex items-center justify-between">
        <button
          onClick={() => navigate("/a2/speaking")}
          className="flex items-center gap-2 text-sm font-semibold"
        >
          <ChevronLeft className="w-4 h-4" /> Back
        </button>
        <span className="text-sm font-semibold text-[#7b7b7b]">
          Speaking Practice
        </span>
      </div>
      <div className="bg-gradient-to-b from-[#edfaff] to-white px-4 pt-4 pb-4">
        <h1 className="text-[30px] font-semibold text-[#002856] mb-2">
          German Level: A2
        </h1>
        <p className="text-xs text-black opacity-70 mb-3">
          Card {currentIndex + 1} of {totalCards}
        </p>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-[#019035] transition-all"
            style={{ width: `${((currentIndex + 1) / totalCards) * 100}%` }}
          />
        </div>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 relative overflow-hidden">
        {loading ? (
          <div className="w-[280px] h-[380px] bg-white rounded-[20px] shadow-lg animate-pulse" />
        ) : (
          <SpeakingCardDeck
            content={content}
            currentIndex={currentIndex}
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
            onStartRecording={handleTourStartRecording}
            onStopRecording={handleTourStopRecording}
            isSpeaking={isSpeaking}
            isLoadingAudio={isLoadingAudio}
            onSpeak={handleSpeak}
            assessmentResult={assessmentResult}
            onRetry={resetRecording}
            isTourMode={isTourMode}
            tourSpeakingStep={speakingStep}
          />
        )}
      </div>
      <div className="flex items-center justify-center gap-4 pb-8">
        <button
          onClick={handlePreviousButton}
          disabled={currentIndex === 0 || isRecording || isUploading}
          className="w-12 h-12 bg-white border border-[#e5e7eb] rounded-xl flex items-center justify-center ml-8 disabled:opacity-40 hover:border-[#d1d5db] transition-colors shadow-sm"
        >
          <ChevronLeft className="w-5 h-5 text-[#414651]" />
        </button>
        {currentIndex === totalCards - 1 ? (
          <button
            onClick={handleFinish}
            disabled={isRecording || isUploading}
            className="px-8 py-3 bg-[#019035] text-white rounded-xl font-semibold hover:bg-[#017a2d] transition-colors shadow-sm"
          >
            Finish
          </button>
        ) : (
          <button
            onClick={handleNextButton}
            disabled={
              currentIndex >= totalCards - 1 || isRecording || isUploading
            }
            className="w-12 h-12 bg-white border border-[#e5e7eb] rounded-xl flex items-center justify-center mr-4 disabled:opacity-40 hover:border-[#d1d5db] transition-colors shadow-sm"
          >
            <ChevronRight className="w-5 h-5 text-[#414651]" />
          </button>
        )}
      </div>
    </div>
  );
}
