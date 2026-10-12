import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import useCardSwipe from "../pages/a2/speaking/hooks/useCardSwipe";

const touch = (type, x) => ({ type, touches: [{ clientX: x }] });

function setup(overrides = {}) {
  const onNext = vi.fn();
  const onPrevious = vi.fn();
  const hook = renderHook(() =>
    useCardSwipe({ onNext, onPrevious, canGoNext: true, canGoPrevious: true, disabled: false, ...overrides }),
  );
  return { ...hook, onNext, onPrevious };
}

// Each handler runs in its own act() so state from the previous step is
// committed, like separate touch events in the browser
function drag(result, from, to, steps = 6) {
  act(() => result.current.handleDragStart(touch("touchstart", from)));
  for (let i = 1; i <= steps; i++) {
    act(() => result.current.handleDragMove(touch("touchmove", from + ((to - from) * i) / steps)));
  }
}

describe("useCardSwipe with frame-coalesced drag", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("swipes to the next card past the threshold, even before the frame renders", () => {
    const { result, onNext, onPrevious } = setup();
    drag(result, 300, 150);
    act(() => result.current.handleDragEnd());
    expect(result.current.swipeDirection).toBe("left");
    act(() => vi.advanceTimersByTime(300));
    expect(onNext).toHaveBeenCalledTimes(1);
    expect(onPrevious).not.toHaveBeenCalled();
    expect(result.current.dragOffset).toBe(0);
  });

  it("swipes back on a right drag", () => {
    const { result, onPrevious } = setup();
    drag(result, 100, 250);
    act(() => result.current.handleDragEnd());
    act(() => vi.advanceTimersByTime(300));
    expect(onPrevious).toHaveBeenCalledTimes(1);
  });

  it("snaps back on a short drag", () => {
    const { result, onNext, onPrevious } = setup();
    drag(result, 200, 150);
    act(() => vi.advanceTimersByTime(20));
    expect(result.current.dragOffset).toBe(-50);
    act(() => result.current.handleDragEnd());
    act(() => vi.advanceTimersByTime(300));
    expect(onNext).not.toHaveBeenCalled();
    expect(onPrevious).not.toHaveBeenCalled();
    expect(result.current.dragOffset).toBe(0);
    expect(result.current.isDragging).toBe(false);
  });

  it("renders the drag offset once per frame", () => {
    const { result } = setup();
    act(() => result.current.handleDragStart(touch("touchstart", 200)));
    act(() => {
      result.current.handleDragMove(touch("touchmove", 190));
      result.current.handleDragMove(touch("touchmove", 170));
    });
    act(() => vi.advanceTimersByTime(20));
    expect(result.current.dragOffset).toBe(-30);
  });
});
