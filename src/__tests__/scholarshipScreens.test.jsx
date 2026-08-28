/**
 * Frontend Tests — scholarship candidate screens
 *
 * Covers the scholarship exam funnel for candidates:
 *   - ScholarshipHome: every hub state (no exam / ready / in progress /
 *     results awaited / results released / warned out)
 *   - ScholarshipResult: results-awaited screen with the learn/practice
 *     hand-off (level-pick modal → switchScholarshipToMode → navigation) and
 *     the released-results screen
 *   - ScholarshipLevelPickerModal: requires a level before confirming
 */
import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { Provider } from "react-redux";
import { describe, test, expect, beforeEach, vi } from "vitest";
import { store } from "../redux/store";
import { setUser } from "../redux/auth/authSlice";

vi.mock("../api/scholarshipExamApi", () => ({
  getScholarshipExam: vi.fn(),
  getExamResult: vi.fn(),
}));
vi.mock("../telemetry/legacyAnalytics", () => {
  // Stable reference — ScholarshipHome's effect depends on [analytics], so a
  // fresh object per render would re-trigger the fetch on every re-render.
  const analytics = { capture: vi.fn() };
  return { useFirstPartyAnalytics: () => analytics };
});
vi.mock("../utils/lgMode", () => ({
  switchScholarshipToMode: vi.fn(),
}));

import {
  getScholarshipExam,
  getExamResult,
} from "../api/scholarshipExamApi";
import { switchScholarshipToMode } from "../utils/lgMode";
import ScholarshipHome from "../pages/scholarship/ScholarshipHome";
import ScholarshipResult from "../pages/scholarship/ScholarshipResult";
import ScholarshipLevelPickerModal from "../components/ScholarshipLevelPickerModal";

const makeExam = (overrides = {}) => ({
  test_id: "e1",
  title: "Scholarship Test 2026",
  description: "Official scholarship exam",
  duration_minutes: 45,
  total_questions: 10,
  results_visible: false,
  ...overrides,
});

// ─── ScholarshipHome ────────────────────────────────────────────────────────

describe("ScholarshipHome", () => {
  beforeEach(() => vi.clearAllMocks());

  test("shows the empty state when no exam exists", async () => {
    getScholarshipExam.mockResolvedValue({
      data: { exam: null, submission: null },
    });
    render(
      <MemoryRouter>
        <ScholarshipHome />
      </MemoryRouter>,
    );

    expect(await screen.findByText("No scholarship exam yet")).toBeInTheDocument();
    expect(getScholarshipExam).toHaveBeenCalledTimes(1);
  });

  test("empty state Refresh re-fetches the exam instead of navigating home", async () => {
    getScholarshipExam
      .mockResolvedValueOnce({ data: { exam: null, submission: null } })
      .mockResolvedValueOnce({
        data: {
          exam: makeExam({ test_id: 5, title: "A2 BATCH 4" }),
          submission: null,
        },
      });
    render(
      <MemoryRouter>
        <ScholarshipHome />
      </MemoryRouter>,
    );

    fireEvent.click(await screen.findByRole("button", { name: "Refresh" }));

    expect(await screen.findByText("A2 BATCH 4")).toBeInTheDocument();
    expect(getScholarshipExam).toHaveBeenCalledTimes(2);
  });

  test("error state shows a Refresh button that retries the fetch", async () => {
    getScholarshipExam
      .mockRejectedValueOnce({ response: { status: 500, data: { msg: "boom" } } })
      .mockResolvedValueOnce({
        data: {
          exam: makeExam({ test_id: 5, title: "A2 BATCH 4" }),
          submission: null,
        },
      });
    render(
      <MemoryRouter>
        <ScholarshipHome />
      </MemoryRouter>,
    );

    expect(await screen.findByText("boom")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Refresh" }));

    expect(await screen.findByText("A2 BATCH 4")).toBeInTheDocument();
    expect(getScholarshipExam).toHaveBeenCalledTimes(2);
  });

  test("ready state shows the Start Exam CTA", async () => {
    getScholarshipExam.mockResolvedValue({
      data: { exam: makeExam(), submission: null },
    });
    render(
      <MemoryRouter>
        <ScholarshipHome />
      </MemoryRouter>,
    );

    expect(
      await screen.findByRole("button", { name: "Start Exam" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Ready when you are")).toBeInTheDocument();
    // Hero stat chips show duration + question count
    expect(screen.getByText("45")).toBeInTheDocument();
    expect(screen.getByText("Minutes")).toBeInTheDocument();
    expect(screen.getByText("10")).toBeInTheDocument();
    expect(screen.getByText("Questions")).toBeInTheDocument();
  });

  test("Start Exam opens the instructions modal instead of starting directly", async () => {
    getScholarshipExam.mockResolvedValue({
      data: { exam: makeExam(), submission: null },
    });
    render(
      <MemoryRouter>
        <ScholarshipHome />
      </MemoryRouter>,
    );

    fireEvent.click(await screen.findByRole("button", { name: "Start Exam" }));

    expect(screen.getByText("Exam Instructions")).toBeInTheDocument();
    expect(
      screen.getByText("3 violations will automatically close your exam."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /I understand, start/ }),
    ).toBeInTheDocument();

    // Dismissing leaves the candidate on the hub with the attempt untouched.
    fireEvent.click(screen.getByRole("button", { name: "Not now" }));
    expect(screen.queryByText("Exam Instructions")).not.toBeInTheDocument();
  });

  test("in-progress state shows Resume Exam with remaining time", async () => {    getScholarshipExam.mockResolvedValue({
      data: {
        exam: makeExam(),
        submission: { status: "in_progress", remaining_seconds: 600 },
      },
    });
    render(
      <MemoryRouter>
        <ScholarshipHome />
      </MemoryRouter>,
    );

    expect(
      await screen.findByRole("button", { name: "Resume Exam" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/10m 00s left/)).toBeInTheDocument();
  });

  test("completed with hidden results shows the awaited card + View Status", async () => {
    getScholarshipExam.mockResolvedValue({
      data: { exam: makeExam(), submission: { status: "completed" } },
    });
    render(
      <MemoryRouter>
        <ScholarshipHome />
      </MemoryRouter>,
    );

    expect(
      await screen.findByText("Exam submitted — results awaited"),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "View Status" })).toBeInTheDocument();
  });

  test("completed with released results links to the result screen", async () => {
    getScholarshipExam.mockResolvedValue({
      data: {
        exam: makeExam({ results_visible: true }),
        submission: { status: "completed" },
      },
    });
    render(
      <MemoryRouter>
        <ScholarshipHome />
      </MemoryRouter>,
    );

    expect(await screen.findByText("Your results are out!")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "View Result" })).toBeInTheDocument();
  });

  test("warned-out status locks the exam with a reopen hint", async () => {
    getScholarshipExam.mockResolvedValue({
      data: {
        exam: makeExam(),
        submission: { status: "warned_out" },
      },
    });
    render(
      <MemoryRouter>
        <ScholarshipHome />
      </MemoryRouter>,
    );

    expect(await screen.findByText("Exam closed due to warnings")).toBeInTheDocument();
    expect(
      screen.getByText(/Contact the scholarship team to reopen/),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Start Exam" })).not.toBeInTheDocument();
  });

  test("auto-closed status explains the time expiry", async () => {
    getScholarshipExam.mockResolvedValue({
      data: {
        exam: makeExam(),
        submission: { status: "auto_closed" },
      },
    });
    render(
      <MemoryRouter>
        <ScholarshipHome />
      </MemoryRouter>,
    );

    expect(
      await screen.findByText("Exam auto-closed (time expired)"),
    ).toBeInTheDocument();
  });
});

// ─── ScholarshipResult ──────────────────────────────────────────────────────

const renderResult = (ui) =>
  render(
    <Provider store={store}>
      <MemoryRouter initialEntries={["/scholarship/e1/result"]}>
        <Routes>
          <Route path="/scholarship/:testId/result" element={ui} />
          <Route path="/" element={<div>LANDED_ON_ROOT</div>} />
          <Route path="/learn-german" element={<div>LANDED_ON_LEARN</div>} />
          <Route path="/trial-offer" element={<div>LANDED_ON_TRIAL</div>} />
        </Routes>
      </MemoryRouter>
    </Provider>,
  );

// A fresh scholarship candidate: onboarding gave them a placeholder A1, so the
// level picker is the point at which they choose a real level.
const freshCandidate = {
  user_id: "u1",
  trial_taken: true,
  scholarship_candidate_at: "2026-08-01T00:00:00Z",
  lg_preferred_mode: "scholarship",
};

describe("ScholarshipResult", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    store.dispatch(setUser(freshCandidate));
  });

  test("results-awaited: practice hand-off sets the level and lands on /", async () => {
    getExamResult.mockRejectedValue({
      response: { status: 403, data: { results_awaited: true } },
    });
    renderResult(<ScholarshipResult />);

    expect(await screen.findByText("Results awaited")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Practice Your German/ }));
    expect(await screen.findByText("Start practicing German")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /B1 – Intermediate/ }));
    fireEvent.click(screen.getByRole("button", { name: "Start Practicing" }));

    await waitFor(() =>
      expect(switchScholarshipToMode).toHaveBeenCalledWith("practice", "B1"),
    );
    expect(await screen.findByText("LANDED_ON_ROOT")).toBeInTheDocument();
  });

  test("results-awaited: dismissing the modal keeps the candidate on the page", async () => {
    getExamResult.mockRejectedValue({
      response: { status: 403, data: { results_awaited: true } },
    });
    renderResult(<ScholarshipResult />);

    await screen.findByText("Results awaited");
    fireEvent.click(screen.getByRole("button", { name: /Practice Your German/ }));
    await screen.findByText("Start practicing German");

    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    await waitFor(() =>
      expect(screen.queryByText("Start practicing German")).not.toBeInTheDocument(),
    );
    expect(switchScholarshipToMode).not.toHaveBeenCalled();
  });

  // A candidate who came from an existing practice account already has a real
  // level — asking again would demote them, so the picker is skipped entirely.
  test("results-awaited: an existing practice user skips the level picker", async () => {
    store.dispatch(
      setUser({
        user_id: "u2",
        trial_taken: true,
        scholarship_candidate_at: null,
        lg_preferred_mode: "practice",
      }),
    );
    getExamResult.mockRejectedValue({
      response: { status: 403, data: { results_awaited: true } },
    });
    renderResult(<ScholarshipResult />);

    await screen.findByText("Results awaited");
    fireEvent.click(screen.getByRole("button", { name: /Practice Your German/ }));

    await waitFor(() =>
      // No level argument: their existing level stays untouched.
      expect(switchScholarshipToMode).toHaveBeenCalledWith("practice"),
    );
    expect(screen.queryByText("Start practicing German")).not.toBeInTheDocument();
    expect(await screen.findByText("LANDED_ON_ROOT")).toBeInTheDocument();
  });

  test("released results show scholarship award with dialer CTA (eligible)", async () => {
    getExamResult.mockResolvedValue({
      data: {
        exam: makeExam({ results_visible: true }),
        submission: {
          status: "completed",
          score: 80,
          earned_points: 8,
          total_points: 10,
          awarded_scholarship_pct: 20,
          awarded_tier_id: 1,
          finished_at: new Date().toISOString(),
        },
        tiers: [{ tier_id: 1, min_score: 50, scholarship_pct: 10 }],
        percentile: 82,
        awarded_tier: { tier_id: 1, min_score: 80, scholarship_pct: 20 },
      },
    });
    renderResult(<ScholarshipResult />);

    expect(await screen.findByText(/You're eligible for/)).toBeInTheDocument();
    expect(screen.getByText(/20% scholarship/)).toBeInTheDocument();
    expect(screen.getByText(/You're above 82% of candidates/)).toBeInTheDocument();
    const cta = screen.getByRole("link", { name: /Contact SkillCase Team/ });
    expect(cta).toHaveAttribute("href", "tel:+919972266767");
    expect(screen.queryByText("Answer Review")).not.toBeInTheDocument();
  });

  test("released results show not-eligible state without CTA", async () => {
    getExamResult.mockResolvedValue({
      data: {
        exam: makeExam({ results_visible: true }),
        submission: {
          status: "completed",
          score: 30,
          earned_points: 3,
          total_points: 10,
          awarded_scholarship_pct: null,
          awarded_tier_id: null,
          finished_at: new Date().toISOString(),
        },
        tiers: [{ tier_id: 1, min_score: 50, scholarship_pct: 10 }],
        percentile: 10,
        awarded_tier: null,
      },
    });
    renderResult(<ScholarshipResult />);

    expect(await screen.findByText(/Thanks for taking the scholarship exam/)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Contact SkillCase Team/ })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Back to SkillCase/ })).toBeInTheDocument();
  });

  // ── Redemption window ───────────────────────────────────────────────────
  // The admin sets redemption_expires_at; an eligible candidate sees a live
  // countdown until it passes, then the percentage is withheld but the phone
  // CTA stays so they can still talk to someone.
  const eligibleWithExpiry = (expiresAt) => ({
    data: {
      exam: makeExam({ results_visible: true, redemption_expires_at: expiresAt }),
      submission: {
        status: "completed",
        score: 80,
        awarded_scholarship_pct: 20,
        awarded_tier_id: 1,
        finished_at: new Date().toISOString(),
      },
      tiers: [{ tier_id: 1, min_score: 50, scholarship_pct: 10 }],
      percentile: 82,
      awarded_tier: { tier_id: 1, min_score: 80, scholarship_pct: 20 },
    },
  });

  test("an unexpired window shows a live countdown", async () => {
    const in2h = new Date(Date.now() + 2 * 60 * 60 * 1000 + 90_000).toISOString();
    getExamResult.mockResolvedValue(eligibleWithExpiry(in2h));
    renderResult(<ScholarshipResult />);

    expect(await screen.findByText("Redeem within")).toBeInTheDocument();
    expect(screen.getByText(/^02:\d\d:\d\d$/)).toBeInTheDocument();
    expect(screen.getByText(/20% scholarship/)).toBeInTheDocument();
  });

  test("an expired window hides the percentage but keeps the dialer CTA", async () => {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    getExamResult.mockResolvedValue(eligibleWithExpiry(yesterday));
    renderResult(<ScholarshipResult />);

    expect(await screen.findByRole("heading", { name: "Offer expired" })).toBeInTheDocument();
    expect(screen.queryByText(/20% scholarship/)).not.toBeInTheDocument();
    expect(screen.queryByText("Redeem within")).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Contact SkillCase Team/ }),
    ).toHaveAttribute("href", "tel:+919972266767");
  });

  test("an expiry set for a non-eligible candidate never shows a countdown", async () => {
    const in2h = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
    const res = eligibleWithExpiry(in2h);
    res.data.submission.awarded_scholarship_pct = null;
    res.data.awarded_tier = null;
    getExamResult.mockResolvedValue(res);
    renderResult(<ScholarshipResult />);

    expect(await screen.findByText(/Thanks for taking the scholarship exam/)).toBeInTheDocument();
    expect(screen.queryByText("Redeem within")).not.toBeInTheDocument();
  });

  test("non-awaited error shows the error screen with a back link", async () => {
    getExamResult.mockRejectedValue({ response: { status: 500, data: { msg: "boom" } } });
    renderResult(<ScholarshipResult />);

    expect(await screen.findByText("boom")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Back to Exam" })).toBeInTheDocument();
  });
});

// ─── ScholarshipLevelPickerModal ────────────────────────────────────────────

describe("ScholarshipLevelPickerModal", () => {
  beforeEach(() => vi.clearAllMocks());

  test("renders all 4 levels and requires a selection before confirming", () => {
    const onDone = vi.fn();
    render(
      <ScholarshipLevelPickerModal
        mode="practice"
        onDone={onDone}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: /A1 – Beginner/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /A2 – Elementary/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /B1 – Intermediate/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /B2 – Upper Intermediate/ })).toBeInTheDocument();

    const confirm = screen.getByRole("button", { name: "Start Practicing" });
    expect(confirm).toBeDisabled();
    fireEvent.click(confirm);
    expect(onDone).not.toHaveBeenCalled();
    expect(switchScholarshipToMode).not.toHaveBeenCalled();
  });

  test("selecting a level hands off to that mode + level", async () => {
    const onDone = vi.fn();
    render(
      <ScholarshipLevelPickerModal
        mode="learn"
        onDone={onDone}
        onClose={vi.fn()}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: /B2 – Upper Intermediate/ }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Start Learning" }));

    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));
    expect(switchScholarshipToMode).toHaveBeenCalledWith("learn", "B2");
  });

  test("dismissing via the close button never switches mode", () => {
    const onClose = vi.fn();
    render(
      <ScholarshipLevelPickerModal
        mode="practice"
        onDone={vi.fn()}
        onClose={onClose}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(switchScholarshipToMode).not.toHaveBeenCalled();
  });
});
