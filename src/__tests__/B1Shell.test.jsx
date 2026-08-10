import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockNavigate = vi.fn();
let mockPathname = "/";
let mockUser = { user_prof_level: "B1" };

vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
  useLocation: () => ({ pathname: mockPathname }),
  Link: ({ to, onClick, children, className, title }) => (
    <a href={to} onClick={onClick} className={className} title={title}>
      {children}
    </a>
  ),
}));

vi.mock("react-redux", () => ({
  useSelector: (selector) => selector({ auth: { user: mockUser } }),
}));

const mockSetLGMode = vi.fn().mockResolvedValue({ data: {} });
const mockGetLGMode = vi
  .fn()
  .mockResolvedValue({ data: { mode: "practice" } });
const mockGetVocab = vi.fn().mockResolvedValue({ data: { progressRatio: 0.3 } });
vi.mock("../api/learnGermanApi", () => ({
  getLGMode: (...args) => mockGetLGMode(...args),
  setLGMode: (...args) => mockSetLGMode(...args),
  getVocabProgress: (...args) => mockGetVocab(...args),
}));

const mockGetStreak = vi.fn();
vi.mock("../api/streakApi", () => ({
  getStreakData: (...args) => mockGetStreak(...args),
}));

vi.mock("../observability/clarity", () => ({
  trackClarityEvent: vi.fn(),
}));

vi.mock("../utils/haptics", () => ({
  hapticLight: vi.fn(),
  hapticMedium: vi.fn(),
}));

const mockGetB1Ratio = vi.fn().mockResolvedValue(0.5);
vi.mock("../utils/b1Progress", async (importOriginal) => ({
  ...(await importOriginal()),
  getB1PracticeProgressRatio: (...args) => mockGetB1Ratio(...args),
}));

import TopModeSwitcher from "../components/TopModeSwitcher";
import BottomTabBar from "../components/BottomTabBar";

describe("B1/B2 shell — TopModeSwitcher", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPathname = "/";
    mockUser = { user_prof_level: "B1" };
    localStorage.clear();
  });

  it("renders only Exam & Practice + Jobs for a B1 user (no Guided German / German Classes tabs)", () => {
    render(<TopModeSwitcher />);

    // The two-line tab labels render as separate spans, so the accessible
    // text is "Exam &Practice" / "GuidedGerman" (no space) — match loosely.
    expect(
      screen.getByRole("tab", { name: /exam.*practice/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /jobs/i })).toBeInTheDocument();
    expect(
      screen.queryByRole("tab", { name: /guided.*german/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("tab", { name: /german.*classes/i }),
    ).not.toBeInTheDocument();
  });

  it("keeps the three-tab layout for non-B1 users", () => {
    mockUser = { user_prof_level: "A1" };
    render(<TopModeSwitcher />);

    expect(
      screen.getByRole("tab", { name: /exam.*practice/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("tab", { name: /guided.*german/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("tab", { name: /german.*classes/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("tab", { name: /jobs/i }),
    ).not.toBeInTheDocument();
  });

  it("tapping Jobs for a B1 user persists job_screening mode and navigates to the pipeline", () => {
    render(<TopModeSwitcher />);

    fireEvent.click(screen.getByRole("tab", { name: /jobs/i }));

    expect(mockSetLGMode).toHaveBeenCalledWith("job_screening");
    expect(localStorage.getItem("lg_preferred_mode")).toBe("job_screening");
    expect(mockNavigate).toHaveBeenCalledWith("/job-screening");
  });

  it("tapping Exam & Practice from the jobs screen returns to the practice home with practice mode", () => {
    mockPathname = "/job-screening";
    render(<TopModeSwitcher />);

    fireEvent.click(screen.getByRole("tab", { name: /exam.*practice/i }));

    expect(mockSetLGMode).toHaveBeenCalledWith("practice");
    expect(mockNavigate).toHaveBeenCalledWith("/");
  });
});

describe("B1/B2 shell — BottomTabBar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPathname = "/";
    mockUser = { user_prof_level: "B1" };
    localStorage.clear();
    mockGetB1Ratio.mockResolvedValue(0.5);
    mockGetStreak.mockResolvedValue({ currentStreak: 7 });
  });

  it("shows the B1 progress arch label for B1 users and uses the B1 progress API", async () => {
    render(<BottomTabBar />);

    expect(screen.getByText("progress")).toBeInTheDocument();
    expect(screen.getByText("Your B1")).toBeInTheDocument();
    expect(screen.queryByText("words learnt")).not.toBeInTheDocument();
    expect(screen.getByTitle("Your B1 progress")).toBeInTheDocument();
    await vi.waitFor(() => {
      expect(mockGetB1Ratio).toHaveBeenCalled();
    });
    expect(mockGetVocab).not.toHaveBeenCalled();
  });

  it("keeps the German words learnt label for non-B1 users", async () => {
    mockUser = { user_prof_level: "A1" };

    render(<BottomTabBar />);

    expect(screen.getByText("words learnt")).toBeInTheDocument();
    expect(screen.queryByText("progress")).not.toBeInTheDocument();
    expect(screen.getByTitle("German words learnt")).toBeInTheDocument();
    await vi.waitFor(() => {
      expect(mockGetVocab).toHaveBeenCalled();
    });
    expect(mockGetB1Ratio).not.toHaveBeenCalled();
  });

  it("persists job_screening mode when a B1 user taps the Jobs tab", () => {
    render(<BottomTabBar />);

    fireEvent.click(screen.getByText("Jobs"));

    expect(mockSetLGMode).toHaveBeenCalledWith("job_screening");
    expect(localStorage.getItem("lg_preferred_mode")).toBe("job_screening");
  });
});
