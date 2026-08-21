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

vi.mock("../hooks/useFeatureFlags", () => ({
  useFeatureFlags: () => ({
    flags: { german_classes: true },
    loading: false,
    isFeatureEnabled: (key) => key === "german_classes",
    refreshFlags: vi.fn(),
  }),
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
import NewNavbar from "../components/NewNavbar";

describe("B1/B2 shell — TopModeSwitcher", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPathname = "/";
    mockUser = { user_prof_level: "B1" };
    localStorage.clear();
  });

  it("renders only Job Preparation + German Jobs for a B1 user (no Guided German / German Classes tabs)", () => {
    render(<TopModeSwitcher />);

    // B1/B2 tabs: "Job Preparation" (practice hub) + "German Jobs" (pipeline)
    expect(
      screen.getByRole("tab", { name: /job preparation/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("tab", { name: /german jobs/i }),
    ).toBeInTheDocument();
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
      screen.getByRole("tab", { name: /german.*practice/i }),
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

  it("tapping German Jobs for a B1 user persists job_screening mode and navigates to the pipeline", () => {
    render(<TopModeSwitcher />);

    fireEvent.click(screen.getByRole("tab", { name: /german jobs/i }));

    expect(mockSetLGMode).toHaveBeenCalledWith("job_screening");
    expect(localStorage.getItem("lg_preferred_mode")).toBe("job_screening");
    expect(mockNavigate).toHaveBeenCalledWith("/job-screening");
  });

  it("tapping Job Preparation from the jobs screen returns to the practice home with practice mode", () => {
    mockPathname = "/job-screening";
    render(<TopModeSwitcher />);

    fireEvent.click(screen.getByRole("tab", { name: /job preparation/i }));

    expect(mockSetLGMode).toHaveBeenCalledWith("practice");
    expect(mockNavigate).toHaveBeenCalledWith("/");
  });

  it("marks the German Jobs tab active while inside the job-screening pipeline", () => {
    mockPathname = "/job-screening";
    render(<TopModeSwitcher />);

    expect(screen.getByRole("tab", { name: /german jobs/i })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(
      screen.getByRole("tab", { name: /job preparation/i }),
    ).toHaveAttribute("aria-selected", "false");
  });

  // The blend fill moved onto the seamless rail path, which only paints once
  // the switcher has measured itself — jsdom reports every rect as 0x0.
  const stubRects = () =>
    vi.spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue({
      width: 360,
      height: 60,
      left: 0,
      right: 360,
      top: 0,
      bottom: 60,
    });

  it("fills the active tab with the sky-blue page-top color on /job-screening so it blends", () => {
    mockPathname = "/job-screening";
    const rects = stubRects();
    const { container } = render(<TopModeSwitcher />);

    // Lobby top is from-[#e0f2fe] → the active German Jobs tab melts into it
    expect(container.querySelector("svg path")).toHaveAttribute(
      "fill",
      "#e0f2fe",
    );
    rects.mockRestore();
  });

  it("keeps the active tab white on the white practice hub", () => {
    mockPathname = "/";
    const rects = stubRects();
    const { container } = render(<TopModeSwitcher />);

    expect(container.querySelector("svg path")).toHaveAttribute(
      "fill",
      "#ffffff",
    );
    rects.mockRestore();
  });
});

describe("B1/B2 shell — NewNavbar chrome", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPathname = "/job-screening";
    mockUser = { user_prof_level: "B1" };
    localStorage.clear();
  });

  it("keeps the navy mode-switcher shell for B1 users inside the pipeline (no white JobScreeningNavbar)", () => {
    render(<NewNavbar />);

    // Navy shell: level title + Free Plan pill present
    expect(screen.getByText("B1 German Level")).toBeInTheDocument();
    expect(screen.getByText("Free Plan")).toBeInTheDocument();
    // The white job-screening navbar (Skillcase logo) must NOT be rendered
    expect(screen.queryByAltText("Skillcase")).not.toBeInTheDocument();
  });

  it("keeps the white JobScreeningNavbar for legacy non-B1 screening candidates", () => {
    mockUser = { user_prof_level: "A1", german_preference: "3" };

    render(<NewNavbar />);

    expect(screen.getByAltText("Skillcase")).toBeInTheDocument();
    expect(screen.queryByText("B1 German Level")).not.toBeInTheDocument();
  });

  it("keeps the navy shell for B1 users on the practice hub too", () => {
    mockPathname = "/";
    mockUser = { user_prof_level: "B2" };

    render(<NewNavbar />);

    expect(screen.getByText("B1 German Level")).toBeInTheDocument();
    expect(screen.queryByAltText("Skillcase")).not.toBeInTheDocument();
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

  it("shows the German words learnt ring on the Guided German view for A1 users", async () => {
    mockUser = { user_prof_level: "A1" };
    mockPathname = "/learn-german";

    render(<BottomTabBar />);

    expect(screen.getByText("words learnt")).toBeInTheDocument();
    expect(screen.queryByText("progress")).not.toBeInTheDocument();
    const vocabBtn = screen.getByTitle("German words learnt");
    expect(vocabBtn).toBeInTheDocument();
    fireEvent.click(vocabBtn);
    expect(mockNavigate).toHaveBeenCalledWith("/learn-german/recap");
    await vi.waitFor(() => {
      expect(mockGetVocab).toHaveBeenCalled();
    });
    expect(mockGetB1Ratio).not.toHaveBeenCalled();
  });

  it("shows the Your A1 progress ring on the practice hub for A1 users", async () => {
    mockUser = { user_prof_level: "A1" };
    mockPathname = "/";

    render(<BottomTabBar />);

    expect(screen.getByText("Your A1")).toBeInTheDocument();
    expect(screen.getByText("progress")).toBeInTheDocument();
    expect(screen.getByTitle("Your A1 progress")).toBeInTheDocument();
    await vi.waitFor(() => {
      expect(mockGetA1Ratio).toHaveBeenCalled();
    });
    expect(mockGetVocab).not.toHaveBeenCalled();
  });

  it("shows the Your A2 progress ring on the practice hub for A2 users", async () => {
    mockUser = { user_prof_level: "A2" };
    mockPathname = "/";

    render(<BottomTabBar />);

    expect(screen.getByText("Your A2")).toBeInTheDocument();
    expect(screen.getByTitle("Your A2 progress")).toBeInTheDocument();
    await vi.waitFor(() => {
      expect(mockGetA2Ratio).toHaveBeenCalled();
    });
  });

  it("shows the Course status ring on the German Classes view", async () => {
    mockUser = { user_prof_level: "A1" };
    mockPathname = "/video-courses";

    render(<BottomTabBar />);

    expect(screen.getByText("Course")).toBeInTheDocument();
    expect(screen.getByText("status")).toBeInTheDocument();
    expect(screen.getByTitle("Course status")).toBeInTheDocument();
    await vi.waitFor(() => {
      expect(mockGetVideoRatio).toHaveBeenCalled();
    });
  });

  it("shows the Your job progress ring on the job-screening lobby for B1 users", async () => {
    mockPathname = "/job-screening";

    render(<BottomTabBar />);

    expect(screen.getByText("Your job")).toBeInTheDocument();
    expect(screen.getByText("progress")).toBeInTheDocument();
    expect(screen.getByTitle("Your job progress")).toBeInTheDocument();
    await vi.waitFor(() => {
      expect(mockGetJobRatio).toHaveBeenCalled();
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

describe("BottomTabBar — scholarship variant", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPathname = "/scholarship";
    mockUser = { user_prof_level: "A1", coins: 42 };
    localStorage.clear();
    mockGetStreak.mockResolvedValue({ currentStreak: 7 });
  });

  it("keeps the five-slot layout but only Home is live on the scholarship hub", async () => {
    render(<BottomTabBar />);

    // Home is a live link back to the exam hub (labelled "Home", not "Exam")
    const home = screen.getByRole("link", { name: /Home/ });
    expect(home).toHaveAttribute("href", "/scholarship");
    expect(home).toHaveTextContent("Home");
    expect(home).not.toHaveTextContent("Exam");

    // Jobs is rendered but NOT a link/button (greyed out, not clickable)
    expect(screen.getByText("Jobs")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Jobs/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Jobs/ })).not.toBeInTheDocument();

    // Streak is rendered but NOT a button (locked)
    expect(await screen.findByText("7 days")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /days/ })).not.toBeInTheDocument();

    // Coins are rendered greyed out with the user's balance
    expect(screen.getByText("42")).toBeInTheDocument();

    // Center chip still identifies the exam
    expect(screen.getByAltText("Scholarship Exam")).toBeInTheDocument();
  });

  it("renders the full navigation on a normal shell route (contrast check)", async () => {
    mockPathname = "/";
    render(<BottomTabBar />);

    expect(screen.getByRole("link", { name: /Home/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Jobs/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /days/ })).toBeInTheDocument();
  });
});

describe("B1/B2 shell — NewNavbar brand link context awareness", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPathname = "/";
    mockUser = { user_prof_level: "B1" };
    localStorage.clear();
  });

  it("links to /job-screening when a B1 user is on the job-screening pipeline", () => {
    mockPathname = "/job-screening";
    render(<NewNavbar />);

    const brandLink = screen.getByRole("link", { name: /German Level/i });
    expect(brandLink).toHaveAttribute("href", "/job-screening");
  });

  it("links to / when a B1 user is on practice hub", () => {
    mockPathname = "/";
    localStorage.setItem("lg_preferred_mode", "practice");
    render(<NewNavbar />);

    const brandLink = screen.getByRole("link", { name: /German Level/i });
    expect(brandLink).toHaveAttribute("href", "/");
  });
});
