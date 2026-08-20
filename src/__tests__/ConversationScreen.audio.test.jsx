import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import ConversationScreen from "../pages/learnGerman/lesson/screens/ConversationScreen";
import {
  isTTSMuted,
  setTTSMuted,
} from "../pages/learnGerman/lesson/screens/shared/ttsMutePreference";

describe("ConversationScreen audio and mute functionality", () => {
  let speakWordMock;

  beforeEach(() => {
    localStorage.clear();
    setTTSMuted(false);
    speakWordMock = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const baseScreen = {
    characterDialogue: "Hallo! Wie geht es dir?",
    englishMeaning: "Hello! How are you?",
    characterImage: "",
    options: ["Gut, danke!", "Nicht so gut"],
    correctOptionIndexes: [0],
  };

  it("auto-speaks character dialogue on mount when unmuted", () => {
    render(
      <ConversationScreen
        screen={baseScreen}
        currentScreenIndex={0}
        conversationHistory={[]}
        conversationSelections={{}}
        selectedOption={null}
        setSelectedOption={vi.fn()}
        onCheck={vi.fn()}
        onNext={vi.fn()}
        onPrev={vi.fn()}
        speakWord={speakWordMock}
        isSpeaking={false}
      />,
    );

    expect(speakWordMock).toHaveBeenCalledWith("Hallo! Wie geht es dir?", {
      key: "current-0",
    });
    expect(
      screen.getByLabelText("Play conversation audio"),
    ).toBeInTheDocument();
  });

  it("does not auto-speak when muted and shows VolumeX icon", () => {
    setTTSMuted(true);

    render(
      <ConversationScreen
        screen={baseScreen}
        currentScreenIndex={0}
        conversationHistory={[]}
        conversationSelections={{}}
        selectedOption={null}
        setSelectedOption={vi.fn()}
        onCheck={vi.fn()}
        onNext={vi.fn()}
        speakWord={speakWordMock}
        isSpeaking={false}
      />,
    );

    expect(speakWordMock).not.toHaveBeenCalled();
    expect(
      screen.getByLabelText("Unmute conversation audio"),
    ).toBeInTheDocument();
  });

  it("clicking mute icon un-mutes globally and speaks the dialogue", () => {
    setTTSMuted(true);

    render(
      <ConversationScreen
        screen={baseScreen}
        currentScreenIndex={0}
        conversationHistory={[]}
        conversationSelections={{}}
        selectedOption={null}
        setSelectedOption={vi.fn()}
        onCheck={vi.fn()}
        onNext={vi.fn()}
        speakWord={speakWordMock}
        isSpeaking={false}
      />,
    );

    expect(isTTSMuted()).toBe(true);

    const muteBtn = screen.getByLabelText("Unmute conversation audio");
    act(() => {
      fireEvent.click(muteBtn);
    });

    expect(isTTSMuted()).toBe(false);
    expect(speakWordMock).toHaveBeenCalledWith("Hallo! Wie geht es dir?", {
      key: "current-0",
    });
    expect(
      screen.getByLabelText("Play conversation audio"),
    ).toBeInTheDocument();
  });

  it("clicking while currently speaking that key mutes globally", () => {
    render(
      <ConversationScreen
        screen={baseScreen}
        currentScreenIndex={0}
        conversationHistory={[]}
        conversationSelections={{}}
        selectedOption={null}
        setSelectedOption={vi.fn()}
        onCheck={vi.fn()}
        onNext={vi.fn()}
        speakWord={speakWordMock}
        isSpeaking={true}
        currentlySpeakingKey="current-0"
      />,
    );

    const speakingBtn = screen.getByLabelText("Mute conversation audio");
    act(() => {
      fireEvent.click(speakingBtn);
    });

    expect(isTTSMuted()).toBe(true);
    expect(
      screen.getByLabelText("Unmute conversation audio"),
    ).toBeInTheDocument();
  });

  it("clicking while idle replays the dialogue without changing mute state", () => {
    render(
      <ConversationScreen
        screen={baseScreen}
        currentScreenIndex={0}
        conversationHistory={[]}
        conversationSelections={{}}
        selectedOption={null}
        setSelectedOption={vi.fn()}
        onCheck={vi.fn()}
        onNext={vi.fn()}
        speakWord={speakWordMock}
        isSpeaking={false}
        currentlySpeakingKey={null}
      />,
    );

    speakWordMock.mockClear();

    const playBtn = screen.getByLabelText("Play conversation audio");
    act(() => {
      fireEvent.click(playBtn);
    });

    expect(isTTSMuted()).toBe(false);
    expect(speakWordMock).toHaveBeenCalledWith("Hallo! Wie geht es dir?", {
      key: "current-0",
    });
  });

  it("syncs icon in real time if global mute preference changes externally", () => {
    render(
      <ConversationScreen
        screen={baseScreen}
        currentScreenIndex={0}
        conversationHistory={[]}
        conversationSelections={{}}
        selectedOption={null}
        setSelectedOption={vi.fn()}
        onCheck={vi.fn()}
        onNext={vi.fn()}
        speakWord={speakWordMock}
        isSpeaking={false}
      />,
    );

    expect(
      screen.getByLabelText("Play conversation audio"),
    ).toBeInTheDocument();

    act(() => {
      setTTSMuted(true);
    });

    expect(
      screen.getByLabelText("Unmute conversation audio"),
    ).toBeInTheDocument();
  });
});
