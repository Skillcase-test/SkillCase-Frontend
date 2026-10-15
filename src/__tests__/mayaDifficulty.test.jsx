import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import MayaRoom from "../pages/maya/MayaRoom";
import { MayaLevel } from "../pages/maya/mayaLevel";

vi.mock("react-redux", () => ({ useSelector: (fn) => fn({ auth: { user: { user_prof_level: "a2", username: "Asha" } } }) }));
vi.mock("../hooks/useUsageLimits", () => ({ useUsageLimitModule: vi.fn(), useUsageLimits: () => ({ getState: () => null }) }));
vi.mock("../hooks/useLevelAccess", () => ({ default: () => () => true }));
vi.mock("../telemetry/events", () => ({ trackFeatureEvent: vi.fn() }));
vi.mock("../utils/mayaVoice", () => ({
  VoicePlayer: class {
    resume() { return Promise.resolve(); }
    close() {}
  },
}));

const api = { start: vi.fn(() => new Promise(() => {})) };
const topics = [{ id: "cafe", label: "At the café", icon: "coffee" }];

const renderRoom = (level, extra = {}) =>
  render(
    <MemoryRouter>
      <MayaLevel.Provider value={{ level, base: `/${level.toLowerCase()}/maya`, api, talkName: "Talk", talkCopy: "", anyTopic: "Surprise me" }}>
        <MayaRoom meta={{ level, coachName: "Maya", consented: true, firstName: "Asha", modes: ["talk"], minutes: { talk: 10 }, plan: null, topics, words: [], ...extra }} />
      </MayaLevel.Provider>
    </MemoryRouter>,
  );

const startCall = async () => {
  fireEvent.click(screen.getByText("Start with Maya"));
  await act(async () => { for (let i = 0; i < 10; i++) await Promise.resolve(); });
};

beforeEach(() => {
  api.start.mockClear();
  vi.stubGlobal("WebSocket", class { send() {} close() {} });
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
  Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: { getUserMedia: () => Promise.resolve({ getTracks: () => [], getAudioTracks: () => [] }) } });
});

describe("A2 difficulty", () => {
  it("preselects last time's pick and sends the new one with the topic", async () => {
    renderRoom("A2", { difficulty: "hard" });
    fireEvent.click(screen.getByText(/Let.s practise/));
    expect(screen.getByRole("radio", { name: "Hard" })).toHaveAttribute("aria-checked", "true");
    fireEvent.click(screen.getByRole("radio", { name: "Easy" }));
    expect(screen.getByText(/lots of help/)).toBeInTheDocument();
    fireEvent.click(screen.getByText("At the café"));
    await startCall();
    expect(api.start).toHaveBeenCalledWith({ consent: true, mode: "talk", topic: "At the café", difficulty: "easy" });
  });

  it("starts at medium the first time, also when Maya picks the topic", async () => {
    renderRoom("A2");
    fireEvent.click(screen.getByText(/Let.s practise/));
    await startCall();
    expect(api.start).toHaveBeenCalledWith({ consent: true, mode: "talk", difficulty: "medium" });
  });

  it("other levels have no picker and send no difficulty", async () => {
    renderRoom("B1");
    fireEvent.click(screen.getByText(/Let.s practise/));
    expect(screen.queryByRole("radiogroup", { name: "How challenging?" })).not.toBeInTheDocument();
    await startCall();
    expect(api.start).toHaveBeenCalledWith({ consent: true, mode: "talk" });
  });
});
