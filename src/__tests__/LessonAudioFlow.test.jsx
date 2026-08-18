import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import IntroScreen from "../pages/learnGerman/lesson/screens/IntroScreen";
import VocabScreen from "../pages/learnGerman/lesson/screens/VocabScreen";
import QuizScreen from "../pages/learnGerman/lesson/screens/QuizScreen";
import OutroScreen from "../pages/learnGerman/lesson/screens/OutroScreen";
import LessonScenarioScreen from "../pages/learnGerman/lesson/screens/LessonScenarioScreen";
import api from "../api/axios";
import {
  setTTSMuted,
} from "../pages/learnGerman/lesson/screens/shared/ttsMutePreference";
import { resetLastPlayedDialogue } from "../pages/learnGerman/lesson/screens/shared/useMayaTTS";

describe("Lesson audio flow, cutoff, and duplicate suppression across screens", () => {
  let playSpy;
  let pauseSpy;
  let lastAudio;

  beforeEach(() => {
    localStorage.clear();
    resetLastPlayedDialogue();
    setTTSMuted(false);

    playSpy = vi.fn().mockResolvedValue();
    pauseSpy = vi.fn();

    vi.stubGlobal(
      "Audio",
      vi.fn().mockImplementation(function (src) {
        lastAudio = {
          src,
          play: playSpy,
          pause: pauseSpy,
          onended: null,
          onerror: null,
        };
        return lastAudio;
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
    vi.restoreAllMocks();
  });

  it("plays audio on screen 1, then plays audio on screen 2 when dialogue text changes", async () => {
    let unmount;
    await act(async () => {
      const res = render(
        <IntroScreen
          screen={{ dialogue: "Welcome to the German class!" }}
          title="Intro"
          progressRatio={0.1}
          level="A1"
        />,
      );
      unmount = res.unmount;
    });

    expect(playSpy).toHaveBeenCalledTimes(1);

    unmount();

    await act(async () => {
      render(
        <VocabScreen
          screen={{ word: "Apfel", dialogue: "Look at the fresh apples." }}
          title="Vocab"
          progressRatio={0.2}
          level="A1"
          speakWord={vi.fn()}
        />,
      );
    });

    expect(playSpy).toHaveBeenCalledTimes(2);
  });

  it("suppresses auto-play on screen 2 when dialogue text is identical to screen 1", async () => {
    let unmount;
    await act(async () => {
      const res = render(
        <QuizScreen
          screen={{
            dialogue: "Answer the question carefully!",
            question: "Q1",
            options: ["A", "B"],
          }}
          progressRatio={0.3}
          title="Quiz 1"
          level="A1"
          speakWord={vi.fn()}
        />,
      );
      unmount = res.unmount;
    });

    expect(playSpy).toHaveBeenCalledTimes(1);

    unmount();

    // Next screen has the EXACT same Maya dialogue
    await act(async () => {
      render(
        <QuizScreen
          screen={{
            dialogue: "Answer the question carefully!",
            question: "Q2",
            options: ["C", "D"],
          }}
          progressRatio={0.4}
          title="Quiz 2"
          level="A1"
          speakWord={vi.fn()}
        />,
      );
    });

    // Audio should still have only been called once (from Screen 1)
    expect(playSpy).toHaveBeenCalledTimes(1);

    // Manual click on Screen 2 overrides suppression
    const playBtn = screen.getByLabelText("Play Maya Audio");
    await act(async () => {
      fireEvent.click(playBtn);
    });

    expect(playSpy).toHaveBeenCalledTimes(2);
  });

  it("plays on OutroScreen even if dialogue text matches previous screen because outro skips suppression", async () => {
    let unmount;
    await act(async () => {
      const res = render(
        <IntroScreen
          screen={{ dialogue: "Great job! See you next time." }}
          title="Intro"
          progressRatio={0.1}
          level="A1"
        />,
      );
      unmount = res.unmount;
    });

    expect(playSpy).toHaveBeenCalledTimes(1);

    unmount();

    await act(async () => {
      render(
        <OutroScreen
          screen={{ dialogues: ["Great job! See you next time."] }}
          progressRatio={1}
          title="Outro"
          level="A1"
        />,
      );
    });

    // OutroScreen sets skipSuppression, so it plays
    expect(playSpy).toHaveBeenCalledTimes(2);
  });

  it("cuts off audio immediately on unmount", async () => {
    let unmount;
    await act(async () => {
      const res = render(
        <IntroScreen
          screen={{ dialogue: "Playing intro speech" }}
          title="Intro"
          progressRatio={0.1}
          level="A1"
        />,
      );
      unmount = res.unmount;
    });

    expect(playSpy).toHaveBeenCalledTimes(1);

    unmount();

    expect(pauseSpy).toHaveBeenCalled();
  });

  it("handles multi-dialogue scenario screen with step transitions", async () => {
    await act(async () => {
      render(
        <LessonScenarioScreen
          screen={{
            dialogues: [
              "Step 1: First instruction",
              "Step 2: Second instruction",
            ],
          }}
          progressRatio={0.2}
          title="Scenario"
          level="A1"
        />,
      );
    });

    expect(playSpy).toHaveBeenCalledTimes(1);

    // Click continue button to advance to Step 2
    const continueButtons = screen.getAllByRole("button", { name: /continue/i });
    await act(async () => {
      fireEvent.click(continueButtons[continueButtons.length - 1]);
    });

    expect(playSpy).toHaveBeenCalledTimes(2);
  });
});
