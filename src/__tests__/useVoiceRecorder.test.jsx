import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const post = vi.fn();
vi.mock("../api/axios", () => ({ default: { post: (...a) => post(...a) } }));

let useVoiceRecorder;
let contexts;
let unhandled;

// A stand-in for AudioContext that reproduces the behaviour that caused the
// production incident: close() rejects with InvalidStateError once the context
// is already closed.
class FakeAudioContext {
  constructor() {
    this.state = "running";
    this.sampleRate = 48000;
    this.destination = {};
    this.closeCalls = 0;
    contexts.push(this);
  }
  createMediaStreamSource() {
    return { connect: () => {} };
  }
  createScriptProcessor() {
    return { connect: () => {}, disconnect: () => {}, onaudioprocess: null };
  }
  close() {
    this.closeCalls += 1;
    if (this.state === "closed") {
      return Promise.reject(
        new DOMException("Cannot close a closed AudioContext.", "InvalidStateError"),
      );
    }
    this.state = "closed";
    return Promise.resolve();
  }
}

describe("useVoiceRecorder teardown", () => {
  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    contexts = [];
    unhandled = [];
    post.mockResolvedValue({ data: { assessment: {} } });

    window.AudioContext = FakeAudioContext;
    navigator.mediaDevices = {
      getUserMedia: vi.fn().mockResolvedValue({ getTracks: () => [{ stop: vi.fn() }] }),
    };
    const track = (event) => {
      event.preventDefault?.();
      unhandled.push(event.reason);
    };
    window.addEventListener("unhandledrejection", track);
    // eslint-disable-next-line no-undef
    useVoiceRecorder = (await import("../pages/a2/speaking/hooks/useVoiceRecorder")).default;
    return () => window.removeEventListener("unhandledrejection", track);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("does not close an AudioContext twice when stop is called repeatedly", async () => {
    const { result } = renderHook(() => useVoiceRecorder("hallo"));

    await act(async () => {
      await result.current.startRecording();
    });
    expect(contexts).toHaveLength(1);

    // The production trigger: a leaked interval firing stopRecording again and
    // again after the first stop had already torn everything down.
    await act(async () => {
      await result.current.stopRecording();
      await result.current.stopRecording();
      await result.current.stopRecording();
    });

    expect(contexts[0].closeCalls).toBe(1);
    expect(contexts[0].state).toBe("closed");
  });

  it("uploads the recording exactly once no matter how often stop fires", async () => {
    const { result } = renderHook(() => useVoiceRecorder("hallo"));

    await act(async () => {
      await result.current.startRecording();
    });
    await act(async () => {
      await result.current.stopRecording();
      await result.current.stopRecording();
      await result.current.stopRecording();
      await result.current.stopRecording();
    });

    // Each duplicate stop used to re-encode the same buffer and post it again,
    // multiplying calls to the paid assessment endpoint.
    await waitFor(() => expect(post).toHaveBeenCalledTimes(1));
  });

  it("raises no unhandled rejection on a duplicate stop", async () => {
    const { result } = renderHook(() => useVoiceRecorder("hallo"));

    await act(async () => {
      await result.current.startRecording();
    });
    await act(async () => {
      await result.current.stopRecording();
      await result.current.stopRecording();
    });
    await new Promise((resolve) => setTimeout(resolve, 0));

    // The InvalidStateError previously escaped as an unhandled rejection, which
    // telemetry reported as a fatal, unhandled, blocking error.
    expect(unhandled).toHaveLength(0);
  });

  it("does not leak the auto-stop interval across takes", async () => {
    vi.useFakeTimers();
    const setSpy = vi.spyOn(globalThis, "setInterval");
    const clearSpy = vi.spyOn(globalThis, "clearInterval");
    const { result } = renderHook(() => useVoiceRecorder("hallo"));

    await act(async () => {
      await result.current.startRecording();
    });
    // Starting again without an intervening stop must retire the first timer,
    // otherwise it keeps firing its auto-stop callback for the whole session.
    await act(async () => {
      await result.current.startRecording();
    });

    expect(setSpy).toHaveBeenCalledTimes(2);
    expect(clearSpy).toHaveBeenCalled();
  });

  it("leaves every ref empty after reset so a stale stop is a no-op", async () => {
    const { result } = renderHook(() => useVoiceRecorder("hallo"));

    await act(async () => {
      await result.current.startRecording();
    });
    act(() => {
      result.current.resetRecording();
    });
    await act(async () => {
      await result.current.stopRecording();
    });

    expect(contexts[0].closeCalls).toBe(1);
    expect(post).not.toHaveBeenCalled();
  });
});
