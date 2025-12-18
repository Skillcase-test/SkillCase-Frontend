import React from "react";
import { Volume2, Mic, Square, Loader2 } from "lucide-react";
import AssessmentResults from "./AssessmentResults";
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
}) => {
  if (!cardData) return null;
  return (
    <div
      className="w-full h-full flex flex-col px-3 pt-3 pb-6"
      style={{ animation: isFrontCard ? "fadeIn 0.4s ease-out" : "none" }}
    >
      {/* Top Row - Speaker Icon */}
      <div className="flex items-center justify-between h-11 mb-2">
        <div className="w-8 h-8" />
        {isFrontCard ? (
          <button
            onClick={onSpeak}
            disabled={isLoadingAudio || isSpeaking}
            className={`w-8 h-8 flex items-center justify-center rounded-full transition-all ${
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
              <button
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
