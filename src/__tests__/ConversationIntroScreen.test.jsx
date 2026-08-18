import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import ConversationIntroScreen from "../pages/learnGerman/lesson/screens/ConversationIntroScreen";
import api from "../api/axios";
import { setTTSMuted } from "../pages/learnGerman/lesson/screens/shared/ttsMutePreference";
import { resetLastPlayedDialogue } from "../pages/learnGerman/lesson/screens/shared/useMayaTTS";

describe("ConversationIntroScreen progression", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    resetLastPlayedDialogue();
    setTTSMuted(false);

    vi.stubGlobal(
      "Audio",
      vi.fn().mockImplementation(function (src) {
        return {
          src,
          play: vi.fn().mockResolvedValue(),
          pause: vi.fn(),
          onended: null,
          onerror: null,
        };
      }),
    );

    vi.stubGlobal("URL", {
      createObjectURL: vi.fn(() => "blob:mock-audio-url"),
      revokeObjectURL: vi.fn(),
    });

    vi.spyOn(api, "post").mockResolvedValue({
      data: new Blob(["dummy audio"], { type: "audio/mpeg" }),
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  const screenData = {
    dialogues: [
      "Maya Line 1: Welcome to the bakery.",
      "Maya Line 2: You will order some fresh bread.",
    ],
    characterDialogue: "Hallo! Ich bin Jacob.",
    image: "https://example.com/baker.jpg",
  };

  it("advances dialogues ONLY when Continue button is clicked, not on background or bubble taps", async () => {
    const onNextMock = vi.fn();

    render(
      <ConversationIntroScreen
        screen={screenData}
        onNext={onNextMock}
        onPrev={vi.fn()}
        progressRatio={0.5}
        title="Intro"
        level="A1"
      />,
    );

    // Fast-forward typewriter for dialogue 1
    act(() => {
      vi.advanceTimersByTime(2500);
    });

    expect(
      screen.getByText("Maya Line 1: Welcome to the bakery."),
    ).toBeInTheDocument();

    // Tapping the image scenario background or bubble should NOT advance
    const scenarioImg = screen.getByAltText("Scenario");
    act(() => {
      fireEvent.click(scenarioImg);
    });

    // Still on dialogue 1
    expect(
      screen.getByText("Maya Line 1: Welcome to the bakery."),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Maya Line 2: You will order some fresh bread."),
    ).not.toBeInTheDocument();

    // Clicking the Continue button advances to dialogue 2
    const continueBtn = screen.getByRole("button", { name: /continue/i });
    act(() => {
      fireEvent.click(continueBtn);
    });

    // Fast-forward typewriter for dialogue 2
    act(() => {
      vi.advanceTimersByTime(2500);
    });

    expect(
      screen.getByText("Maya Line 2: You will order some fresh bread."),
    ).toBeInTheDocument();

    // After dialogue 2 finishes, character dialogue triggers
    const startConvBtn = screen.getByRole("button", {
      name: /start conversation/i,
    });
    expect(startConvBtn).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(2500);
    });

    // Clicking Start Conversation calls onNext
    act(() => {
      fireEvent.click(startConvBtn);
    });

    expect(onNextMock).toHaveBeenCalledTimes(1);
  });
});
