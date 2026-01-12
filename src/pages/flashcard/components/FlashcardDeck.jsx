import React from "react";
import FlashcardCard from "./FlashcardCard";
import "../../../tour/tourStyles.css";

const cardColors = ["#d6bbfb", "#d9f4ff", "#ffffff"];
const baseTransforms = [
  { rotate: 8, x: 0, y: -24, scale: 0.95 },
  { rotate: 5, x: 0, y: -15, scale: 0.97 },
  { rotate: 0, x: 0, y: 0, scale: 1 },
];
const FlashcardDeck = ({
  flashcardSet,
  currentCard,
  totalCards,
  deckRotation,
  isFlipped,
  swipeDirection,
  isDragging,
  dragOffset,
  handleDragStart,
  handleDragMove,
  handleDragEnd,
  onCardClick,
  onSpeak,
  isSpeaking,
  isLoadingAudio,
  isTourMode = false,
  userId, // For user-specific article education
  onShowExplanation,
  chapterNumber,
}) => {
  return (
    <div
      className="relative w-[280px] h-[350px]"
      style={{ perspective: "1000px" }}
    >
      {[0, 1, 2].map((position) => {
        const cardIndex = currentCard + (2 - position);
        const cardData =
          cardIndex >= 0 && cardIndex < totalCards
            ? flashcardSet[cardIndex]
            : null;
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
            const rotation = dragOffset * 0.04;
            const translateY = Math.abs(dragOffset) * 0.08;
            const scale = 1 - Math.abs(dragOffset) * 0.0008;
            transform = `translateX(${dragOffset}px) translateY(${translateY}px) rotate(${rotation}deg) scale(${Math.max(
              0.9,
              scale
            )})`;
          }
        }
        if (!isFrontCard && swipeDirection) {
          const newPosition = position + 1;
          const newBase = baseTransforms[Math.min(newPosition, 2)];
          transform = `rotate(${newBase.rotate}deg) translateX(${newBase.x}px) translateY(${newBase.y}px) scale(${newBase.scale})`;
          opacity = newPosition === 1 ? 0.92 : 1;
          zIndex = newPosition + 1;
        }
        return (
          <div
            key={`card-${position}-${deckRotation}`}
            className={`absolute w-[280px] h-[320px] rounded-[20px] ${
              isFrontCard
                ? "cursor-grab active:cursor-grabbing select-none"
                : ""
            }`}
            style={{
              backgroundColor: isFrontCard ? "transparent" : bgColor,
              boxShadow:
                position >= 1 && !isFrontCard
                  ? "4px 4px 36px 0px rgba(0,0,0,0.1)"
                  : "none",
              top: "0px",
              left: "0px",
              zIndex,
              transform,
              opacity,
              transition:
                isDragging && isFrontCard
                  ? "none"
                  : "all 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
              transformStyle: "preserve-3d",
            }}
            onMouseDown={isFrontCard ? handleDragStart : undefined}
            onMouseMove={isFrontCard ? handleDragMove : undefined}
            onMouseUp={isFrontCard ? handleDragEnd : undefined}
            onMouseLeave={isFrontCard ? handleDragEnd : undefined}
            onTouchStart={isFrontCard ? handleDragStart : undefined}
            onTouchMove={isFrontCard ? handleDragMove : undefined}
            onTouchEnd={isFrontCard ? handleDragEnd : undefined}
            onClick={isFrontCard ? onCardClick : undefined}
          >
            {position >= 1 && cardData && (
              <FlashcardCard
                cardData={cardData}
                isFrontCard={isFrontCard}
                isFlipped={isFlipped}
                bgColor={bgColor}
                swipeDirection={swipeDirection}
                onSpeak={onSpeak}
                isSpeaking={isSpeaking}
                isLoadingAudio={isLoadingAudio}
                isTourMode={isTourMode}
                userId={userId}
                onShowExplanation={onShowExplanation}
                chapterNumber={chapterNumber}
              />
            )}
          </div>
        );
      })}
    </div>
  );
};
export default FlashcardDeck;
