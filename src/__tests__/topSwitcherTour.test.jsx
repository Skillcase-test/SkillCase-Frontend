import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import TopSwitcherTour from "../components/TopSwitcherTour";

const mockNavigate = vi.fn();
let mockPathname = "/";
let mockUser = {
  user_id: "user-123",
  user_prof_level: "A1",
  occupation: "nurse",
  top_switcher_tour_completed: false,
};
let mockClassesEnabled = true;

vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
  useLocation: () => ({ pathname: mockPathname }),
}));

const mockDispatch = vi.fn();
vi.mock("react-redux", () => ({
  useDispatch: () => mockDispatch,
  useSelector: (selector) =>
    selector({
      auth: {
        user: mockUser,
        isAuthenticated: true,
      },
    }),
}));

vi.mock("../hooks/useFeatureFlags", () => ({
  useFeatureFlags: () => ({
    isFeatureEnabled: (key) =>
      key === "german_classes" ? mockClassesEnabled : false,
  }),
}));

const mockPost = vi.fn().mockResolvedValue({ data: { success: true } });
vi.mock("../api/axios", () => ({
  default: {
    post: (...args) => mockPost(...args),
  },
}));

// Mock GuideSpotlight to easily render children
vi.mock("../components/GuideSpotlight", () => ({
  default: ({ rect, children }) => (
    <div data-testid="guide-spotlight" data-rect={JSON.stringify(rect)}>
      {children}
    </div>
  ),
}));

describe("TopSwitcherTour", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockPathname = "/";
    mockClassesEnabled = true;
    mockUser = {
      user_id: "user-123",
      user_prof_level: "A1",
      occupation: "nurse",
      top_switcher_tour_completed: false,
    };
    mockNavigate.mockImplementation((to) => {
      mockPathname = to;
    });

    // Setup mock DOM elements for switcher tabs so measure works
    document.body.innerHTML = `
      <div id="top-mode-switcher-tablist">
        <button data-tour-tab="practice" id="top-switcher-tab-practice">Practice</button>
        <button data-tour-tab="learn" id="top-switcher-tab-learn">Guided</button>
        <button data-tour-tab="courses" id="top-switcher-tab-courses">Classes</button>
        <button data-tour-tab="jobs" id="top-switcher-tab-jobs">Jobs</button>
      </div>
    `;

    // Mock getBoundingClientRect
    Element.prototype.getBoundingClientRect = vi.fn(() => ({
      top: 50,
      left: 100,
      width: 120,
      height: 48,
    }));
  });

  const originalGetBoundingClientRect = Element.prototype.getBoundingClientRect;
  afterEach(() => {
    Element.prototype.getBoundingClientRect = originalGetBoundingClientRect;
    delete window.__topSwitcherTourActive;
    try {
      sessionStorage.removeItem("top_switcher_tour_active");
    } catch {}
    document.body.innerHTML = "";
  });

  it("does not render if user has already completed the tour", () => {
    mockUser.top_switcher_tour_completed = true;
    render(<TopSwitcherTour />);
    expect(screen.queryByTestId("guide-spotlight")).toBeNull();
  });

  it("does not render if localStorage marks tour completed for user", () => {
    localStorage.setItem("top_switcher_tour_completed_user-123", "true");
    render(<TopSwitcherTour />);
    expect(screen.queryByTestId("guide-spotlight")).toBeNull();
  });

  it("renders when arriving at / for a new A1 user, starting with German Practice", async () => {
    mockPathname = "/";
    render(<TopSwitcherTour />);

    await waitFor(() => {
      expect(screen.getByTestId("top-switcher-tour-title")).toHaveTextContent(
        "German Practice",
      );
    });

    expect(screen.getByTestId("top-switcher-tour-body")).toHaveTextContent(
      "This is where you practice daily with flashcards",
    );
    expect(screen.getByTestId("top-switcher-dot-0")).toBeInTheDocument();
    expect(screen.getByTestId("top-switcher-dot-1")).toBeInTheDocument();
    expect(screen.getByTestId("top-switcher-dot-2")).toBeInTheDocument();
  });

  it("starts on Guided German when user lands on /learn-german", async () => {
    mockPathname = "/learn-german";
    render(<TopSwitcherTour />);

    await waitFor(() => {
      expect(screen.getByTestId("top-switcher-tour-title")).toHaveTextContent(
        "Guided German",
      );
    });

    expect(screen.getByTestId("top-switcher-tour-body")).toHaveTextContent(
      "Here, I will guide you step by step",
    );
  });

  it("excludes German Classes step when german_classes feature flag is disabled", async () => {
    mockClassesEnabled = false;
    mockPathname = "/";
    render(<TopSwitcherTour />);

    await waitFor(() => {
      expect(screen.getByTestId("top-switcher-tour-title")).toHaveTextContent(
        "German Practice",
      );
    });

    expect(screen.queryByTestId("top-switcher-dot-2")).toBeNull();
  });

  it("navigates routes sequentially and returns to initialRoute on completion", async () => {
    mockPathname = "/";
    render(<TopSwitcherTour />);

    await waitFor(() => {
      expect(screen.getByTestId("top-switcher-tour-title")).toHaveTextContent(
        "German Practice",
      );
    });

    // Step 0 -> Step 1 (Guided German)
    fireEvent.click(screen.getByTestId("top-switcher-tour-next"));

    expect(mockNavigate).toHaveBeenCalledWith("/learn-german", { replace: true });

    // Advance to Step 2 (German Classes)
    fireEvent.click(screen.getByTestId("top-switcher-tour-next"));
    expect(mockNavigate).toHaveBeenCalledWith("/video-courses", { replace: true });

    // Click "Got it" on final step
    const listener = vi.fn();
    window.addEventListener("topSwitcherTourComplete", listener);

    fireEvent.click(screen.getByTestId("top-switcher-tour-next"));

    // Navigates back to initialRoute "/"
    expect(mockNavigate).toHaveBeenCalledWith("/", { replace: true });
    expect(localStorage.getItem("top_switcher_tour_completed_user-123")).toBe("true");
    expect(localStorage.getItem("top_switcher_tour_completed")).toBeNull();
    expect(mockPost).toHaveBeenCalledWith("/user/complete-top-switcher-tour");
    expect(listener).toHaveBeenCalled();
  });

  it("returns to initialRoute immediately when clicking Skip after navigating", async () => {
    mockPathname = "/learn-german";
    render(<TopSwitcherTour />);

    await waitFor(() => {
      expect(screen.getByTestId("top-switcher-tour-title")).toHaveTextContent(
        "Guided German",
      );
    });

    // Advance to Step 1 (navigates to "/")
    fireEvent.click(screen.getByTestId("top-switcher-tour-next"));
    expect(mockNavigate).toHaveBeenCalledWith("/", { replace: true });

    // Click Skip from Step 1
    fireEvent.click(screen.getByTestId("top-switcher-tour-skip"));

    // Should return to initialRoute "/learn-german"
    expect(mockNavigate).toHaveBeenCalledWith("/learn-german", { replace: true });
    expect(localStorage.getItem("top_switcher_tour_completed_user-123")).toBe("true");
    expect(localStorage.getItem("top_switcher_tour_completed")).toBeNull();
    expect(mockPost).toHaveBeenCalledWith("/user/complete-top-switcher-tour");
  });

  it("renders Job Preparation and German Jobs for B1 users", async () => {
    mockUser.user_prof_level = "B1";
    mockPathname = "/";
    render(<TopSwitcherTour />);

    await waitFor(() => {
      expect(screen.getByTestId("top-switcher-tour-title")).toHaveTextContent(
        "Job Preparation",
      );
    });

    fireEvent.click(screen.getByTestId("top-switcher-tour-next"));
    expect(mockNavigate).toHaveBeenCalledWith("/job-screening", { replace: true });
  });

  it("uses physio avatar when user.occupation is physiotherapist", async () => {
    mockUser.occupation = "physiotherapist";
    render(<TopSwitcherTour />);

    await waitFor(() => {
      const img = screen.getByAltText("Maya");
      expect(img.getAttribute("src")).toContain("Physio");
    });
  });

  it("sets and clears window.__topSwitcherTourActive and sessionStorage during tour lifecycle", async () => {
    mockPathname = "/";
    render(<TopSwitcherTour />);

    await waitFor(() => {
      expect(window.__topSwitcherTourActive).toBe(true);
      expect(sessionStorage.getItem("top_switcher_tour_active")).toBe("true");
    });

    // Skip the tour
    fireEvent.click(screen.getByTestId("top-switcher-tour-skip"));

    expect(window.__topSwitcherTourActive).toBe(false);
    expect(sessionStorage.getItem("top_switcher_tour_active")).toBeNull();
  });
});
