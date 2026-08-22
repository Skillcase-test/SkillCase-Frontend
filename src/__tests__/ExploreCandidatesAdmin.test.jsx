/**
 * Admin-side coverage for the recruiter-platform features:
 *  - SubAccountsModal: per-parent scoping, attach eligibility, confirm-guarded
 *    attach/detach calls
 *  - AccessRequestsPage: status counts, approve (confirm) and decline (prompt note)
 */
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, test, expect, vi, beforeEach } from "vitest";

const api = vi.hoisted(() => ({
  listAccounts: vi.fn(),
  updateAccountSettings: vi.fn(),
  createSubAccount: vi.fn(),
  attachSubAccount: vi.fn(),
  detachSubAccount: vi.fn(),
  deleteAccount: vi.fn(),
  listAccessRequests: vi.fn(),
  reviewAccessRequest: vi.fn(),
  listRecruiterLoginEvents: vi.fn(),
}));

vi.mock("../api/exploreCandidatesAdminApi", () => ({
  exploreCandidatesAdminApi: api,
}));

import ExploreCandidatesAdmin from "../dashboard-src/pages/ExploreCandidatesAdmin";

const ACCOUNTS = [
  { id: 42, email: "main@corp.com", parent_account_id: null, parent_email: null, total_profiles: 3, total_sub_accounts: 1, status: 1 },
  { id: 77, email: "sub@corp.com", parent_account_id: 42, parent_email: "main@corp.com", total_profiles: 0, total_sub_accounts: 0, status: 1 },
  { id: 50, email: "other@corp.com", parent_account_id: null, parent_email: null, total_profiles: 1, total_sub_accounts: 0, status: 1 },
];

// The page owns its internal <Routes> relative to wherever the Dashboard mounts it,
// so test URLs are section-relative ("/", "/access-requests").
function renderAt(path = "/") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <ExploreCandidatesAdmin />
    </MemoryRouter>,
  );
}

describe("SubAccountsModal (via AccountsPage)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.listAccounts.mockResolvedValue({ data: { data: ACCOUNTS } });
    api.listRecruiterLoginEvents.mockResolvedValue({ data: { data: [] } });
  });

  async function openModalForMain() {
    renderAt();
    const button = await screen.findByText(/^Sub Accounts \(1\)$/i);
    fireEvent.click(button);
    await screen.findByText("Current Sub Accounts (1)");
  }

  test("shows only that parent's sub accounts", async () => {
    await openModalForMain();

    // The sub appears in both the modal and the background table.
    expect(screen.getAllByText("sub@corp.com").length).toBeGreaterThan(0);

    // Scope to the "Current Sub Accounts" section only -- the attach dropdown
    // below it legitimately lists other accounts as candidates.
    const section = screen
      .getByText("Current Sub Accounts (1)")
      .closest("div.space-y-3");
    expect(section.textContent).toContain("sub@corp.com");
    expect(section.textContent).not.toContain("other@corp.com");
  });

  test("attach picker excludes the parent itself and its existing subs", async () => {
    await openModalForMain();

    const options = Array.from(document.querySelectorAll("select option")).map(
      (o) => o.textContent,
    );
    expect(options.some((t) => t?.includes("main@corp.com"))).toBe(false);
    expect(options.some((t) => t?.includes("sub@corp.com"))).toBe(false);
    expect(options.some((t) => t?.includes("other@corp.com"))).toBe(true);
  });

  test("attaching warns first and only calls the API after confirmation", async () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);
    await openModalForMain();

    const select = document.querySelector("select");
    fireEvent.change(select, { target: { value: "50" } });
    fireEvent.click(screen.getByText("Attach"));

    // The warning names the data loss explicitly.
    expect(confirmSpy).toHaveBeenCalledWith(
      expect.stringContaining("will be removed"),
    );
    expect(api.attachSubAccount).not.toHaveBeenCalled();

    confirmSpy.mockReturnValueOnce(true);
    fireEvent.click(screen.getByText("Attach"));
    await waitFor(() =>
      expect(api.attachSubAccount).toHaveBeenCalledWith(42, 50),
    );
  });

  test("detaching asks before unlinking the sub", async () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValueOnce(true);
    api.detachSubAccount.mockResolvedValue({ data: {} });
    await openModalForMain();

    fireEvent.click(screen.getByText("Detach"));

    expect(confirmSpy).toHaveBeenCalledWith(
      expect.stringContaining("standalone"),
    );
    await waitFor(() =>
      expect(api.detachSubAccount).toHaveBeenCalledWith(42, 77),
    );
  });
});

describe("AccessRequestsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.listAccounts.mockResolvedValue({ data: { data: [] } });
    api.listRecruiterLoginEvents.mockResolvedValue({ data: { data: [] } });
    api.listAccessRequests.mockResolvedValue({
      data: {
        data: [
          { id: 1, email: "a@x.com", status: "pending", request_count: 2, reviewed_by: null },
          { id: 2, email: "b@x.com", status: "approved", request_count: 1, reviewed_by: "Adil Khan" },
        ],
        counts: { pending: 1, approved: 1, declined: 0 },
      },
    });
  });

  test("renders requests with live status counts", async () => {
    renderAt("/access-requests");

    await screen.findByText("a@x.com");
    expect(screen.getByText("b@x.com")).toBeInTheDocument();
    expect(screen.getByText(/Pending/)).toBeInTheDocument();
    expect(screen.getByText(/Adil Khan/)).toBeInTheDocument();
  });

  test("approve goes through only after confirmation, decline captures the note", async () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValueOnce(true);
    const promptSpy = vi
      .spyOn(window, "prompt")
      .mockReturnValueOnce("Not a fit for current openings");
    api.reviewAccessRequest.mockResolvedValue({ data: { message: "ok" } });

    renderAt("/access-requests");
    await screen.findByText("a@x.com");

    fireEvent.click(screen.getByText("Approve"));
    await waitFor(() =>
      expect(api.reviewAccessRequest).toHaveBeenCalledWith(1, {
        action: "approve",
        note: null,
      }),
    );

    fireEvent.click(screen.getByText("Decline"));
    await waitFor(() =>
      expect(api.reviewAccessRequest).toHaveBeenCalledWith(1, {
        action: "decline",
        note: "Not a fit for current openings",
      }),
    );
    expect(confirmSpy).toHaveBeenCalled();
    expect(promptSpy).toHaveBeenCalled();
  });
});
