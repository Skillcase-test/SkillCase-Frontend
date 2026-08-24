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
  getFieldOptions: vi.fn(),
  convertEuropassResume: vi.fn(),
  generateEuropassPdf: vi.fn(),
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
    api.listRecruiterLoginEvents.mockResolvedValue({
      data: {
        data: [
          {
            id: 99,
            account_id: 42,
            recruiter_email: "main@corp.com",
            source: "portal",
            country_name: "India",
            created_at: "2026-08-24T06:00:00.000Z",
          },
        ],
      },
    });
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

  test("fetches and renders scoped recruiter login audit log for the account", async () => {
    renderAt("/accounts/42/profiles");

    await screen.findByText("Recruiter Login Audit Log (1)");
    expect(api.listRecruiterLoginEvents).toHaveBeenCalledWith(
      expect.objectContaining({ accountId: "42" }),
    );
    expect(screen.getByText("India")).toBeInTheDocument();
  });
});

describe("AccountsPage (Hierarchy Tree UI)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.listAccounts.mockResolvedValue({ data: { data: ACCOUNTS } });
    api.listRecruiterLoginEvents.mockResolvedValue({ data: { data: [] } });
  });

  test("renders main accounts at top level and expands nested sub-accounts on toggle", async () => {
    renderAt("/");

    // Both main accounts appear at root level
    await screen.findByText("main@corp.com");
    expect(screen.getByText("other@corp.com")).toBeInTheDocument();

    // Sub-account badge is present on parent
    const badge = screen.getByText("1 sub-account");
    expect(badge).toBeInTheDocument();

    // Sub-account row is initially collapsed
    expect(screen.queryByText("Sub Account")).not.toBeInTheDocument();

    // Click to expand
    fireEvent.click(badge);
    expect(await screen.findByText("Sub Account")).toBeInTheDocument();
    expect(screen.getByText("Sub of main@corp.com")).toBeInTheDocument();
  });

  test("searching sub-account email displays parent and auto-expands the sub row", async () => {
    renderAt("/");

    await screen.findByText("main@corp.com");

    const searchInput = screen.getByPlaceholderText("Filter by account email...");
    fireEvent.change(searchInput, { target: { value: "sub@corp.com" } });

    // Parent is shown, other is filtered out
    expect(screen.getByText("main@corp.com")).toBeInTheDocument();
    expect(screen.queryByText("other@corp.com")).not.toBeInTheDocument();

    // Nested sub-account row is auto-expanded
    expect(screen.getByText("Sub Account")).toBeInTheDocument();
  });
});

describe("EuropassGenerator (ProfileFormPage)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.getFieldOptions.mockResolvedValue({
      data: {
        data: { qualification: [], experience: [], specialization: [] },
      },
    });
    api.convertEuropassResume.mockResolvedValue({
      data: {
        data: {
          personalInfo: {
            fullName: "AARAV SHARMA",
            email: "aarav@gmail.com",
            phone: "+91 9876543210",
            address: "DELHI, INDIA",
          },
          education: [
            {
              id: "edu-1",
              degree: "BSC NURSING",
              institution: "MANIPAL",
              period: "2018 - 2022",
              location: "DELHI, INDIA",
              eqfLevel: "6",
            },
          ],
          experience: [
            {
              id: "exp-1",
              position: "ICU NURSE",
              employer: "APOLLO",
              period: "2022 - CURRENT",
              location: "DELHI, INDIA",
              responsibilities: ["Patient critical care"],
            },
          ],
          skills: ["Patient Care", "Ventilator Management", "Communication"],
          languageSkills: {
            motherTongues: ["HINDI", "ENGLISH"],
            otherLanguages: [
              {
                id: "lang-1",
                language: "GERMAN",
                listening: "B2",
                reading: "B2",
                spokenProduction: "B2",
                spokenInteraction: "B2",
                writing: "B2",
              },
            ],
          },
        },
      },
    });
    api.generateEuropassPdf.mockResolvedValue({
      data: new Uint8Array([37, 80, 68, 70]), // %PDF dummy
    });
  });

  test("opens Europass modal from candidate form and triggers AI Progress template conversion", async () => {
    renderAt("/profiles/new");

    // "1-Click Europass Generator" button is rendered in Verification Documents section
    const europassBtn = await screen.findByRole("button", {
      name: /1-Click Europass Generator/i,
    });
    expect(europassBtn).toBeInTheDocument();

    // Open modal
    fireEvent.click(europassBtn);
    expect(
      screen.getByRole("heading", { name: /1-Click Europass/i }),
    ).toBeInTheDocument();
    expect(screen.getByText("Progress Template")).toBeInTheDocument();

    // Trigger AI conversion
    const convertBtn = screen.getByRole("button", { name: /Convert via AI/i });
    fireEvent.click(convertBtn);

    await waitFor(() =>
      expect(api.convertEuropassResume).toHaveBeenCalled(),
    );

    // Verify Progress template UI elements render
    expect(screen.getByText(/aarav sharma/i)).toBeInTheDocument();
    expect(screen.getByText("BSC NURSING")).toBeInTheDocument();
    expect(screen.getByText("ICU NURSE")).toBeInTheDocument();
    expect(screen.getByText(/Understanding/i)).toBeInTheDocument();
    expect(screen.getByText(/Speaking/i)).toBeInTheDocument();
    expect(screen.getByText(/Writing/i)).toBeInTheDocument();
    expect(screen.getByText("GERMAN")).toBeInTheDocument();

    // Click "Attach to Candidate Profile"
    const attachBtn = screen.getByRole("button", {
      name: /Attach to Candidate Profile/i,
    });
    fireEvent.click(attachBtn);

    await waitFor(() =>
      expect(api.generateEuropassPdf).toHaveBeenCalled(),
    );
  });

  test("blocks conversion when Upload New PDF is selected but no file chosen", async () => {
    renderAt("/profiles/new");

    const europassBtn = await screen.findByRole("button", {
      name: /1-Click Europass Generator/i,
    });
    fireEvent.click(europassBtn);

    // Switch to the "Upload New PDF" source without choosing a file
    fireEvent.click(screen.getByRole("button", { name: /Upload New PDF/i }));

    fireEvent.click(screen.getByRole("button", { name: /Convert via AI/i }));

    // Give any accidental call a chance to flush
    await new Promise((r) => setTimeout(r, 50));
    expect(api.convertEuropassResume).not.toHaveBeenCalled();
  });
});

