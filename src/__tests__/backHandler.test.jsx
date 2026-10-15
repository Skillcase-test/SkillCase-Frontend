import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { runBackHandler, useBackHandler } from "../router/backButton";

function Screen({ onBack, enabled = true }) {
  useBackHandler(onBack, enabled);
  return null;
}

describe("useBackHandler", () => {
  it("does nothing when disabled, so the default history back runs", () => {
    render(<Screen onBack={vi.fn()} enabled={false} />);
    expect(runBackHandler()).toBe(false);
  });

  it("the view enabled last (e.g. a modal over its page) handles back first", () => {
    const page = vi.fn();
    const modal = vi.fn();
    const { rerender } = render(
      <>
        <Screen onBack={page} />
        <Screen onBack={modal} enabled={false} />
      </>,
    );
    rerender(
      <>
        <Screen onBack={page} />
        <Screen onBack={modal} enabled />
      </>,
    );
    runBackHandler();
    expect(modal).toHaveBeenCalledTimes(1);
    expect(page).not.toHaveBeenCalled();

    rerender(
      <>
        <Screen onBack={page} />
        <Screen onBack={modal} enabled={false} />
      </>,
    );
    runBackHandler();
    expect(page).toHaveBeenCalledTimes(1);
  });

  it("re-renders keep the stack order and call the latest handler", () => {
    const first = vi.fn();
    const second = vi.fn();
    const modal = vi.fn();
    const { rerender, unmount } = render(
      <>
        <Screen onBack={first} />
        <Screen onBack={modal} />
      </>,
    );
    rerender(
      <>
        <Screen onBack={second} />
        <Screen onBack={modal} />
      </>,
    );
    runBackHandler();
    expect(modal).toHaveBeenCalledTimes(1);
    expect(first).not.toHaveBeenCalled();
    unmount();
    expect(runBackHandler()).toBe(false);
  });
});
