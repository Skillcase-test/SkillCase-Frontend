import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import MayaDialogueBubble from "../pages/learnGerman/lesson/screens/shared/MayaDialogueBubble";
import api from "../api/axios";
import {
  setTTSMuted,
} from "../pages/learnGerman/lesson/screens/shared/ttsMutePreference";
import { resetLastPlayedDialogue } from "../pages/learnGerman/lesson/screens/shared/useMayaTTS";

describe("MayaDialogueBubble component", () => {
  let playSpy;
  let audioInstance;

  beforeEach(() => {
    localStorage.clear();
    resetLastPlayedDialogue();
    setTTSMuted(false);

    playSpy = vi.fn().mockResolvedValue();
    vi.stubGlobal(
      "Audio",
      vi.fn().mockImplementation(function (src) {
        audioInstance = {
          src,
          play: playSpy,
          pause: vi.fn(),
          onended: null,
          onerror: null,
        };
        return audioInstance;
      }),
    );

    vi.stubGlobal("URL", {
      createObjectURL: vi.fn(() => "blob:mock-url"),
      revokeObjectURL: vi.fn(),
    });

    vi.spyOn(api, "post").mockResolvedValue({
      data: new Blob(["dummy audio"], { type: "audio/mpeg" }),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders text and auto-speaks when unmuted", async () => {
    await act(async () => {
      render(<MayaDialogueBubble text="Welcome to the lesson" />);
    });

    expect(playSpy).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText("Mute Maya")).toBeInTheDocument();

    // When audio finishes
    act(() => {
      audioInstance.onended?.();
    });

    expect(screen.getByLabelText("Play Maya Audio")).toBeInTheDocument();
  });

  it("displays VolumeX when initially muted and does not auto-play", async () => {
    setTTSMuted(true);

    await act(async () => {
      render(<MayaDialogueBubble text="Muted dialogue" />);
    });

    expect(playSpy).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Unmute Maya")).toBeInTheDocument();
  });

  it("clicking mute button un-mutes and immediately speaks text", async () => {
    setTTSMuted(true);

    await act(async () => {
      render(<MayaDialogueBubble text="Speak on click" />);
    });

    expect(playSpy).not.toHaveBeenCalled();

    const muteBtn = screen.getByLabelText("Unmute Maya");
    await act(async () => {
      fireEvent.click(muteBtn);
    });

    expect(playSpy).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText("Mute Maya")).toBeInTheDocument();
  });

  it("clicking audio button while idle forces manual replay even if duplicate", async () => {
    await act(async () => {
      render(<MayaDialogueBubble text="Play twice" />);
    });

    expect(playSpy).toHaveBeenCalledTimes(1);

    // Complete first playback so it becomes idle
    act(() => {
      audioInstance.onended?.();
    });

    const playBtn = screen.getByLabelText("Play Maya Audio");
    await act(async () => {
      fireEvent.click(playBtn);
    });

    expect(playSpy).toHaveBeenCalledTimes(2);
  });
});
