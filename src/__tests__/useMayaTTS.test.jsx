import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import api from "../api/axios";
import useMayaTTS, {
  resetLastPlayedDialogue,
} from "../pages/learnGerman/lesson/screens/shared/useMayaTTS";
import {
  setTTSMuted,
} from "../pages/learnGerman/lesson/screens/shared/ttsMutePreference";

describe("useMayaTTS hook", () => {
  let playSpy;
  let pauseSpy;
  let audioInstances;

  beforeEach(() => {
    localStorage.clear();
    resetLastPlayedDialogue();
    setTTSMuted(false);
    audioInstances = [];

    // Mock HTML5 Audio
    playSpy = vi.fn().mockImplementation(function () {
      return Promise.resolve();
    });
    pauseSpy = vi.fn();

    vi.stubGlobal(
      "Audio",
      vi.fn().mockImplementation(function (src) {
        const inst = {
          src,
          play: playSpy,
          pause: pauseSpy,
          onended: null,
          onerror: null,
        };
        audioInstances.push(inst);
        return inst;
      }),
    );

    // Mock URL.createObjectURL and URL.revokeObjectURL
    vi.stubGlobal("URL", {
      createObjectURL: vi.fn(() => "blob:mock-audio-url"),
      revokeObjectURL: vi.fn(),
    });

    // Mock API post for Maya TTS
    vi.spyOn(api, "post").mockResolvedValue({
      data: new Blob(["dummy audio"], { type: "audio/mpeg" }),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("auto-speaks text when not muted", async () => {
    const { result } = renderHook(() => useMayaTTS());

    await act(async () => {
      await result.current.speak("Hello there!");
    });

    expect(api.post).toHaveBeenCalledWith(
      "/dynamic-lesson/maya-tts",
      { text: "Hello there!" },
      expect.anything(),
    );
    expect(playSpy).toHaveBeenCalledTimes(1);
    expect(result.current.isSpeaking).toBe(true);
  });

  it("does not speak when muted", async () => {
    setTTSMuted(true);
    const { result } = renderHook(() => useMayaTTS());

    await act(async () => {
      await result.current.speak("Hello there!");
    });

    expect(api.post).not.toHaveBeenCalled();
    expect(playSpy).not.toHaveBeenCalled();
    expect(result.current.isSpeaking).toBe(false);
  });

  it("suppresses consecutive duplicate text on subsequent speak calls", async () => {
    const { result } = renderHook(() => useMayaTTS());

    await act(async () => {
      await result.current.speak("Repeat message");
    });
    expect(playSpy).toHaveBeenCalledTimes(1);

    // Immediate next call with same text
    await act(async () => {
      await result.current.speak("Repeat message");
    });
    // Should NOT have played a second time
    expect(playSpy).toHaveBeenCalledTimes(1);
  });

  it("allows duplicate text when forced or skipSuppression is true", async () => {
    const { result } = renderHook(() => useMayaTTS());

    await act(async () => {
      await result.current.speak("Repeat message");
    });
    expect(playSpy).toHaveBeenCalledTimes(1);

    await act(async () => {
      await result.current.speak("Repeat message", { force: true });
    });
    expect(playSpy).toHaveBeenCalledTimes(2);

    await act(async () => {
      await result.current.speak("Repeat message", { skipSuppression: true });
    });
    expect(playSpy).toHaveBeenCalledTimes(3);
  });

  it("resets suppression memory via resetLastPlayedDialogue", async () => {
    const { result } = renderHook(() => useMayaTTS());

    await act(async () => {
      await result.current.speak("Topic Intro");
    });
    expect(playSpy).toHaveBeenCalledTimes(1);

    resetLastPlayedDialogue();

    await act(async () => {
      await result.current.speak("Topic Intro");
    });
    expect(playSpy).toHaveBeenCalledTimes(2);
  });

  it("un-muting via toggleMute immediately plays current text", async () => {
    setTTSMuted(true);
    const { result } = renderHook(() => useMayaTTS());
    expect(result.current.isMuted).toBe(true);

    await act(async () => {
      result.current.toggleMute("Play me upon unmuting");
    });

    expect(result.current.isMuted).toBe(false);
    expect(playSpy).toHaveBeenCalledTimes(1);
  });

  it("stops Maya audio on window event mayaTTSStop", async () => {
    const { result } = renderHook(() => useMayaTTS());

    await act(async () => {
      await result.current.speak("Playing sound");
    });
    expect(result.current.isSpeaking).toBe(true);

    act(() => {
      window.dispatchEvent(new Event("mayaTTSStop"));
    });

    expect(pauseSpy).toHaveBeenCalled();
    expect(result.current.isSpeaking).toBe(false);
  });

  it("dispatches germanTTSStop when Maya starts speaking", async () => {
    const germanStopListener = vi.fn();
    window.addEventListener("germanTTSStop", germanStopListener);

    const { result } = renderHook(() => useMayaTTS());

    await act(async () => {
      await result.current.speak("Hello Maya");
    });

    expect(germanStopListener).toHaveBeenCalled();
    window.removeEventListener("germanTTSStop", germanStopListener);
  });
});
