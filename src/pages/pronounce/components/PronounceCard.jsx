import React from "react";
import { Volume2, Mic, Square, Loader2 } from "lucide-react";
import AssessmentResults from "./AssessmentResults";
import "../../../tour/tourStyles.css";

const PronounceCard = ({
  cardData,
  isFrontCard,
  swipeDirection,
  // Recording props
  isRecording,
  isUploading,
  recordingTime,
  formatTime,
  onStartRecording,
  onStopRecording,
  // TTS props
  isSpeaking,
  isLoadingAudio,
  onSpeak,
  // Assessment props
  assesmentResult,
  onRetry,
  // Tour props
  isTourMode = false,
  tourPronounceStep = 0,
}) => {
  if (!cardData) return null;
  
  // Determine which button to highlight based on tour step
  const showListenOverlay = isTourMode && isFrontCard && tourPronounceStep === 0;
  const showRecordOverlay = isTourMode && isFrontCard && tourPronounceStep === 1 && !isRecording;
  const showSpeakNowPopup = isTourMode && isFrontCard && tourPronounceStep === 2 && isRecording;
  const showStopOverlay = isTourMode && isFrontCard && tourPronounceStep === 2 && isRecording;

  return (
    <div
      className="w-full h-full flex flex-col px-3 pt-3 pb-6"
      style={{ animation: isFrontCard ? "fadeIn 0.4s ease-out" : "none" }}
    >
      {/* Speak Now Popup */}
      {showSpeakNowPopup && (
        <div className="speak-now-popup">
          Speak Now
        </div>
      )}
      
      {/* Top Row - Speaker Icon */}
      <div className="flex items-center justify-between h-11 mb-2">
        <div className="w-8 h-8" />
        {isFrontCard ? (
          <div className="relative">
            {showListenOverlay && (
              <>
                <div className="tour-pulse-ring" />
                <div className="tour-button-hint">👆 Tap to Listen</div>
              </>
            )}
            <button
              id="listen-button"
              onClick={onSpeak}
              disabled={isLoadingAudio || isSpeaking}
              className={`relative z-10 w-8 h-8 flex items-center justify-center rounded-full transition-all ${
                isSpeaking
                  ? "bg-[#EDB843] text-[#FFF5DF] animate-pulse"
                  : "bg-[#FFF5DF] text-[#EDB843] hover:bg-[#fbedcf] hover:cursor-pointer"
              }`}
              style={{
                opacity: swipeDirection ? 0 : 1,
                transition: "opacity 0.3s",
              }}
            >
              {isLoadingAudio ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Volume2 className="w-5 h-5" />
              )}
            </button>
          </div>
        ) : (
          <div className="w-8 h-8" />
        )}
      </div>
      {/* Content based on state */}
      {isFrontCard && assesmentResult && !isUploading ? (
        <AssessmentResults
          result={assesmentResult}
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
          {/* Word Display */}
          <div className="text-center mb-8">
            <p className="text-2xl font-medium text-[#002856] leading-[1.2] mb-2">
              {cardData?.back_content}
            </p>
            <p className="text-base font-medium text-[#002856] opacity-50">
              {cardData?.front_content}
            </p>
          </div>
          {/* Mic section */}
          {isFrontCard ? (
            <div
              className="flex flex-col items-center gap-2"
              style={{
                opacity: swipeDirection ? 0 : 1,
                transition: "opacity 0.3s",
              }}
            >
              {isRecording && (
                <p className="text-lg font-mono text-[#002856] mb-4">
                  {formatTime(recordingTime)}
                </p>
              )}
              <div className="relative">
                {showRecordOverlay && (
                  <>
                    <div className="tour-pulse-ring" style={{ inset: '-12px' }} />
                    <div className="tour-button-hint">👆 Tap to Record</div>
                  </>
                )}
                {showStopOverlay && (
                  <>
                    <div className="tour-pulse-ring" style={{ inset: '-12px' }} />
                    <div className="tour-button-hint">⏹️ Tap Stop to Finish</div>
                  </>
                )}
                <button
                  id={isRecording ? "stop-button" : "record-button"}
                  onClick={(e) => {
                    e.stopPropagation();
                    isRecording ? onStopRecording() : onStartRecording();
                  }}
                  disabled={isUploading}
                  className={`relative z-10 w-[60px] h-[60px] rounded-full flex items-center justify-center transition-all ${
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
              </div>
              <p className="text-sm text-[#7b7b7b]">
                {isRecording ? "Recording..." : "Click to record"}
              </p>
            </div>
          ) : (
            <div className="h-[100px]" />
          )}
        </div>
      )}
    </div>
  );
};
export default PronounceCard;
