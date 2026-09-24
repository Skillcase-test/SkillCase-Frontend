import React, { useState, useRef, useCallback } from "react";
import A1FlashcardCard from "./A1FlashcardCard";

const cardColors = ["#d6bbfb", "#d9f4ff", "#ffffff"];
const baseTransforms = [
  { rotate: 8, x: 0, y: -24, scale: 0.95 },
  { rotate: 5, x: 0, y: -15, scale: 0.97 },
  { rotate: 0, x: 0, y: 0, scale: 1 },
];

export default function A1FlashcardDeck({
  flashcardSet,
  currentCard,
  totalCards,
  deckRotation,
  isFlipped,
  swipeDirection,
  onSwipeLeft,
  onSwipeRight,
  shouldOpenTestPrompt,
  onTestPromptTrigger,
  onCardClick,
  onSpeak,
  isSpeaking,
  isLoadingAudio,
  containerId = "A1-flashcard-container",
  CardComponent = A1FlashcardCard,
  cardExtraProps,
}) {
  // useRef for drag tracking — avoids stale closure bug with useState
  const dragStartRef = useRef(null);
  const dragOffsetRef = useRef(0);
  const isDraggingRef = useRef(false);
  const hasDraggedRef = useRef(false);
  const touchStartTimeRef = useRef(0);
  const lastFlipTimeRef = useRef(0);

  // Only visual state triggers re-render for CSS transforms
  const [dragOffsetVisual, setDragOffsetVisual] = useState(0);
  const [isDraggingVisual, setIsDraggingVisual] = useState(false);

  const resetDrag = useCallback(() => {
    dragStartRef.current = null;
    dragOffsetRef.current = 0;
    isDraggingRef.current = false;
    hasDraggedRef.current = false;
    setDragOffsetVisual(0);
    setIsDraggingVisual(false);
  }, []);

  const triggerFlip = useCallback(() => {
    const now = Date.now();
    if (now - lastFlipTimeRef.current < 250) return;
    lastFlipTimeRef.current = now;
    onCardClick();
  }, [onCardClick]);

  const handleDragStart = useCallback(
    (e) => {
      if (swipeDirection) return;
      touchStartTimeRef.current = Date.now();
      const x = e.type === "mousedown" ? e.clientX : e.touches[0].clientX;
      dragStartRef.current = x;
      dragOffsetRef.current = 0;
      hasDraggedRef.current = false;
      isDraggingRef.current = false;
      setDragOffsetVisual(0);
    },
    [swipeDirection],
  );

  const handleDragMove = useCallback((e) => {
    if (dragStartRef.current === null) return;
    const currentX = e.type === "mousemove" ? e.clientX : e.touches[0].clientX;
    const offset = currentX - dragStartRef.current;
    dragOffsetRef.current = offset;

    // Only engage visual drag state if finger has actually moved past jitter threshold (10px)
    if (Math.abs(offset) > 10) {
      hasDraggedRef.current = true;
      if (!isDraggingRef.current) {
        isDraggingRef.current = true;
        setIsDraggingVisual(true);
      }
      setDragOffsetVisual(offset);
    }
  }, []);

  const handleDragEnd = useCallback(() => {
    if (dragStartRef.current === null) return;

    const offset = dragOffsetRef.current;
    const duration = Date.now() - touchStartTimeRef.current;

    if (Math.abs(offset) > 75) {
      if (offset > 0) {
        resetDrag();
        onSwipeRight();
      } else {
        const nextIndex = currentCard + 1;
        if (shouldOpenTestPrompt(nextIndex)) {
          resetDrag();
          onTestPromptTrigger(nextIndex);
        } else {
          resetDrag();
          onSwipeLeft();
        }
      }
    } else {
      const wasTap =
        !hasDraggedRef.current && Math.abs(offset) < 15 && duration < 500;
      resetDrag();
      if (wasTap) {
        triggerFlip();
      }
    }
  }, [
    currentCard,
    onSwipeLeft,
    onSwipeRight,
    shouldOpenTestPrompt,
    onTestPromptTrigger,
    resetDrag,
    triggerFlip,
  ]);

  return (
    <div
      id={containerId}
      data-no-pull-refresh
      className="relative w-[300px] h-[370px]"
      style={{ perspective: "1000px" }}
    >
      {[0, 1, 2].map((position) => {
        const isGoingBackwards =
          swipeDirection === "right" ||
          (!swipeDirection && isDraggingVisual && dragOffsetVisual > 0);

        let cardIndex = currentCard + (2 - position);
        if (isGoingBackwards && position < 2) {
          cardIndex = currentCard - 1 + (1 - position);
        }

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
          } else if (isDraggingVisual && dragOffsetVisual !== 0) {
            const rotation = dragOffsetVisual * 0.04;
            const translateY = Math.abs(dragOffsetVisual) * 0.06;
            const scale = Math.max(
              0.92,
              1 - Math.abs(dragOffsetVisual) * 0.0006,
            );
            transform = `translateX(${dragOffsetVisual}px) translateY(${translateY}px) rotate(${rotation}deg) scale(${scale})`;
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
            className={`absolute w-[300px] h-[340px] rounded-[20px] ${
              isFrontCard
                ? "cursor-grab active:cursor-grabbing select-none touch-none"
                : ""
            }`}
            style={{
              backgroundColor: isFrontCard ? "transparent" : bgColor,
              boxShadow:
                position >= 1 && !isFrontCard
                  ? "0 4px 20px rgba(0,0,0,0.08)"
                  : "none",
              top: "0px",
              left: "0px",
              zIndex,
              transform,
              opacity,
              transition:
                isDraggingVisual && isFrontCard
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
            onTouchCancel={isFrontCard ? handleDragEnd : undefined}
            onClick={isFrontCard ? triggerFlip : undefined}
          >
            {position >= 1 && cardData && (
              <CardComponent
                cardData={cardData}
                isFrontCard={isFrontCard}
                isFlipped={isFlipped}
                bgColor={bgColor}
                swipeDirection={swipeDirection}
                onSpeak={onSpeak}
                isSpeaking={isSpeaking}
                isLoadingAudio={isLoadingAudio}
                {...cardExtraProps}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
