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
    setDragOffset(clientX - dragStart);
  };
  const handleDragEnd = () => {
    if (!dragStart || disabled) return;
    if (Math.abs(dragOffset) > 80) {
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
  return {
    swipeDirection,
    dragOffset,
    isDragging,
    handleDragStart,
    handleDragMove,
    handleDragEnd,
  };
};
export default useCardSwipe;
