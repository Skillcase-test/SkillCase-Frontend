import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockNavigate = vi.fn();
let mockPathname = "/";
let mockUser = { user_prof_level: "B1" };

vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
  useLocation: () => ({ pathname: mockPathname }),
  Navigate: ({ to }) => <span>redirect:{to}</span>,
  Link: ({ to, onClick, children, className, title }) => (
    <a href={to} onClick={onClick} className={className} title={title}>
      {children}
    </a>
  ),
}));

vi.mock("react-redux", () => ({
  useDispatch: () => vi.fn(),
  useSelector: (selector) =>
    selector({ auth: { user: mockUser, isAuthenticated: true } }),
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

let mockFlags = {};
vi.mock("../hooks/useFeatureFlags", () => ({
  useFeatureFlags: () => ({
    flags: mockFlags,
    loading: false,
    isFeatureEnabled: (key) => Boolean(mockFlags[key]),
    refreshFlags: vi.fn(),
  }),
}));

vi.mock("../observability/journeyEvents", () => ({
  trackJourneyEvent: vi.fn(),
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

import TopModeSwitcher from "../components/TopModeSwitcher";
import BottomTabBar from "../components/BottomTabBar";
import GermanJobsGate from "../router/GermanJobsGate";

const jobsLink = () => screen.queryByRole("link", { name: /jobs/i });

describe("German Jobs for the Other profession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPathname = "/";
    mockFlags = { german_classes: true };
    mockGetStreak.mockResolvedValue({ currentStreak: 0 });
    localStorage.clear();
  });

  it("a restricted B1 learner sees Job Preparation and Classes but no German Jobs", () => {
    mockUser = { user_prof_level: "B1", german_jobs_restricted: true };
    render(<TopModeSwitcher />);
    expect(screen.getByRole("tab", { name: /job preparation/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /german.*classes/i })).toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: /german jobs/i })).not.toBeInTheDocument();
  });

  it("the bottom bar drops Jobs for a restricted B1 learner", () => {
    mockUser = { user_prof_level: "B1", german_jobs_restricted: true };
    render(<BottomTabBar />);
    expect(jobsLink()).not.toBeInTheDocument();
  });

  it("an admin turning on german_jobs_others brings German Jobs back", () => {
    mockUser = { user_prof_level: "B1", german_jobs_restricted: true };
    mockFlags = { german_classes: true, german_jobs_others: true };
    render(<TopModeSwitcher />);
    expect(screen.getByRole("tab", { name: /german jobs/i })).toBeInTheDocument();
  });

  it("A1/A2 Other learners keep the locked jobs teaser", () => {
    mockUser = { user_prof_level: "A2", german_jobs_restricted: true };
    render(<BottomTabBar />);
    expect(jobsLink()).toHaveAttribute("href", "/jobs");
  });

  it("everyone else is untouched", () => {
    mockUser = { user_prof_level: "B1" };
    render(<BottomTabBar />);
    expect(jobsLink()).toHaveAttribute("href", "/job-screening");
  });

  it("job screening pages send a hidden learner home", () => {
    mockUser = { user_prof_level: "B1", german_jobs_restricted: true };
    const { rerender } = render(<GermanJobsGate><p>pipeline</p></GermanJobsGate>);
    expect(screen.getByText("redirect:/")).toBeInTheDocument();
    mockFlags = { german_jobs_others: true };
    rerender(<GermanJobsGate><p>pipeline</p></GermanJobsGate>);
    expect(screen.getByText("pipeline")).toBeInTheDocument();
  });
});
