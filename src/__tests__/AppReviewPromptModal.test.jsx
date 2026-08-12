import React from "react";
import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockNative = vi.fn();
vi.mock("@capacitor/core", () => ({
  Capacitor: { isNativePlatform: () => mockNative() },
}));

const mockRequestReview = vi.fn();
const mockOpenAppStore = vi.fn();
vi.mock("@capawesome/capacitor-app-review", () => ({
  AppReview: {
    requestReview: (...a) => mockRequestReview(...a),
    openAppStore: (...a) => mockOpenAppStore(...a),
  },
}));

const mockOpenUrl = vi.fn();
vi.mock("@capacitor/app", () => ({
  App: { openUrl: (...a) => mockOpenUrl(...a) },
}));

const mockPost = vi.fn().mockResolvedValue({ data: {} });
vi.mock("../api/axios", () => ({
  default: { post: (...a) => mockPost(...a) },
}));

vi.mock("../telemetry", () => ({
  recordEvent: vi.fn(),
}));

import AppReviewPromptModal from "../components/AppReviewPromptModal";

function dispatchReviewEvent(detail) {
  act(() => {
    window.dispatchEvent(
      new CustomEvent("skillcase:show-review-prompt", { detail }),
    );
  });
}

describe("AppReviewPromptModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    mockNative.mockReturnValue(true);
    mockRequestReview.mockResolvedValue(true);
    mockOpenAppStore.mockResolvedValue(true);
    mockOpenUrl.mockResolvedValue(true);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders nothing until a review-prompt event fires", () => {
    render(<AppReviewPromptModal />);
    expect(screen.queryByText(/Rate us on Play Store/)).not.toBeInTheDocument();
  });

  it("never opens on web — only native Capacitor app users", () => {
    vi.useFakeTimers();
    mockNative.mockReturnValue(false);
    render(<AppReviewPromptModal />);
    dispatchReviewEvent({ milestone: 7, streakDays: 7 });
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(screen.queryByText(/Rate us on Play Store/)).not.toBeInTheDocument();
  });

  it("opens after the sequencing delay and acks the shown milestone", () => {
    vi.useFakeTimers();
    render(<AppReviewPromptModal />);
    dispatchReviewEvent({ milestone: 7, streakDays: 7 });

    // Not shown yet — waiting for the streak celebration to breathe.
    expect(screen.queryByText(/Rate us on Play Store/)).not.toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1600);
    });

    expect(screen.getByText("A full week of daily learning!")).toBeInTheDocument();
    expect(screen.getByText(/Rate us on Play Store/)).toBeInTheDocument();
    expect(mockPost).toHaveBeenCalledWith(
      "/streak/review/prompted",
      { milestone: 7 },
      expect.objectContaining({ meta: { skipCacheInvalidation: true } }),
    );
  });

  it("ignores a second event while one prompt is already open", async () => {
    vi.useFakeTimers();
    render(<AppReviewPromptModal />);
    dispatchReviewEvent({ milestone: 2, streakDays: 2 });
    dispatchReviewEvent({ milestone: 7, streakDays: 7 });

    act(() => {
      vi.advanceTimersByTime(1600);
    });

    expect(screen.getByText("Two days in a row — awesome!")).toBeInTheDocument();
    expect(
      screen.queryByText("A full week of daily learning!"),
    ).not.toBeInTheDocument();
  });

  it("rating now opens the Play Store listing and marks the user reviewed server-side", async () => {
    vi.useFakeTimers();
    render(<AppReviewPromptModal />);
    dispatchReviewEvent({ milestone: 20, streakDays: 20 });

    act(() => {
      vi.advanceTimersByTime(1600);
    });

    await act(async () => {
      screen.getByText(/Rate us on Play Store/).click();
    });

    // The in-app review sheet is never relied on — it silently no-ops on quota
    // exhaustion — so the store listing must open every time.
    expect(mockOpenAppStore).toHaveBeenCalledTimes(1);
    expect(mockRequestReview).not.toHaveBeenCalled();
    expect(mockPost).toHaveBeenCalledWith(
      "/streak/review/completed",
      { milestone: 20 },
      expect.objectContaining({ meta: { skipCacheInvalidation: true } }),
    );
  });

  it("falls back to the Play Store deep link if opening the listing fails", async () => {
    mockOpenAppStore.mockRejectedValue(new Error("no activity found"));
    vi.useFakeTimers();
    render(<AppReviewPromptModal />);
    dispatchReviewEvent({ milestone: 7, streakDays: 7 });

    act(() => {
      vi.advanceTimersByTime(1600);
    });

    await act(async () => {
      screen.getByText(/Rate us on Play Store/).click();
    });

    expect(mockOpenUrl).toHaveBeenCalledWith({
      url: "market://details?id=com.skillcase.app",
    });
    expect(mockPost).toHaveBeenCalledWith(
      "/streak/review/completed",
      expect.any(Object),
      expect.any(Object),
    );
  });

  it("Maybe later just dismisses without marking the user reviewed", async () => {
    vi.useFakeTimers();
    render(<AppReviewPromptModal />);
    dispatchReviewEvent({ milestone: 2, streakDays: 2 });

    act(() => {
      vi.advanceTimersByTime(1600);
    });

    act(() => {
      screen.getByText("Maybe later").click();
    });
    // Let the 300ms exit animation finish before asserting it is gone.
    act(() => {
      vi.advanceTimersByTime(400);
    });

    expect(mockRequestReview).not.toHaveBeenCalled();
    expect(mockPost).not.toHaveBeenCalledWith(
      "/streak/review/completed",
      expect.anything(),
      expect.anything(),
    );
    expect(screen.queryByText(/Rate us on Play Store/)).not.toBeInTheDocument();
  });

  it("never re-surfaces the same milestone twice within one app session", () => {
    vi.useFakeTimers();
    render(<AppReviewPromptModal />);
    dispatchReviewEvent({ milestone: 7, streakDays: 7 });

    act(() => {
      vi.advanceTimersByTime(1600);
    });
    expect(screen.getByText("A full week of daily learning!")).toBeInTheDocument();

    // Dismiss, wait for the exit animation, then the server (still unacked)
    // returns the same milestone again — the modal must stay closed.
    act(() => {
      screen.getByText("Maybe later").click();
    });
    act(() => {
      vi.advanceTimersByTime(400);
    });

    dispatchReviewEvent({ milestone: 7, streakDays: 8 });
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(screen.queryByText(/Rate us on Play Store/)).not.toBeInTheDocument();
  });
});
