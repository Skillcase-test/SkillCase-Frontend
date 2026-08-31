import { describe, test, expect, beforeEach, vi } from "vitest";
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
}));

vi.mock("../dashboard-src/pages/exam/scholarship/index", () => ({
  useScholarshipWorkspace: () => ({ selectedExam: { test_id: 1 } }),
}));

import * as api from "../api/scholarshipExamApi";
import UserAwardsTab from "../dashboard-src/pages/exam/scholarship/UserAwardsTab";
import ActivityLogTab from "../dashboard-src/pages/exam/scholarship/ActivityLogTab";

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
