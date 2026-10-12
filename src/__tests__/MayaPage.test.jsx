import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import MayaPage from "../pages/maya/MayaPage";

const mockGet = vi.fn();
vi.mock("../api/axios", () => ({ default: { get: (...a) => mockGet(...a), post: vi.fn() } }));
vi.mock("react-redux", () => ({ useSelector: (fn) => fn({ auth: { user: { user_prof_level: "b1" } } }) }));
const mockLimitModule = vi.fn();
vi.mock("../hooks/useUsageLimits", () => ({
  useUsageLimitModule: (...a) => mockLimitModule(...a),
  useUsageLimits: () => ({ getState: () => null }),
}));
vi.mock("../telemetry/events", () => ({ trackFeatureEvent: vi.fn() }));

const meta = (level, modes, minutes) => ({
  level,
  coachName: "Maya",
  consented: true,
  firstName: "Asha",
  modes,
  minutes,
  plan: { tier: "standard", dailyMinutes: 10, remainingSeconds: 600, window: "day" },
  topics: [],
  words: [],
});

const renderAt = (level) =>
  render(
    <MemoryRouter>
      <MayaPage level={level} />
    </MemoryRouter>,
  );

describe("MayaPage per level", () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockLimitModule.mockReset();
  });

  it("B1 loads from the B1 API and offers the job interview", async () => {
    mockGet.mockResolvedValue({ data: meta("B1", ["talk", "coach"], { talk: 8, coach: 10 }) });
    renderAt("B1");

    expect(await screen.findByText("Job interview")).toBeInTheDocument();
    expect(mockGet).toHaveBeenCalledWith("/maya/b1/meta");
    expect(mockLimitModule).toHaveBeenCalledWith("B1", "maya");
    expect(screen.getByText("B1 German")).toBeInTheDocument();
    expect(screen.getByText(/Tips now and then/)).toBeInTheDocument();
    expect(screen.getByText("My progress").closest("a")).toHaveAttribute("href", "/b1/maya?view=progress");
  });

  it("B2 keeps its API, nursing interview and links", async () => {
    mockGet.mockResolvedValue({ data: meta("B2", ["talk", "exam"], { talk: 10, exam: 10 }) });
    renderAt("B2");

    expect(await screen.findByText("Nursing interview")).toBeInTheDocument();
    expect(mockGet).toHaveBeenCalledWith("/b2-maya/meta");
    expect(mockLimitModule).toHaveBeenCalledWith("B2", "maya");
    expect(screen.getByText(/Feedback after/)).toBeInTheDocument();
    expect(screen.getByText("My progress").closest("a")).toHaveAttribute("href", "/b2/maya?view=progress");
  });
});
