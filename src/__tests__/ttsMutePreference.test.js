import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  isTTSMuted,
  setTTSMuted,
  subscribeTTSMute,
  TTS_MUTE_CHANGE_EVENT,
} from "../pages/learnGerman/lesson/screens/shared/ttsMutePreference";

describe("ttsMutePreference", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("defaults to unmuted (false) when localStorage is empty", () => {
    expect(isTTSMuted()).toBe(false);
  });

  it("sets and reads muted state from localStorage", () => {
    setTTSMuted(true);
    expect(isTTSMuted()).toBe(true);

    setTTSMuted(false);
    expect(isTTSMuted()).toBe(false);
  });

  it("dispatches custom event on setTTSMuted", () => {
    const listener = vi.fn();
    window.addEventListener(TTS_MUTE_CHANGE_EVENT, listener);

    setTTSMuted(true);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0][0].detail).toEqual({ isMuted: true });

    setTTSMuted(false);
    expect(listener).toHaveBeenCalledTimes(2);
    expect(listener.mock.calls[1][0].detail).toEqual({ isMuted: false });

    window.removeEventListener(TTS_MUTE_CHANGE_EVENT, listener);
  });

  it("subscribeTTSMute receives updates and unbinds cleanly", () => {
    const callback = vi.fn();
    const unsubscribe = subscribeTTSMute(callback);

    setTTSMuted(true);
    expect(callback).toHaveBeenCalledWith(true);

    setTTSMuted(false);
    expect(callback).toHaveBeenCalledWith(false);

    unsubscribe();
    setTTSMuted(true);
    expect(callback).toHaveBeenCalledTimes(2); // no further calls after unsubscribe
  });
});
