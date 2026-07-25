import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import useInterviewRecorder from "../pages/interviewTools/shared/useInterviewRecorder";

let createdContexts;

// Reproduces the browser behaviour behind the production bug: a context
// constructed outside a user gesture starts suspended, and a suspended
// analyser only ever reports silence.
function makeAudioContextClass({
  initialState = "running",
  resumesTo = "running",
  peak = 0.5,
  throwOnConstruct = false,
} = {}) {
  return class FakeAudioContext {
    constructor() {
      if (throwOnConstruct) throw new Error("AudioContext unavailable");
      this.state = initialState;
      this.resumeCalls = 0;
      createdContexts.push(this);
    }
    async resume() {
      this.resumeCalls += 1;
      this.state = resumesTo;
    }
    async close() {
      this.state = "closed";
    }
    createMediaStreamSource() {
      return { connect: vi.fn(), disconnect: vi.fn() };
    }
    createAnalyser() {
      return {
        fftSize: 2048,
        smoothingTimeConstant: 0.8,
        connect: vi.fn(),
        disconnect: vi.fn(),
        getByteTimeDomainData: (arr) => {
          arr.fill(128);
          // A suspended context would never produce this excursion.
          if (this.state === "running") {
            arr[0] = 128 + Math.round(peak * 127);
          }
        },
      };
    }
  };
}

function makeStream({ live = true, enabled = true, muted = false } = {}) {
  const track = {
    kind: "audio",
    readyState: live ? "live" : "ended",
    enabled,
    muted,
    stop: vi.fn(),
  };
  return {
    getAudioTracks: () => [track],
    getVideoTracks: () => [],
    getTracks: () => [track],
    track,
  };
}

class FakeMediaRecorder {
  static isTypeSupported() {
    return true;
  }
  constructor(stream) {
    this.stream = stream;
    this.state = "inactive";
    this.mimeType = "video/webm";
  }
  start() {
    this.state = "recording";
  }
  stop() {
    this.state = "inactive";
    this.onstop?.();
  }
}

beforeEach(() => {
  createdContexts = [];
  vi.stubGlobal("MediaRecorder", FakeMediaRecorder);
  vi.stubGlobal("AudioContext", makeAudioContextClass());
  window.webkitAudioContext = undefined;
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function mockUserMedia(stream) {
  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    writable: true,
    value: { getUserMedia: vi.fn().mockResolvedValue(stream) },
  });
}

async function startRecordingWith(hook) {
  await act(async () => {
    await hook.result.current.startRecording();
  });
}

describe("useInterviewRecorder audio monitor", () => {
  test("resumes a suspended AudioContext so a real mic is not read as silent", async () => {
    mockUserMedia(makeStream());
    vi.stubGlobal(
      "AudioContext",
      makeAudioContextClass({ initialState: "suspended", resumesTo: "running" }),
    );

    const hook = renderHook(() => useInterviewRecorder());
    await startRecordingWith(hook);

    expect(createdContexts[0].resumeCalls).toBe(1);
    expect(createdContexts[0].state).toBe("running");

    // Sampling runs on a timer; give it a couple of ticks.
    await waitFor(() =>
      expect(hook.result.current.getAudioSignalState().detected).toBe(true),
    );
    expect(hook.result.current.getAudioSignalState().reliable).toBe(true);
  });

  test("reports the monitor unreliable when the context stays suspended", async () => {
    mockUserMedia(makeStream());
    vi.stubGlobal(
      "AudioContext",
      makeAudioContextClass({
        initialState: "suspended",
        resumesTo: "suspended",
      }),
    );

    const hook = renderHook(() => useInterviewRecorder());
    await startRecordingWith(hook);

    const state = hook.result.current.getAudioSignalState();
    // Crucially reliable:false — callers must not read this as "no voice".
    expect(state.reliable).toBe(false);
    expect(state.detected).toBe(false);
  });

  test("still records when AudioContext is unavailable entirely", async () => {
    mockUserMedia(makeStream());
    vi.stubGlobal(
      "AudioContext",
      makeAudioContextClass({ throwOnConstruct: true }),
    );

    const hook = renderHook(() => useInterviewRecorder());
    await startRecordingWith(hook);

    // Monitoring is best-effort; recording must not be blocked by its failure.
    expect(hook.result.current.isRecording).toBe(true);
    expect(hook.result.current.getAudioSignalState().reliable).toBe(false);
  });

  test("detects real audio and keeps the verdict readable after stopping", async () => {
    mockUserMedia(makeStream());

    const hook = renderHook(() => useInterviewRecorder());
    await startRecordingWith(hook);

    await waitFor(() =>
      expect(hook.result.current.getAudioSignalState().detected).toBe(true),
    );

    await act(async () => {
      await hook.result.current.stopRecording();
    });

    // The submit path reads this after the recorder has stopped.
    expect(hook.result.current.getAudioSignalState()).toEqual({
      detected: true,
      reliable: true,
    });
  });

  test("reports silence as measurable silence when the monitor works", async () => {
    mockUserMedia(makeStream());
    vi.stubGlobal("AudioContext", makeAudioContextClass({ peak: 0 }));

    const hook = renderHook(() => useInterviewRecorder());
    await startRecordingWith(hook);
    await new Promise((resolve) => setTimeout(resolve, 300));

    expect(hook.result.current.getAudioSignalState()).toEqual({
      detected: false,
      reliable: true,
    });
  });
});

describe("useInterviewRecorder track gating", () => {
  // iOS reports muted for a moment after getUserMedia and during interruptions
  // such as an incoming call. Gating on it rejected working microphones.
  test("accepts a live track that is transiently muted", async () => {
    mockUserMedia(makeStream({ muted: true }));

    const hook = renderHook(() => useInterviewRecorder());
    await act(async () => {
      await hook.result.current.requestStream();
    });

    expect(hook.result.current.stream).not.toBeNull();
    await startRecordingWith(hook);
    expect(hook.result.current.isRecording).toBe(true);
  });

  test("still rejects a stream with no live audio track", async () => {
    mockUserMedia(makeStream({ live: false }));

    const hook = renderHook(() => useInterviewRecorder());
    await expect(
      act(async () => {
        await hook.result.current.requestStream();
      }),
    ).rejects.toThrow();
  });

  test("resetRecording clears the previous answer's audio verdict", async () => {
    mockUserMedia(makeStream());

    const hook = renderHook(() => useInterviewRecorder());
    await startRecordingWith(hook);
    await waitFor(() =>
      expect(hook.result.current.getAudioSignalState().detected).toBe(true),
    );

    act(() => {
      hook.result.current.resetRecording();
    });

    expect(hook.result.current.getAudioSignalState()).toEqual({
      detected: false,
      reliable: false,
    });
  });
});
