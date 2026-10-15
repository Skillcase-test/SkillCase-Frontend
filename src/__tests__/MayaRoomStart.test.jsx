import { act, render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import MayaRoom from "../pages/maya/MayaRoom";
import { MayaLevel } from "../pages/maya/mayaLevel";

vi.mock("react-redux", () => ({ useSelector: (fn) => fn({ auth: { user: { user_prof_level: "b1", username: "Asha" } } }) }));
vi.mock("../hooks/useUsageLimits", () => ({ useUsageLimitModule: vi.fn(), useUsageLimits: () => ({ getState: () => null }) }));
vi.mock("../hooks/useLevelAccess", () => ({ default: () => () => true }));
vi.mock("../telemetry/events", () => ({ trackFeatureEvent: vi.fn() }));
const pushed = [];
vi.mock("../utils/mayaVoice", () => ({
  VoicePlayer: class {
    resume() { return Promise.resolve(); }
    push(d) { pushed.push(d); }
    interrupt() {}
    level() { return 0; }
    close() {}
  },
}));

class FakeSocket {
  static all = [];
  static OPEN = 1;
  static CONNECTING = 0;
  constructor(url) {
    this.url = url;
    this.readyState = 0;
    this.sent = [];
    FakeSocket.all.push(this);
  }
  send(s) { this.sent.push(JSON.parse(s)); }
  close() { this.readyState = 3; }
  open() { this.readyState = 1; this.onopen?.(); }
  emit(m) { return this.onmessage?.({ data: JSON.stringify(m) }); }
}

const flush = () => act(async () => { for (let i = 0; i < 10; i++) await Promise.resolve(); });

let resolveStart;
const api = { start: vi.fn(() => new Promise((r) => (resolveStart = r))) };
const ctxValue = { level: "B1", base: "/b1/maya", api, talkName: "Talk", talkCopy: "", interviewName: "Job interview", interviewCopy: "", interviewNoun: "interview" };
const meta = { level: "B1", coachName: "Maya", consented: true, firstName: "Asha", modes: ["talk"], minutes: { talk: 8 }, plan: {}, topics: [], words: [] };

const renderRoom = () =>
  render(
    <MemoryRouter>
      <MayaLevel.Provider value={ctxValue}>
        <MayaRoom meta={meta} focus={{ sessionId: "s0", index: 0, better: "Ich bin", why: "x" }} />
      </MayaLevel.Provider>
    </MemoryRouter>,
  );

beforeEach(() => {
  FakeSocket.all = [];
  pushed.length = 0;
  api.start.mockClear();
  vi.stubGlobal("WebSocket", FakeSocket);
  vi.stubGlobal("AudioContext", class {
    state = "running";
    audioWorklet = { addModule: () => Promise.resolve() };
    resume() { return Promise.resolve(); }
    createMediaStreamSource() { return { connect() {} }; }
    close() { return Promise.resolve(); }
  });
  vi.stubGlobal("AudioWorkletNode", class { port = {}; });
  URL.createObjectURL = () => "blob:x";
  URL.revokeObjectURL = () => {};
  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: { getUserMedia: () => Promise.resolve({ getTracks: () => [], getAudioTracks: () => [] }) },
  });
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("Maya call start", () => {
  it("dials the relay while /start is still running, then sends the ticket", async () => {
    renderRoom();
    await flush();
    expect(api.start).toHaveBeenCalledTimes(1);
    expect(FakeSocket.all).toHaveLength(1);
    const ws = FakeSocket.all[0];
    ws.open();
    expect(ws.sent).toEqual([]);

    resolveStart({ sessionId: "s1", ticket: "T", callSeconds: 480 });
    await flush();
    expect(FakeSocket.all).toHaveLength(1);
    expect(ws.sent).toEqual([{ type: "maya.auth", ticket: "T" }]);
  });

  it("sends the ticket on open when /start finishes first", async () => {
    renderRoom();
    await flush();
    resolveStart({ sessionId: "s1", ticket: "T" });
    await flush();
    const ws = FakeSocket.all[0];
    expect(ws.sent).toEqual([]);
    ws.open();
    expect(ws.sent).toEqual([{ type: "maya.auth", ticket: "T" }]);
  });

  it("dials again when /start was slow enough for the relay to drop the early socket", async () => {
    const now = vi.spyOn(Date, "now");
    now.mockReturnValue(1_000);
    renderRoom();
    await flush();
    FakeSocket.all[0].open();
    now.mockReturnValue(5_000);
    resolveStart({ sessionId: "s1", ticket: "T" });
    await flush();
    expect(FakeSocket.all).toHaveLength(2);
    expect(FakeSocket.all[0].sent).toEqual([]);
    FakeSocket.all[1].open();
    expect(FakeSocket.all[1].sent).toEqual([{ type: "maya.auth", ticket: "T" }]);
    now.mockRestore();
  });

  it("dials again when the early socket already closed", async () => {
    renderRoom();
    await flush();
    FakeSocket.all[0].readyState = 3;
    resolveStart({ sessionId: "s1", ticket: "T" });
    await flush();
    expect(FakeSocket.all).toHaveLength(2);
  });
});

describe("Maya barge-in", () => {
  const live = async () => {
    renderRoom();
    await flush();
    const ws = FakeSocket.all[0];
    ws.open();
    resolveStart({ sessionId: "s1", ticket: "T" });
    await flush();
    await act(async () => ws.emit({ type: "session.updated" }));
    return ws;
  };

  it("drops the late audio of a reply the learner talked over", async () => {
    const ws = await live();
    await act(async () => {
      await ws.emit({ type: "response.created", response: { id: "r1" } });
      await ws.emit({ type: "response.audio.delta", response_id: "r1", delta: "a" });
      await ws.emit({ type: "input_audio_buffer.speech_started" });
      await ws.emit({ type: "response.audio.delta", response_id: "r1", delta: "late" });
      await ws.emit({ type: "response.created", response: { id: "r2" } });
      await ws.emit({ type: "response.audio.delta", response_id: "r2", delta: "b" });
    });
    expect(pushed).toEqual(["a", "b"]);
  });

  it("keeps playing the reply in a noisy room, where the relay doesn't cut it", async () => {
    const ws = await live();
    await act(async () => {
      await ws.emit({ type: "room.noise", noisy: true });
      await ws.emit({ type: "response.created", response: { id: "r1" } });
      await ws.emit({ type: "input_audio_buffer.speech_started" });
      await ws.emit({ type: "response.audio.delta", response_id: "r1", delta: "rest" });
    });
    expect(pushed).toEqual(["rest"]);
  });
});
