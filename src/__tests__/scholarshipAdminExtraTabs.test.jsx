import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";

vi.mock("../api/scholarshipExamApi", () => ({
  listUserAwards: vi.fn(),
  searchUsersForAward: vi.fn(),
  createUserAward: vi.fn(),
  updateUserAward: vi.fn(),
  revokeUserAward: vi.fn(),
  getAuditLog: vi.fn(),
  listTiers: vi.fn().mockResolvedValue({ data: { tiers: [] } }),
  getExamSubmissions: vi.fn().mockResolvedValue({ data: { submissions: [] } }),
  updateExam: vi.fn(),
  listCompletedCandidatesForAward: vi.fn().mockResolvedValue({
    data: { candidates: [], count: 0, pending_count: 0, page: 1, limit: 25 },
  }),
}));

const workspace = vi.hoisted(() => ({ selectedExam: { test_id: 1 } }));

vi.mock("../dashboard-src/pages/exam/scholarship/index", () => ({
  useScholarshipWorkspace: () => workspace,
}));

import * as api from "../api/scholarshipExamApi";
import UserAwardsTab from "../dashboard-src/pages/exam/scholarship/UserAwardsTab";
import TiersTab from "../dashboard-src/pages/exam/scholarship/TiersTab";
import ActivityLogTab from "../dashboard-src/pages/exam/scholarship/ActivityLogTab";
import { formatTimeLeft, timeLeftUntil } from "../dashboard-src/pages/exam/scholarship/ui/timeLeft";

describe("UserAwardsTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.listUserAwards).mockResolvedValue({ data: { awards: [], count: 0 } });
  });

  test("renders and searches users (instant dropdown)", async () => {
    vi.mocked(api.searchUsersForAward).mockResolvedValue({ data: { users: [{ user_id: "u1", fullname: "Yash", username: "yash", number: "987", role: "user" }] } });
    render(<UserAwardsTab />);
    await waitFor(() => expect(api.listUserAwards).toHaveBeenCalled());
    const input = screen.getByTestId("award-user-search");
    fireEvent.change(input, { target: { value: "yas" } });
    // instant searchable dropdown debounces 300ms (like payments-admin modals)
    await waitFor(() => expect(api.searchUsersForAward).toHaveBeenCalledWith("yas"), { timeout: 2000 });
    expect(await screen.findByTestId("award-user-result")).toBeInTheDocument();
  });

  test("shows empty state when no awards", async () => {
    render(<UserAwardsTab />);
    expect(await screen.findByTestId("award-empty")).toBeInTheDocument();
  });

  test("filter debounces and keeps the input mounted between refetches", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    render(<UserAwardsTab />);
    await waitFor(() => expect(api.listUserAwards).toHaveBeenCalledTimes(1));
    const filter = screen.getByTestId("award-filter");
    fireEvent.change(filter, { target: { value: "y" } });
    fireEvent.change(filter, { target: { value: "ya" } });
    fireEvent.change(filter, { target: { value: "yas" } });
    // Still the initial call: three keystrokes inside the window are one query.
    expect(api.listUserAwards).toHaveBeenCalledTimes(1);
    // And the input survives — a spinner swapping out the tab would unmount it.
    expect(screen.getByTestId("award-filter")).toBe(filter);
    await act(async () => { await vi.advanceTimersByTimeAsync(350); });
    await waitFor(() => expect(api.listUserAwards).toHaveBeenLastCalledWith(expect.objectContaining({ q: "yas" })));
    expect(api.listUserAwards).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });

  test("revoke asks in-app and sends the typed reason", async () => {
    vi.mocked(api.listUserAwards).mockResolvedValue({
      data: { awards: [{ id: 3, user_id: "u1", fullname: "Yash", username: "yash", number: "987", scholarship_pct: 40, reason: null }], count: 1 },
    });
    vi.mocked(api.revokeUserAward).mockResolvedValue({ data: { award: {} } });
    render(<UserAwardsTab />);
    fireEvent.click(await screen.findByTestId("award-revoke-btn"));
    fireEvent.change(await screen.findByTestId("confirm-prompt"), { target: { value: "duplicate award" } });
    fireEvent.click(screen.getByText("Revoke award"));
    await waitFor(() => expect(api.revokeUserAward).toHaveBeenCalledWith(3, { revoke_reason: "duplicate award" }));
  });
});

describe("UserAwardsTab — per-user redemption window", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    workspace.selectedExam = { test_id: 1 };
  });

  const awardWithWindow = {
    id: 1, user_id: "u1", fullname: "Asha", username: "asha", number: "111",
    scholarship_pct: 30, reason: null,
    redemption_expires_at: new Date(Date.now() + 47.4 * 3600_000).toISOString(),
    window_end: new Date(Date.now() + 47.4 * 3600_000).toISOString(), hours_left: 47.4,
  };
  const awardGlobal = {
    id: 2, user_id: "u2", fullname: "Beena", username: "beena", number: "222",
    scholarship_pct: 20, reason: null, redemption_expires_at: null, window_end: null, hours_left: null,
  };

  test("shows hours-left chip for a per-user deadline and a global fallback chip otherwise", async () => {
    vi.mocked(api.listUserAwards).mockResolvedValue({ data: { awards: [awardWithWindow, awardGlobal], count: 2 } });
    render(<UserAwardsTab />);
    const chips = await screen.findAllByTestId("award-window-chip");
    expect(chips[0]).toHaveTextContent("1d 23h left");
    expect(await screen.findByTestId("award-window-global")).toHaveTextContent("Global window");
  });

  test("expired per-user window shows Expired", async () => {
    const past = new Date(Date.now() - 2 * 3600_000).toISOString();
    vi.mocked(api.listUserAwards).mockResolvedValue({
      data: { awards: [{ ...awardWithWindow, redemption_expires_at: past, window_end: past, hours_left: -2 }], count: 1 },
    });
    render(<UserAwardsTab />);
    expect(await screen.findByTestId("award-window-chip")).toHaveTextContent("Expired");
  });

  test("create sends redemption_expires_at when the date selector is filled", async () => {
    vi.mocked(api.listUserAwards).mockResolvedValue({ data: { awards: [], count: 0 } });
    vi.mocked(api.searchUsersForAward).mockResolvedValue({ data: { users: [{ user_id: "u1", fullname: "Asha", username: "asha", number: "111", role: "user" }] } });
    vi.mocked(api.createUserAward).mockResolvedValue({ data: { award: {} } });
    render(<UserAwardsTab />);
    await waitFor(() => expect(api.listUserAwards).toHaveBeenCalled());

    fireEvent.change(screen.getByTestId("award-user-search"), { target: { value: "asha" } });
    fireEvent.click(await screen.findByTestId("award-user-result"));
    fireEvent.change(screen.getByTestId("award-pct-input"), { target: { value: "25" } });
    // The picker reads the value as IST (+05:30), matching the global selector
    fireEvent.change(screen.getByTestId("award-expires-input"), { target: { value: "2030-01-01T10:00" } });
    fireEvent.click(screen.getByTestId("award-create-btn"));
    await waitFor(() => expect(api.createUserAward).toHaveBeenCalledWith(expect.objectContaining({
      user_id: "u1", scholarship_pct: 25, redemption_expires_at: "2030-01-01T04:30:00.000Z",
    })));
  });

  test("create rejects a past deadline client-side", async () => {
    vi.mocked(api.listUserAwards).mockResolvedValue({ data: { awards: [], count: 0 } });
    vi.mocked(api.searchUsersForAward).mockResolvedValue({ data: { users: [{ user_id: "u1", fullname: "Asha", username: "asha", number: "111", role: "user" }] } });
    render(<UserAwardsTab />);
    await waitFor(() => expect(api.listUserAwards).toHaveBeenCalled());

    fireEvent.change(screen.getByTestId("award-user-search"), { target: { value: "asha" } });
    fireEvent.click(await screen.findByTestId("award-user-result"));
    fireEvent.change(screen.getByTestId("award-pct-input"), { target: { value: "25" } });
    fireEvent.change(screen.getByTestId("award-expires-input"), { target: { value: "2020-01-01T10:00" } });
    fireEvent.click(screen.getByTestId("award-create-btn"));
    await waitFor(() => expect(api.createUserAward).not.toHaveBeenCalled());
  });

  test("clearing the row's deadline sends null (falls back to global)", async () => {
    vi.mocked(api.listUserAwards).mockResolvedValue({ data: { awards: [awardWithWindow], count: 1 } });
    vi.mocked(api.updateUserAward).mockResolvedValue({ data: { award: {} } });
    render(<UserAwardsTab />);
    const expiresInput = await screen.findByTestId("award-row-expires");
    expect(expiresInput.value).not.toBe("");
    fireEvent.change(expiresInput, { target: { value: "" } });
    fireEvent.click(screen.getByTestId("award-row-save"));
    await waitFor(() => expect(api.updateUserAward).toHaveBeenCalledWith(1, expect.objectContaining({
      scholarship_pct: 30, redemption_expires_at: null,
    })));
  });

  test("an unchanged, already-passed deadline does not block other edits", async () => {
    const pastDeadline = new Date(Date.now() - 2 * 3600_000).toISOString();
    vi.mocked(api.listUserAwards).mockResolvedValue({
      data: { awards: [{ ...awardWithWindow, redemption_expires_at: pastDeadline, window_end: pastDeadline, hours_left: -2 }], count: 1 },
    });
    vi.mocked(api.updateUserAward).mockResolvedValue({ data: { award: {} } });
    render(<UserAwardsTab />);
    fireEvent.change(await screen.findByTestId("award-row-pct"), { target: { value: "40" } });
    fireEvent.click(screen.getByTestId("award-row-save"));
    await waitFor(() => expect(api.updateUserAward).toHaveBeenCalled());
    const payload = api.updateUserAward.mock.calls[0][1];
    expect(payload.scholarship_pct).toBe(40);
    // Re-sending the stale deadline would trip the server's now-or-later rule
    expect(payload).not.toHaveProperty("redemption_expires_at");
  });

  test("renders completed candidates feed and grants award directly", async () => {
    vi.mocked(api.listCompletedCandidatesForAward).mockResolvedValue({
      data: {
        candidates: [
          {
            submission_id: 101,
            user_id: "u123",
            fullname: "Aarav Sharma",
            number: "9876543210",
            score: 85,
            earned_points: 17,
            total_points: 20,
            finished_at: new Date().toISOString(),
            active_award_id: null,
          },
        ],
        count: 1,
        pending_count: 1,
        page: 1,
        limit: 25,
      },
    });

    render(<UserAwardsTab />);
    await waitFor(() =>
      expect(api.listCompletedCandidatesForAward).toHaveBeenCalledWith(1, expect.any(Object)),
    );

    const row = await screen.findByTestId("completed-candidate-row");
    expect(row).toBeInTheDocument();
    expect(row).toHaveTextContent("Aarav Sharma");
    expect(row).toHaveTextContent("9876543210");
    // Verify user_id is NOT displayed
    expect(row).not.toHaveTextContent("u123");

    // Quick add 24h
    fireEvent.click(screen.getByText("+24h"));
    // Enter 30%
    const pctInput = row.querySelector('input[type="number"]');
    fireEvent.change(pctInput, { target: { value: "30" } });

    // Click Grant Award
    fireEvent.click(screen.getByText("Grant Award"));
    await waitFor(() => expect(api.createUserAward).toHaveBeenCalled());
    const grantCall = api.createUserAward.mock.calls[0][0];
    expect(grantCall.user_id).toBe("u123");
    expect(grantCall.scholarship_pct).toBe(30);
    expect(grantCall.redemption_expires_at).toBeDefined();
  });
});

describe("TiersTab — global redemption window", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.listUserAwards).mockResolvedValue({ data: { awards: [], count: 0 } });
  });
  afterEach(() => { workspace.selectedExam = { test_id: 1 }; });

  test("shows a live hours-left chip for a future global window", async () => {
    workspace.selectedExam = {
      test_id: 1, results_visible: false,
      redemption_expires_at: new Date(Date.now() + 50 * 3600_000 + 30_000).toISOString(),
    };
    render(<TiersTab />);
    const chip = await screen.findByTestId("global-window-left");
    expect(chip).toHaveTextContent("2d 2h left");
  });

  test("expired global window shows Expired", async () => {
    workspace.selectedExam = {
      test_id: 1, results_visible: false,
      redemption_expires_at: new Date(Date.now() - 3600_000).toISOString(),
    };
    render(<TiersTab />);
    expect(await screen.findByTestId("global-window-left")).toHaveTextContent("Expired");
  });

  test("no chip when no global window is set", async () => {
    workspace.selectedExam = { test_id: 1, results_visible: false, redemption_expires_at: null };
    render(<TiersTab />);
    await screen.findByText("Global redemption window");
    expect(screen.queryByTestId("global-window-left")).not.toBeInTheDocument();
  });
});

describe("timeLeft helpers", () => {
  test("formatTimeLeft buckets", () => {
    expect(formatTimeLeft(null)).toBeNull();
    expect(formatTimeLeft(0)).toBe("Expired");
    expect(formatTimeLeft(9 * 60_000)).toBe("9m left");
    expect(formatTimeLeft(22 * 3600_000 + 10 * 60_000)).toBe("22h 10m left");
    expect(formatTimeLeft(50 * 3600_000)).toBe("2d 2h left");
  });

  test("timeLeftUntil counts from a deadline", () => {
    expect(timeLeftUntil(new Date(Date.now() + 3600_000 + 5_000).toISOString())).toBe("1h 0m left");
    expect(timeLeftUntil(new Date(Date.now() - 3600_000).toISOString())).toBe("Expired");
    expect(timeLeftUntil(null)).toBeNull();
  });
});

describe("ActivityLogTab", () => {
  beforeEach(() => vi.clearAllMocks());

  test("renders logs and filters", async () => {
    vi.mocked(api.getAuditLog).mockResolvedValue({
      data: {
        logs: [{ id: 1, actor_user_id: "admin1", actor_fullname: "Admin", actor_username: "admin", action: "tier_created", target_type: "tier", target_id: "5", created_at: new Date().toISOString() }],
        count: 1, page: 1, limit: 25
      }
    });
    render(<ActivityLogTab />);
    await waitFor(() => expect(api.getAuditLog).toHaveBeenCalled());
    const row = await screen.findByTestId("audit-row");
    expect(row).toBeInTheDocument();
    expect(row).toHaveTextContent("tier_created");
    // filter
    fireEvent.change(screen.getByTestId("audit-filter-action"), { target: { value: "tier_updated" } });
    fireEvent.click(screen.getByTestId("audit-filter-btn"));
    await waitFor(() => expect(api.getAuditLog.mock.calls.length).toBeGreaterThanOrEqual(2));
  });

  test("shows empty when no logs", async () => {
    vi.mocked(api.getAuditLog).mockResolvedValue({ data: { logs: [], count: 0, page: 1, limit: 25 } });
    render(<ActivityLogTab />);
    expect(await screen.findByTestId("audit-empty")).toBeInTheDocument();
  });

  test("renders the before → after diff the backend stores", async () => {
    vi.mocked(api.getAuditLog).mockResolvedValue({
      data: {
        logs: [{
          id: 2, actor_user_id: "admin1", action: "user_award_updated", target_type: "user_award", target_id: "3",
          created_at: new Date().toISOString(),
          before_json: { scholarship_pct: 20, reason: null },
          after_json: { scholarship_pct: 40, reason: "approved" },
        }],
        count: 1, page: 1, limit: 25,
      },
    });
    render(<ActivityLogTab />);
    const diff = await screen.findByTestId("audit-diff");
    expect(diff).toHaveTextContent("scholarship_pct");
    expect(diff).toHaveTextContent("20");
    expect(diff).toHaveTextContent("→ 40");
  });
});
