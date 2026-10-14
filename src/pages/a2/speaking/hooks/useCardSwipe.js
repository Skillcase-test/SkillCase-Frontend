import { useState } from "react";
import { useDragChannel } from "../../../../hooks/useDragChannel";
const useCardSwipe = ({
  onNext,
  onPrevious,
  canGoNext,
  canGoPrevious,
  disabled,
}) => {
  const [swipeDirection, setSwipeDirection] = useState(null);
  const [dragStart, setDragStart] = useState(null);
  // The card follows the finger through the drag channel, not React state
  const drag = useDragChannel({ lift: 0.08, shrink: 0.0008, minScale: 0.9 });
  const dragOffsetRef = drag.offsetRef;
  const setDragOffset = drag.set;
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
    if (Math.abs(dragOffsetRef.current) > 80) {
      if (dragOffsetRef.current > 0 && canGoPrevious) {
        setSwipeDirection("right");
        setTimeout(() => {
          onPrevious();
          setSwipeDirection(null);
          setDragOffset(0);
        }, 250);
      } else if (dragOffsetRef.current < 0 && canGoNext) {
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
    drag,
    isDragging,
    handleDragStart,
    handleDragMove,
    handleDragEnd,
  };
};
export default useCardSwipe;
