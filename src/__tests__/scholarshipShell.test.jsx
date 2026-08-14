/**
 * Frontend Tests — scholarship shell wiring
 *
 * Covers the three pieces that give the scholarship funnel its own chrome:
 *   1. shellRoutes helpers (route detection + blend color)
 *   2. lgMode.switchScholarshipToMode (mode + level persisted together)
 *   3. TopModeSwitcher single-tab "Scholarship Exam" variant on /scholarship
 */
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, test, expect, beforeEach, vi } from "vitest";

// ─── shared module mocks (hoisted by vitest) ───────────────────────────────
vi.mock("../api/learnGermanApi", () => ({
  getLGMode: vi.fn().mockResolvedValue({ data: { mode: "practice" } }),
  setLGMode: vi.fn().mockResolvedValue({ data: {} }),
}));
vi.mock("react-redux", () => ({
  useSelector: () => ({ user: null }),
}));
vi.mock("../observability/clarity", () => ({
  trackClarityEvent: vi.fn(),
}));
vi.mock("../utils/haptics", () => ({
  hapticLight: vi.fn(),
}));

// ─── shellRoutes pure helpers ───────────────────────────────────────────────
import {
  isScholarshipRoute,
  isShellRoute,
  getSwitcherBlendColor,
} from "../utils/shellRoutes";

describe("shellRoutes — scholarship routing", () => {
  test("isScholarshipRoute matches the hub and all child routes", () => {
    expect(isScholarshipRoute("/scholarship")).toBe(true);
    expect(isScholarshipRoute("/scholarship/e1/take")).toBe(true);
    expect(isScholarshipRoute("/scholarship/e1/result")).toBe(true);
  });

  test("isScholarshipRoute is false outside the funnel", () => {
    expect(isScholarshipRoute("/")).toBe(false);
    expect(isScholarshipRoute("/learn-german")).toBe(false);
    expect(isScholarshipRoute("/job-screening")).toBe(false);
    expect(isScholarshipRoute("")).toBe(false);
  });

  test("/scholarship is a shell route so navbar + bottom bar render", () => {
    expect(isShellRoute("/scholarship")).toBe(true);
  });

  test("switcher blend color on the scholarship hub is white", () => {
    expect(getSwitcherBlendColor("/scholarship")).toBe("#ffffff");
  });
});

// ─── switchScholarshipToMode ────────────────────────────────────────────────
import { switchScholarshipToMode } from "../utils/lgMode";
import { setLGMode } from "../api/learnGermanApi";

describe("switchScholarshipToMode", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  test("persists mode + level together and fires the mode-change event", () => {
    const onModeChange = vi.fn();
    window.addEventListener("lgModeChange", onModeChange);
    try {
      switchScholarshipToMode("practice", "B1");

      expect(localStorage.getItem("lg_preferred_mode")).toBe("practice");
      expect(localStorage.getItem("lg_mode_switched_at")).toBeTruthy();
      expect(setLGMode).toHaveBeenCalledWith("practice", "B1");
      expect(onModeChange).toHaveBeenCalledTimes(1);
      expect(onModeChange.mock.calls[0][0].detail.mode).toBe("practice");
    } finally {
      window.removeEventListener("lgModeChange", onModeChange);
    }
  });

  test("learn mode with a level reaches the API", () => {
    switchScholarshipToMode("learn", "A2");
    expect(setLGMode).toHaveBeenCalledWith("learn", "A2");
  });
});

// ─── TopModeSwitcher scholarship variant ────────────────────────────────────
import TopModeSwitcher from "../components/TopModeSwitcher";

describe("TopModeSwitcher — scholarship variant", () => {
  test("renders a single always-active 'Scholarship Exam' tab on /scholarship", async () => {
    render(
      <MemoryRouter initialEntries={["/scholarship"]}>
        <TopModeSwitcher />
      </MemoryRouter>,
    );

    const tabs = screen.getAllByRole("tab");
    expect(tabs).toHaveLength(1);
    expect(tabs[0]).toHaveAttribute("aria-selected", "true");
    expect(tabs[0]).toHaveTextContent("Scholarship");
    expect(tabs[0]).toHaveTextContent("Exam");
  });

  test("non-scholarship shell routes keep the full tab set", async () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <TopModeSwitcher />
      </MemoryRouter>,
    );

    // user is null → not B1 → the three-tab (Exam & Practice / Guided German /
    // German Classes) layout renders.
    await waitFor(() => {
      expect(screen.getAllByRole("tab")).toHaveLength(3);
    });
    expect(screen.getByText("Exam &")).toBeInTheDocument();
    expect(screen.getByText("Guided")).toBeInTheDocument();
    expect(screen.getByText("Classes")).toBeInTheDocument();
  });
});
