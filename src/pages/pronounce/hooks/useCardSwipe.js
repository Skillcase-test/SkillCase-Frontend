import { useState } from "react";
const useCardSwipe = ({
  onNext,
  onPrevious,
  canGoNext,
  canGoPrevious,
  disabled,
}) => {
  const [swipeDirection, setSwipeDirection] = useState(null);
  const [dragStart, setDragStart] = useState(null);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const handleDragStart = (e) => {
    if (disabled) return;
    const clientX = e.type === "mousedown" ? e.clientX : e.touches[0].clientX;
    setDragStart(clientX);
    setIsDragging(true);
    setSwipeDirection(null);
  };
  const handleDragMove = (e) => {
    if (!dragStart || disabled) return;
    const clientX = e.type === "mousemove" ? e.clientX : e.touches[0].clientX;
    const delta = clientX - dragStart;
    setDragOffset(delta);
  };
  const handleDragEnd = () => {
    if (!dragStart || disabled) return;
    const swipeThreshold = 80;
    if (Math.abs(dragOffset) > swipeThreshold) {
      if (dragOffset > 0 && canGoPrevious) {
        setSwipeDirection("right");
        setTimeout(() => {
          onPrevious();
          setSwipeDirection(null);
          setDragOffset(0);
        }, 250);
      } else if (dragOffset < 0 && canGoNext) {
        setSwipeDirection("left");
        setTimeout(() => {
          onNext();
          setSwipeDirection(null);
          setDragOffset(0);
        }, 250);
      } else {
        setDragOffset(0);
      }
    } else {
      setDragOffset(0);
    }
    setDragStart(null);
    setIsDragging(false);
  };
  const getCardTransform = () => {
    if (swipeDirection === "left") {
      return "translateX(-120%) translateY(20px) rotate(-20deg) scale(0.85)";
    }
    if (swipeDirection === "right") {
      return "translateX(120%) translateY(20px) rotate(20deg) scale(0.85)";
    }
    if (isDragging && dragOffset !== 0) {
      const rotation = dragOffset * 0.04;
      const translateY = Math.abs(dragOffset) * 0.08;
      const scale = 1 - Math.abs(dragOffset) * 0.0008;
      return `translateX(${dragOffset}px) translateY(${translateY}px) rotate(${rotation}deg) scale(${Math.max(
        0.9,
        scale
      )})`;
    }
    return "translateX(0) translateY(0) rotate(0deg) scale(1)";
  };
  return {
    swipeDirection,
    dragOffset,
    isDragging,
    handleDragStart,
    handleDragMove,
    handleDragEnd,
    getCardTransform,
  };
};
export default useCardSwipe;
