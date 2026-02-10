import { useState, useEffect } from "react";
import { Volume2, Mic, Square, Loader2 } from "lucide-react";
import SpeakingAssessmentResults from "./SpeakingAssessmentResults";
import "../../tour/tourStyles.css";

const SpeakingCard = ({
  cardData,
  isFrontCard,
  swipeDirection,
  isRecording,
  isUploading,
  recordingTime,
  formatTime,
  onStartRecording,
  onStopRecording,
  isSpeaking,
  isLoadingAudio,
  onSpeak,
  assessmentResult,
  onRetry,
  isTourMode = false,
  tourSpeakingStep = 0,
}) => {
  // Delayed stop hint — wait 1s after recording starts during tour
  const [showStopHint, setShowStopHint] = useState(false);

  useEffect(() => {
    if (isTourMode && tourSpeakingStep === 2 && isRecording) {
      const t = setTimeout(() => setShowStopHint(true), 1000);
      return () => clearTimeout(t);
    }
    setShowStopHint(false);
  }, [isTourMode, tourSpeakingStep, isRecording]);

  const showRecordOverlay =
    isTourMode && isFrontCard && tourSpeakingStep === 1 && !isRecording;
  const showSpeakNowPopup =
    isTourMode && isFrontCard && tourSpeakingStep === 2 && isRecording;
  const showStopOverlay =
    isTourMode &&
    isFrontCard &&
    tourSpeakingStep === 2 &&
    isRecording &&
    showStopHint;

  if (!cardData) return null;
  return (
    <div className="w-full h-full flex flex-col px-3 pt-3 pb-6">
      {/* Speak Now popup */}
      {showSpeakNowPopup && (
        <div className="speak-now-popup">🎤 Speak Now!</div>
      )}
      <div className="flex items-center justify-between h-11 mb-2">
        <div className="w-8 h-8" />
        {isFrontCard && (
          <button
            id="a2-speaking-play-btn"
            onClick={onSpeak}
            disabled={isLoadingAudio || isSpeaking}
            className={`w-8 h-8 flex items-center justify-center rounded-full transition-all ${
              isSpeaking
                ? "bg-[#EDB843] text-[#FFF5DF] animate-pulse"
                : "bg-[#FFF5DF] text-[#EDB843]"
            }`}
            style={{ opacity: swipeDirection ? 0 : 1 }}
          >
            {isLoadingAudio ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Volume2 className="w-5 h-5" />
            )}
          </button>
        )}
      </div>
      {isFrontCard && assessmentResult && !isUploading ? (
        <SpeakingAssessmentResults
          result={assessmentResult}
          cardData={cardData}
          onRetry={onRetry}
        />
      ) : isFrontCard && isUploading ? (
        <div className="flex flex-col items-center justify-center flex-1 gap-3">
          <Loader2 className="w-10 h-10 animate-spin text-[#002856]" />
          <p className="text-sm text-[#7b7b7b]">Analyzing...</p>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center flex-1">
          <div className="text-center mb-8">
            <p className="text-2xl font-medium text-[#002856] mb-2">
              {cardData?.text_de}
            </p>
            <p className="text-base text-[#002856] opacity-50">
              {cardData?.text_en}
            </p>
          </div>
          {isFrontCard && (
            <div
              className="flex flex-col items-center gap-2"
              style={{ opacity: swipeDirection ? 0 : 1 }}
            >
              {isRecording && (
                <p className="text-lg font-mono text-[#002856] mb-4">
                  {formatTime(recordingTime)}
                </p>
              )}
              <div className="relative">
                <button
                  id="a2-speaking-mic-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    isRecording ? onStopRecording() : onStartRecording();
                  }}
                  disabled={isUploading}
                  className={`w-[60px] h-[60px] rounded-full flex items-center justify-center transition-all ${
                    isRecording
                      ? "bg-red-500 animate-pulse"
                      : "bg-[#002856] hover:bg-[#003d83]"
                  }`}
                >
                  {isRecording ? (
                    <Square className="w-6 h-6 text-white" />
                  ) : (
                    <Mic className="w-6 h-6 text-white" />
                  )}
                </button>
                {/* Tour: record overlay */}
                {showRecordOverlay && (
                  <>
                    <div
                      className="tour-pulse-ring"
                      style={{ inset: "-12px" }}
                    />
                    <div className="tour-button-hint">👆 Tap to Record</div>
                  </>
                )}
                {/* Tour: stop overlay */}
                {showStopOverlay && (
                  <>
                    <div
                      className="tour-pulse-ring"
                      style={{ inset: "-12px" }}
                    />
                    <div className="tour-button-hint">⏹️ Tap to Stop</div>
                  </>
                )}
              </div>
              <p className="text-sm text-[#7b7b7b]">
                {isRecording ? "Recording..." : "Click to record"}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
export default SpeakingCard;
