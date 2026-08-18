import { describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { usePullToRefresh } from "../hooks/usePullToRefresh";

vi.mock("../utils/haptics", () => ({
  hapticLight: vi.fn(),
  hapticMedium: vi.fn(),
}));

// THRESHOLD(150) * RESISTANCE(0.40) = 60px of pull arms the refresh.
const touch = (clientY) => ({
  touches: [{ clientY }],
  target: { closest: () => null },
  preventDefault: () => {},
});

function setup() {
  const onRefresh = vi.fn().mockResolvedValue(undefined);
  const { result } = renderHook(() => usePullToRefresh(onRefresh, true));
  const el = document.createElement("div");
  result.current.contentRef.current = el;
  return { onRefresh, result, el };
}

describe("usePullToRefresh", () => {
  it("follows the finger on contentRef without churning containerProps", () => {
    const { result, el } = setup();
    const propsBefore = result.current.containerProps;

    act(() => result.current.containerProps.onTouchStart(touch(0)));
    for (const y of [10, 40, 90, 150]) {
      act(() => result.current.containerProps.onTouchMove(touch(y)));
    }

    expect(el.style.transform).toBe("translateY(60px)");
    expect(el.style.transition).toBe("none");
    // The regression this guards: a new identity here made App.jsx's effect
    // re-attach all three touch listeners on every frame of the gesture.
    expect(result.current.containerProps).toBe(propsBefore);
  });

  it("refreshes and snaps back once past the threshold", async () => {
    const { onRefresh, result, el } = setup();

    act(() => result.current.containerProps.onTouchStart(touch(0)));
    act(() => result.current.containerProps.onTouchMove(touch(150)));
    await act(() => result.current.containerProps.onTouchEnd());

    expect(onRefresh).toHaveBeenCalledOnce();
    expect(el.style.transform).toBe("");
    expect(el.style.transition).toContain("0.3s");
  });

  it("does not refresh below the threshold", async () => {
    const { onRefresh, result, el } = setup();

    act(() => result.current.containerProps.onTouchStart(touch(0)));
    act(() => result.current.containerProps.onTouchMove(touch(100)));
    await act(() => result.current.containerProps.onTouchEnd());

    expect(onRefresh).not.toHaveBeenCalled();
    expect(el.style.transform).toBe("");
  });

  it("ignores upward drags", () => {
    const { result, el } = setup();

    act(() => result.current.containerProps.onTouchStart(touch(100)));
    act(() => result.current.containerProps.onTouchMove(touch(40)));
    expect(el.style.transform).toBe("");
  });

  it("ignores subtrees marked data-no-pull-refresh", () => {
    const { result, el } = setup();

    act(() =>
      result.current.containerProps.onTouchStart({
        ...touch(0),
        target: { closest: () => ({}) },
      }),
    );
    act(() => result.current.containerProps.onTouchMove(touch(150)));
    expect(el.style.transform).toBe("");
  });
});
