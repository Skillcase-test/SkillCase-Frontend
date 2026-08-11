import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockNavigate = vi.fn();
let mockPathname = "/jobs";
let mockUser = { user_prof_level: "A1" };

vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
  useLocation: () => ({ pathname: mockPathname }),
  Link: ({ to, onClick, children, className, title }) => (
    <a href={to} onClick={onClick} className={className} title={title}>
      {children}
    </a>
  ),
  Navigate: ({ to, replace }) => (
    <div data-testid="navigate-redirect" data-to={to} data-replace={String(!!replace)} />
  ),
}));

vi.mock("react-redux", () => ({
  useSelector: (selector) => selector({ auth: { user: mockUser } }),
}));

const mockSetLGMode = vi.fn().mockResolvedValue({ data: {} });
const mockGetLGMode = vi.fn().mockResolvedValue({ data: { mode: "practice" } });
const mockGetVocab = vi.fn().mockResolvedValue({ data: { progressRatio: 0.3 } });
vi.mock("../api/learnGermanApi", () => ({
  getLGMode: (...args) => mockGetLGMode(...args),
  setLGMode: (...args) => mockSetLGMode(...args),
  getVocabProgress: (...args) => mockGetVocab(...args),
}));

const mockGetStreak = vi.fn().mockResolvedValue({ currentStreak: 7 });
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

const mockGetA1Ratio = vi.fn().mockResolvedValue(0.4);
const mockGetA2Ratio = vi.fn().mockResolvedValue(0.6);
const mockGetVideoRatio = vi.fn().mockResolvedValue(0.25);
const mockGetJobRatio = vi.fn().mockResolvedValue(0.5);
vi.mock("../utils/a1a2Progress", () => ({
  getA1PracticeProgressRatio: (...args) => mockGetA1Ratio(...args),
  getA2PracticeProgressRatio: (...args) => mockGetA2Ratio(...args),
  getVideoCourseProgressRatio: (...args) => mockGetVideoRatio(...args),
  getJobStepsProgressRatio: (...args) => mockGetJobRatio(...args),
}));

import JobsLockedPage from "../pages/jobs/JobsLockedPage";
import BottomTabBar from "../components/BottomTabBar";

describe("JobsLockedPage — A1/A2 locked jobs teaser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPathname = "/jobs";
    mockUser = { user_prof_level: "A1" };
    // jsdom has a history of length 1; keep navigate(-1) fallback deterministic
    Object.defineProperty(window, "history", {
      value: { length: 1 },
      configurable: true,
    });
  });

  it("renders the gate card with the dynamic A1 level pill and hardcoded jobs", () => {
    render(<JobsLockedPage />);

    expect(screen.getByText("Jobs")).toBeInTheDocument();
    expect(
      screen.getByText("You are currently at A1 German level"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("You are not eligible for German jobs yet"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("B1 German level is the minimum requirement for German jobs."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("800+ jobs in Germany are waiting for you"),
    ).toBeInTheDocument();

    // Two hardcoded job cards with the locked CTA each
    expect(screen.getByText("ICU Staff Nurse")).toBeInTheDocument();
    expect(screen.getByText("Geriatric Nurse")).toBeInTheDocument();
    expect(screen.getByText("Munich, GER")).toBeInTheDocument();
    expect(screen.getByText("Berlin, GER")).toBeInTheDocument();
    expect(
      screen.getAllByText("Complete German B1 to Apply"),
    ).toHaveLength(2);
    expect(screen.getAllByText("Organization").length).toBeGreaterThanOrEqual(2);
  });

  it("shows the A2 level for an A2 user", () => {
    mockUser = { user_prof_level: "A2" };

    render(<JobsLockedPage />);

    expect(
      screen.getByText("You are currently at A2 German level"),
    ).toBeInTheDocument();
  });

  it("redirects B1/B2 users to the real job-screening pipeline", () => {
    mockUser = { user_prof_level: "B1" };

    render(<JobsLockedPage />);

    const redirect = screen.getByTestId("navigate-redirect");
    expect(redirect).toHaveAttribute("data-to", "/job-screening");
  });

  it("navigates home from the Okay button", () => {
    render(<JobsLockedPage />);

    fireEvent.click(screen.getByText("Okay"));
    expect(mockNavigate).toHaveBeenCalledWith("/");
  });

  it("navigates back from the header back arrow when history exists", () => {
    Object.defineProperty(window, "history", {
      value: { length: 3 },
      configurable: true,
    });

    render(<JobsLockedPage />);

    fireEvent.click(screen.getByTitle("Back"));
    expect(mockNavigate).toHaveBeenCalledWith(-1);
  });
});

describe("BottomTabBar — Jobs routing by level", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPathname = "/";
    mockUser = { user_prof_level: "A1" };
    localStorage.clear();
    mockGetStreak.mockResolvedValue({ currentStreak: 7 });
  });

  it("links the Jobs tab to /jobs for an A1 user", () => {
    mockUser = { user_prof_level: "A1" };

    render(<BottomTabBar />);

    const jobsLink = screen.getByText("Jobs").closest("a");
    expect(jobsLink).toHaveAttribute("href", "/jobs");
  });

  it("links the Jobs tab to /job-screening for a B1 user", () => {
    mockUser = { user_prof_level: "B1" };

    render(<BottomTabBar />);

    const jobsLink = screen.getByText("Jobs").closest("a");
    expect(jobsLink).toHaveAttribute("href", "/job-screening");
  });

  it("does not persist job_screening mode for an A1 user", () => {
    mockUser = { user_prof_level: "A1" };

    render(<BottomTabBar />);

    fireEvent.click(screen.getByText("Jobs"));
    expect(mockSetLGMode).not.toHaveBeenCalled();
    expect(localStorage.getItem("lg_preferred_mode")).toBeNull();
  });

  it("keeps the Jobs tab active on the /jobs route", () => {
    mockPathname = "/jobs";
    mockUser = { user_prof_level: "A1" };

    render(<BottomTabBar />);

    const jobsLink = screen.getByText("Jobs").closest("a");
    expect(jobsLink).toHaveAttribute("href", "/jobs");
    expect(jobsLink.className).toContain("bg-[#f4f4f6]");
  });
});
