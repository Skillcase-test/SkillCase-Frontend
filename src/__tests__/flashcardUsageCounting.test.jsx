import React, { useEffect, useRef } from "react";
import { act, render } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";

// The three flashcard pages all save progress from an effect keyed on the
// card index, which also fires on mount, on backward navigation and when
// completedTests changes. Before `advanced`, every one of those writes was
// charged against the usage cap — so "20 flashcards/day" actually meant 20
// progress writes, and re-opening a set 20 times burned the whole day.
//
// This reproduces that exact effect shape rather than mounting the real
// pages (which pull in swipe/TTS/telemetry/redux); what's under test is the
// advance-detection rule, and it must hold identically in all three copies.
const saveFlashcardProgress = vi.fn(() => Promise.resolve());

function FlashcardProgressHarness({ currentCard, setId = "s1", totalCards = 50, completed = false }) {
  const savedCardRef = useRef(null);

  useEffect(() => {
    if (!setId || totalCards === 0) return;
    const advanced = savedCardRef.current !== null && currentCard > savedCardRef.current;
    savedCardRef.current = currentCard;
    saveFlashcardProgress({
      setId,
      currentIndex: currentCard,
      isCompleted: completed,
      advanced,
    }).catch(() => {});
  }, [currentCard, setId, totalCards, completed]);

  return <div>card {currentCard}</div>;
}

function lastAdvanced() {
  const calls = saveFlashcardProgress.mock.calls;
  return calls[calls.length - 1][0].advanced;
}

describe("flashcard progress counting", () => {
  beforeEach(() => {
    saveFlashcardProgress.mockClear();
  });

  it("does not count the save fired on mount — opening a set consumes no cards", () => {
    render(<FlashcardProgressHarness currentCard={0} />);

    expect(saveFlashcardProgress).toHaveBeenCalledTimes(1);
    expect(lastAdvanced()).toBe(false);
  });

  it("does not count a mount that restored a mid-deck index from the URL", () => {
    render(<FlashcardProgressHarness currentCard={12} />);

    expect(lastAdvanced()).toBe(false);
  });

  it("counts a forward advance", () => {
    const { rerender } = render(<FlashcardProgressHarness currentCard={0} />);
    rerender(<FlashcardProgressHarness currentCard={1} />);

    expect(saveFlashcardProgress).toHaveBeenCalledTimes(2);
    expect(lastAdvanced()).toBe(true);
  });

  it("does not count swiping backwards — going back used to burn quota", () => {
    const { rerender } = render(<FlashcardProgressHarness currentCard={5} />);
    rerender(<FlashcardProgressHarness currentCard={4} />);

    expect(lastAdvanced()).toBe(false);
  });

  it("does not count a re-save triggered only by completedTests changing", () => {
    const { rerender } = render(<FlashcardProgressHarness currentCard={7} />);
    rerender(<FlashcardProgressHarness currentCard={7} completed />);

    expect(saveFlashcardProgress).toHaveBeenCalledTimes(2);
    expect(lastAdvanced()).toBe(false);
  });

  it("does not count a jump back to 0 from shuffle/restart", () => {
    const { rerender } = render(<FlashcardProgressHarness currentCard={30} />);
    rerender(<FlashcardProgressHarness currentCard={0} />);

    expect(lastAdvanced()).toBe(false);
  });

  it("counts a continue-after-test advance the same as a swipe — the rule is derived from the index, not the call site", () => {
    const { rerender } = render(<FlashcardProgressHarness currentCard={19} />);
    // Quiz interstitial resolves and the deck moves on.
    rerender(<FlashcardProgressHarness currentCard={20} />);

    expect(lastAdvanced()).toBe(true);
  });

  it("N cards viewed costs exactly N — not N plus the mount and the backtracks", () => {
    const { rerender } = render(<FlashcardProgressHarness currentCard={0} />);
    // Forward 5, back 2, forward 2 again: 7 forward advances total.
    [1, 2, 3, 4, 5, 4, 3, 4, 5].forEach((i) => {
      act(() => {
        rerender(<FlashcardProgressHarness currentCard={i} />);
      });
    });

    const counted = saveFlashcardProgress.mock.calls.filter((c) => c[0].advanced).length;
    expect(counted).toBe(7);
    // Every save still reaches the server — only the charging changed.
    expect(saveFlashcardProgress).toHaveBeenCalledTimes(10);
  });
});
