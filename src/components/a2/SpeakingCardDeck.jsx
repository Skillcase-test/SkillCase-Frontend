import SpeakingCard from "./SpeakingCard";
const cardColors = ["#d6bbfb", "#d9f4ff", "#ffffff"];
const baseTransforms = [
  { rotate: 8, x: 0, y: -24, scale: 0.95 },
  { rotate: 5, x: 0, y: -15, scale: 0.97 },
  { rotate: 0, x: 0, y: 0, scale: 1 },
];
const SpeakingCardDeck = ({
  content,
  currentIndex,
  totalCards,
  deckRotation,
  swipeDirection,
  isDragging,
  dragOffset,
  handleDragStart,
  handleDragMove,
  handleDragEnd,
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
  isTourMode,
  tourSpeakingStep,
}) => {
  return (
    <div id="a2-speaking-container" className="relative w-[280px] h-[390px]">
      {[0, 1, 2].map((position) => {
        const cardIndex = currentIndex + (2 - position);
        const cardData =
          cardIndex >= 0 && cardIndex < totalCards ? content[cardIndex] : null;
        const colorIndex = (((position - deckRotation) % 3) + 3) % 3;
        const bgColor = cardColors[colorIndex];
        const base = baseTransforms[position];
        const isFrontCard = position === 2;
        let transform = `rotate(${base.rotate}deg) translateX(${base.x}px) translateY(${base.y}px) scale(${base.scale})`;
        let opacity = position === 0 ? 0.85 : position === 1 ? 0.92 : 1;
        let zIndex = position + 1;
        if (isFrontCard) {
          if (swipeDirection === "left") {
            transform =
              "translateX(-120%) translateY(20px) rotate(-20deg) scale(0.85)";
            opacity = 0.6;
            zIndex = 0;
          } else if (swipeDirection === "right") {
            transform =
              "translateX(120%) translateY(20px) rotate(20deg) scale(0.85)";
            opacity = 0.6;
            zIndex = 0;
          } else if (isDragging && dragOffset !== 0) {
            const r = dragOffset * 0.04,
              ty = Math.abs(dragOffset) * 0.08,
              s = Math.max(0.9, 1 - Math.abs(dragOffset) * 0.0008);
            transform = `translateX(${dragOffset}px) translateY(${ty}px) rotate(${r}deg) scale(${s})`;
          }
        }
        if (!isFrontCard && swipeDirection) {
          const newPos = position + 1,
            newBase = baseTransforms[Math.min(newPos, 2)];
          transform = `rotate(${newBase.rotate}deg) translateX(${newBase.x}px) translateY(${newBase.y}px) scale(${newBase.scale})`;
          opacity = newPos === 1 ? 0.92 : 1;
          zIndex = newPos + 1;
        }
        return (
          <div
            key={`card-${position}-${deckRotation}`}
            className={`absolute w-[280px] h-[370px] rounded-[20px] ${
              isFrontCard ? "cursor-grab select-none" : ""
            }`}
            style={{
              backgroundColor: bgColor,
              top: 0,
              left: 10,
              zIndex,
              transform,
              opacity,
              transition:
                isDragging && isFrontCard
                  ? "none"
                  : "all 0.35s cubic-bezier(0.25,0.46,0.45,0.94)",
              boxShadow:
                position >= 1 ? "4px 4px 36px rgba(0,0,0,0.1)" : "none",
            }}
            onMouseDown={isFrontCard ? handleDragStart : undefined}
            onMouseMove={isFrontCard ? handleDragMove : undefined}
            onMouseUp={isFrontCard ? handleDragEnd : undefined}
            onMouseLeave={isFrontCard ? handleDragEnd : undefined}
            onTouchStart={isFrontCard ? handleDragStart : undefined}
            onTouchMove={isFrontCard ? handleDragMove : undefined}
            onTouchEnd={isFrontCard ? handleDragEnd : undefined}
          >
            {position >= 1 && cardData && (
              <SpeakingCard
                cardData={cardData}
                isFrontCard={isFrontCard}
                swipeDirection={swipeDirection}
                isRecording={isRecording}
                isUploading={isUploading}
                recordingTime={recordingTime}
                formatTime={formatTime}
                onStartRecording={onStartRecording}
                onStopRecording={onStopRecording}
                isSpeaking={isSpeaking}
                isLoadingAudio={isLoadingAudio}
                onSpeak={onSpeak}
                assessmentResult={isFrontCard ? assessmentResult : null}
                onRetry={onRetry}
                isTourMode={isTourMode}
                tourSpeakingStep={isFrontCard ? tourSpeakingStep : 0}
              />
            )}
          </div>
        );
      })}
    </div>
  );
};
export default SpeakingCardDeck;
