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
  getAccountProfiles: vi.fn(),
  listLibraryProfilesV2: vi.fn(),
  assignProfile: vi.fn(),
  getProfileRecruitmentStatus: vi.fn(),
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
    const button = await screen.findByRole("button", { name: /^Sub Accounts \(1\)$/i });
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

    const dropdownTrigger = screen.getByText("Select an account to attach...");
    fireEvent.click(dropdownTrigger);

    expect(screen.queryByRole("option", { name: /main@corp\.com/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("option", { name: /sub@corp\.com/ })).not.toBeInTheDocument();
    expect(screen.getByRole("option", { name: /other@corp\.com/ })).toBeInTheDocument();
  });

  test("attaching warns first and only calls the API after confirmation", async () => {
    await openModalForMain();

    const dropdownTrigger = screen.getByText("Select an account to attach...");
    fireEvent.click(dropdownTrigger);

    const option = screen.getByRole("option", { name: /other@corp\.com/ });
    fireEvent.click(option);

    fireEvent.click(screen.getByRole("button", { name: "Attach" }));

    // ConfirmationModal opens
    expect(screen.getByText(/will be removed/i)).toBeInTheDocument();
    expect(api.attachSubAccount).not.toHaveBeenCalled();

    // Confirm attachment
    fireEvent.click(screen.getByRole("button", { name: "Attach Account" }));
    await waitFor(() =>
      expect(api.attachSubAccount).toHaveBeenCalledWith(42, 50),
    );
  });

  test("detaching asks before unlinking the sub", async () => {
    api.detachSubAccount.mockResolvedValue({ data: {} });
    await openModalForMain();

    fireEvent.click(screen.getByRole("button", { name: "Detach" }));

    // Confirmation modal opens
    expect(screen.getByRole("heading", { name: "Detach Sub Account" })).toBeInTheDocument();
    expect(screen.getByText(/standalone/i)).toBeInTheDocument();

    // Confirm detachment (the modal has confirm button "Detach")
    const detachButtons = screen.getAllByRole("button", { name: "Detach" });
    fireEvent.click(detachButtons[detachButtons.length - 1]);

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
    api.reviewAccessRequest.mockResolvedValue({ data: { message: "ok" } });

    renderAt("/access-requests");
    await screen.findByText("a@x.com");

    // Click Approve -> ConfirmationModal opens
    fireEvent.click(screen.getByRole("button", { name: "Approve" }));
    expect(screen.getByRole("heading", { name: "Approve Access" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Approve Access" }));
    await waitFor(() =>
      expect(api.reviewAccessRequest).toHaveBeenCalledWith(1, {
        action: "approve",
      }),
    );

    // Click Decline -> ConfirmationModal with note input opens
    fireEvent.click(screen.getByRole("button", { name: "Decline" }));
    expect(screen.getByRole("heading", { name: "Decline Platform Access" })).toBeInTheDocument();

    const noteInput = screen.getByPlaceholderText(/e\.g\. Verification pending/i);
    fireEvent.change(noteInput, { target: { value: "Not a fit for current openings" } });

    fireEvent.click(screen.getByRole("button", { name: "Decline Access" }));
    await waitFor(() =>
      expect(api.reviewAccessRequest).toHaveBeenCalledWith(1, {
        action: "decline",
        note: "Not a fit for current openings",
      }),
    );
  });
});

describe("AccountProfilesPage (In-line candidate search)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.listAccounts.mockResolvedValue({ data: { data: [] } });
    api.getAccountProfiles.mockResolvedValue({
      data: {
        data: {
          assigned: [
            { id: "local:101", fullname: "Aarav Sharma", phone: "9876543210", source: "local", display_order: 1 },
          ],
          available: [],
        },
      },
    });
    api.getProfileRecruitmentStatus.mockResolvedValue({
      data: { data: { visibility: { is_enabled: true } } },
    });
    api.listLibraryProfilesV2.mockResolvedValue({
      data: {
        data: [
          { id: 202, profile_uid: "local:202", fullname: "Priya Patel", phone: "9988776655", qualification: "BSc Nursing" },
        ],
      },
    });
    api.assignProfile.mockResolvedValue({ data: { success: true } });
  });

  test("renders assigned candidates and assigns talent via in-line searchable dropdown", async () => {
    renderAt("/accounts/42/profiles");

    await screen.findByText("Aarav Sharma");
    expect(screen.getByText("Currently Assigned Candidates (1)")).toBeInTheDocument();

    // Open candidate dropdown
    const dropdownTrigger = screen.getByText("Choose candidate to assign...");
    fireEvent.click(dropdownTrigger);

    // In-line search is rendered inside the dropdown popover
    const searchInput = screen.getByPlaceholderText("Search candidate by name or phone...");
    expect(searchInput).toBeInTheDocument();

    // Select the candidate
    const candidateOption = await screen.findByRole("option", { name: /Priya Patel/ });
    fireEvent.click(candidateOption);

    // Assign button is enabled and called
    const assignButton = screen.getByRole("button", { name: "Assign Candidate" });
    fireEvent.click(assignButton);

    await waitFor(() =>
      expect(api.assignProfile).toHaveBeenCalledWith("42", 202, 0),
    );
  });

  test("highlights correct tab with blue active state across all routes", async () => {
    // 1. Library route
    const { unmount: unmount1 } = renderAt("/library");
    const libraryTab = screen.getByRole("link", { name: /Candidate Library/i });
    expect(libraryTab.className).toContain("bg-[#083262]");
    expect(libraryTab.className).toContain("text-white");
    unmount1();

    // 2. Access Requests route
    const { unmount: unmount2 } = renderAt("/access-requests");
    const reqTab = screen.getByRole("link", { name: /Access Requests/i });
    expect(reqTab.className).toContain("bg-[#083262]");
    unmount2();

    // 3. Jobs route
    const { unmount: unmount3 } = renderAt("/jobs");
    const jobsTab = screen.getByRole("link", { name: /Jobs Admin/i });
    expect(jobsTab.className).toContain("bg-[#083262]");
    unmount3();
  });
});
