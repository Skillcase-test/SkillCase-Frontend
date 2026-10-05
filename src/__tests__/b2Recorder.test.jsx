import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import useB2Recorder from "../hooks/useB2Recorder";

let tracks, getUserMedia, instances;
class FakeRecorder {
  static isTypeSupported(type) { return type === "audio/mp4"; }
  constructor(stream, options) {
    this.stream = stream;
    this.mimeType = options.mimeType;
    this.state = "inactive";
    instances.push(this);
  }
  start() { this.state = "recording"; }
  stop() {
    this.state = "inactive";
    // Browser dataavailable/stop events happen after stop() returns.
    Promise.resolve().then(() => {
      this.ondataavailable?.({ data: new Blob(["recorded audio"], { type: this.mimeType }) });
      this.onstop?.();
    });
  }
}
beforeEach(() => {
  vi.useFakeTimers();
  tracks = [];
  instances = [];
  getUserMedia = vi.fn(async () => {
    const track = { stop: vi.fn(), addEventListener: vi.fn() };
    tracks.push(track);
    return { getTracks: () => [track], getAudioTracks: () => [track] };
  });
  vi.stubGlobal("MediaRecorder", FakeRecorder);
  vi.stubGlobal("navigator", { mediaDevices: { getUserMedia } });
  vi.spyOn(URL, "createObjectURL").mockImplementation(() => `blob:recording-${Math.random()}`);
  vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers(); });

describe("B2 recording lifecycle", () => {
  it("uses a supported format, waits for the final chunk, and releases the microphone", async () => {
    const { result } = renderHook(() => useB2Recorder("one", 60));
    await act(() => result.current.start());
    await act(() => vi.advanceTimersByTimeAsync(1500));
    let clip;
    await act(async () => { clip = await result.current.stop(); });
    expect(clip.blob.size).toBeGreaterThan(0);
    expect(clip.filename).toBe("recording.m4a");
    expect(clip.duration).toBe(2);
    expect(result.current.status).toBe("idle");
    expect(tracks[0].stop).toHaveBeenCalled();
  });
  it("automatically stops at the prompt limit without a stale recording state", async () => {
    const { result } = renderHook(() => useB2Recorder("one", 2));
    await act(() => result.current.start());
    await act(() => vi.advanceTimersByTimeAsync(2000));
    expect(instances[0].state).toBe("inactive");
    expect(result.current.clip.duration).toBe(2);
    expect(tracks[0].stop).toHaveBeenCalledOnce();
  });
  it("keeps the previous answer if permission for a retake is denied", async () => {
    const { result } = renderHook(() => useB2Recorder("one"));
    await act(() => result.current.start());
    await act(() => result.current.stop());
    const original = result.current.clip;
    getUserMedia.mockRejectedValueOnce(new DOMException("Denied", "NotAllowedError"));
    await act(() => result.current.start());
    expect(result.current.clip).toBe(original);
    expect(result.current.error).toContain("site settings");
    expect(URL.revokeObjectURL).not.toHaveBeenCalled();
  });
  it("retains task recordings when navigating back and forth", async () => {
    const { result, rerender } = renderHook(({ task }) => useB2Recorder(task), { initialProps: { task: "one" } });
    await act(() => result.current.start());
    await act(() => result.current.stop());
    const original = result.current.clip;
    rerender({ task: "two" });
    expect(result.current.clip).toBeUndefined();
    rerender({ task: "one" });
    expect(result.current.clip).toBe(original);
    act(() => result.current.markUploaded("one", original));
    expect(result.current.hasUnsaved).toBe(false);
  });
  it("ignores rapid double taps and a late permission grant after cancellation", async () => {
    let resolve;
    getUserMedia.mockReturnValueOnce(new Promise((done) => { resolve = done; }));
    const { result } = renderHook(() => useB2Recorder("one"));
    let pending;
    act(() => { pending = result.current.start(); });
    await act(() => result.current.start());
    expect(getUserMedia).toHaveBeenCalledOnce();
    await act(() => result.current.stop());
    const track = { stop: vi.fn() };
    await act(async () => { resolve({ getTracks: () => [track] }); await pending; });
    expect(track.stop).toHaveBeenCalledOnce();
    expect(instances).toHaveLength(0);
    expect(result.current.status).toBe("idle");
  });
  it("releases tracks when the browser fails to start recording", async () => {
    vi.spyOn(FakeRecorder.prototype, "start").mockImplementation(() => { throw new Error("Device unavailable"); });
    const { result } = renderHook(() => useB2Recorder("one"));
    await act(() => result.current.start());
    expect(tracks[0].stop).toHaveBeenCalledOnce();
    expect(result.current.status).toBe("idle");
    expect(result.current.error).toContain("Couldn’t start");
  });
  it("releases an active microphone and every retained blob URL on unmount", async () => {
    const { result, unmount } = renderHook(() => useB2Recorder("one"));
    await act(() => result.current.start());
    await act(() => result.current.stop());
    const url = result.current.clip.url;
    await act(() => result.current.start());
    unmount();
    expect(tracks[1].stop).toHaveBeenCalledOnce();
    expect(instances[1].state).toBe("inactive");
    expect(URL.revokeObjectURL).toHaveBeenCalledWith(url);
  });
});
