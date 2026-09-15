import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

const apiMock = vi.hoisted(() => ({
  listMyReviewAssignments: vi.fn(),
  listAssignableAdmins: vi.fn(),
  assignForReview: vi.fn(),
  unassignReview: vi.fn(),
}));

vi.mock("../api/skillcaseInterviewToolsApi", () => ({
  skillcaseInterviewToolsApi: apiMock,
}));

vi.mock("react-redux", () => ({ useSelector: () => null }));

vi.mock("../api/adminAccessApi", () => ({
  adminAccessApi: { getMyAccess: vi.fn().mockResolvedValue({ data: null }) },
}));

import { AdminAccessContext } from "../utils/adminPermissions";
import SkillcaseInterviewNavTabs from "../pages/interviewTools/shared/SkillcaseInterviewNavTabs";
import SkillcaseReviewAssignmentsPage from "../pages/interviewTools/SkillcaseReviewAssignmentsPage";
import { SendForReviewModal } from "../pages/interviewTools/SkillcaseInterviewToolsCandidatePage";

const CANDIDATE = {
  submission_id: 9,
  candidate_name: "Jane Doe",
};

const REVIEWER_ME = {
  role: "admin",
  permissions: { skillcase_interviews: ["reviewer"] },
};
const EDITOR_ME = {
  role: "admin",
  permissions: { skillcase_interviews: ["view", "edit"] },
};
const SUPER_ME = { role: "super_admin", permissions: {} };

function renderTabs(me, props = {}) {
  return render(
    <AdminAccessContext.Provider value={me}>
      <SkillcaseInterviewNavTabs
        active="positions"
        setActivePage={vi.fn()}
        {...props}
      />
    </AdminAccessContext.Provider>,
  );
}

describe("SkillcaseInterviewNavTabs", () => {
  beforeEach(() => vi.clearAllMocks());

  test("shows a pending count badge on the Reviews tab", async () => {
    apiMock.listMyReviewAssignments.mockResolvedValue({
      data: { data: [{}, {}], pending_count: 2 },
    });
    renderTabs(REVIEWER_ME);
    expect(await screen.findByText("2")).toBeInTheDocument();
  });

  test("no badge when nothing is pending", async () => {
    apiMock.listMyReviewAssignments.mockResolvedValue({
      data: { data: [], pending_count: 0 },
    });
    renderTabs(REVIEWER_ME);
    await waitFor(() =>
      expect(apiMock.listMyReviewAssignments).toHaveBeenCalled(),
    );
    expect(screen.queryByText(/\d+/)).toBeNull();
  });

  test("navigates to the reviews page", async () => {
    apiMock.listMyReviewAssignments.mockResolvedValue({
      data: { data: [], pending_count: 0 },
    });
    const setActivePage = vi.fn();
    renderTabs(REVIEWER_ME, { setActivePage });
    fireEvent.click(screen.getByText("Reviews"));
    expect(setActivePage).toHaveBeenCalledWith("interview-tools-reviews");
  });

  test("reviewer-only admin sees Reviews but not Positions", () => {
    renderTabs(REVIEWER_ME);
    expect(screen.getByText("Reviews")).toBeInTheDocument();
    expect(screen.queryByText("Positions")).toBeNull();
  });

  test("view+edit admin sees Positions but not Reviews", () => {
    renderTabs(EDITOR_ME);
    expect(screen.getByText("Positions")).toBeInTheDocument();
    expect(screen.queryByText("Reviews")).toBeNull();
    expect(apiMock.listMyReviewAssignments).not.toHaveBeenCalled();
  });

  test("super admin sees both tabs", () => {
    apiMock.listMyReviewAssignments.mockResolvedValue({
      data: { data: [], pending_count: 0 },
    });
    renderTabs(SUPER_ME);
    expect(screen.getByText("Positions")).toBeInTheDocument();
    expect(screen.getByText("Reviews")).toBeInTheDocument();
  });

  test("swallows a failed pending-count fetch", async () => {
    apiMock.listMyReviewAssignments.mockRejectedValue(new Error("403"));
    renderTabs(REVIEWER_ME);
    await waitFor(() =>
      expect(apiMock.listMyReviewAssignments).toHaveBeenCalled(),
    );
    expect(screen.getByText("Reviews")).toBeInTheDocument();
  });
});

describe("SkillcaseReviewAssignmentsPage", () => {
  beforeEach(() => vi.clearAllMocks());

  const item = {
    assignment_id: 1,
    position_id: 5,
    submission_id: 9,
    candidate_name: "Jane Doe",
    candidate_email: "jane@x.com",
    position_title: "Frontend Interview",
    position_role: "Engineer",
    submission_status: "completed",
    assigned_by_name: "Boss",
    assigned_at: "2024-06-01T10:00:00Z",
    note: "Please check",
  };

  function renderQueue() {
    return render(
      <AdminAccessContext.Provider value={REVIEWER_ME}>
        <SkillcaseReviewAssignmentsPage setActivePage={queueNavigate} />
      </AdminAccessContext.Provider>,
    );
  }

  const queueNavigate = vi.fn();

  test("renders the assigned queue and opens the review page", async () => {
    apiMock.listMyReviewAssignments.mockResolvedValue({
      data: { data: [item], pending_count: 1 },
    });
    const setActivePage = vi.fn();
    render(
      <AdminAccessContext.Provider value={REVIEWER_ME}>
        <SkillcaseReviewAssignmentsPage setActivePage={setActivePage} />
      </AdminAccessContext.Provider>,
    );

    expect(await screen.findByText("Jane Doe")).toBeInTheDocument();
    expect(screen.getByText("Frontend Interview")).toBeInTheDocument();
    expect(screen.getByText("Boss")).toBeInTheDocument();
    expect(screen.getByText("Please check")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Review"));
    expect(setActivePage).toHaveBeenCalledWith("interview-tools-review", {
      positionId: 5,
      submissionId: 9,
      from: "reviews",
    });
  });

  test("shows an empty state when nothing is assigned", async () => {
    apiMock.listMyReviewAssignments.mockResolvedValue({
      data: { data: [], pending_count: 0 },
    });
    renderQueue();
    expect(
      await screen.findByText("No pending reviews assigned to you."),
    ).toBeInTheDocument();
  });

  test("shows an error banner when the fetch fails", async () => {
    apiMock.listMyReviewAssignments.mockRejectedValue(new Error("boom"));
    renderQueue();
    expect(
      await screen.findByText("Could not fetch assigned reviews"),
    ).toBeInTheDocument();
  });
});

describe("SendForReviewModal", () => {
  beforeEach(() => vi.clearAllMocks());

  const admins = [
    { user_id: "a1", fullname: "Admin One", email: "a1@x.com", role: "admin" },
    { user_id: "a2", fullname: "Admin Two", email: "a2@x.com", role: "admin" },
  ];

  test("loads admins and submits the selected reviewer", async () => {
    apiMock.listAssignableAdmins.mockResolvedValue({ data: { data: admins } });
    apiMock.assignForReview.mockResolvedValue({});
    const onDone = vi.fn();
    const onClose = vi.fn();

    render(
      <SendForReviewModal
        positionId={5}
        candidate={CANDIDATE}
        onClose={onClose}
        onDone={onDone}
      />,
    );

    expect(await screen.findByText("Admin One")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Admin One"));
    fireEvent.click(screen.getByText("Send for review"));

    await waitFor(() => expect(onDone).toHaveBeenCalled());
    expect(apiMock.assignForReview).toHaveBeenCalledWith(5, 9, {
      reviewer_user_id: "a1",
      note: "",
    });
    expect(onClose).toHaveBeenCalled();
  });

  test("search filters the reviewer list and shows a no-match state", async () => {
    apiMock.listAssignableAdmins.mockResolvedValue({ data: { data: admins } });
    render(
      <SendForReviewModal
        positionId={5}
        candidate={CANDIDATE}
        onClose={vi.fn()}
        onDone={vi.fn()}
      />,
    );

    expect(await screen.findByText("Admin One")).toBeInTheDocument();
    fireEvent.change(
      screen.getByPlaceholderText("Search reviewers by name or email…"),
      { target: { value: "two" } },
    );
    expect(screen.queryByText("Admin One")).toBeNull();
    expect(screen.getByText("Admin Two")).toBeInTheDocument();

    fireEvent.change(
      screen.getByPlaceholderText("Search reviewers by name or email…"),
      { target: { value: "nobody" } },
    );
    expect(screen.getByText(/No reviewers match/)).toBeInTheDocument();
  });

  test("locks assignment actions while a reviewer is live on the submission", async () => {
    apiMock.listAssignableAdmins.mockResolvedValue({ data: { data: admins } });
    render(
      <SendForReviewModal
        positionId={5}
        candidate={{
          ...CANDIDATE,
          active_assignment_id: 7,
          assigned_reviewer_name: "Admin One",
          reviewing_now_name: "Admin One",
        }}
        onClose={vi.fn()}
        onDone={vi.fn()}
      />,
    );

    expect(
      await screen.findByText(/currently reviewing this submission/),
    ).toBeInTheDocument();
    expect(screen.getByText("Return to owner")).toBeDisabled();
    fireEvent.click(screen.getByText("Admin Two"));
    expect(screen.getByText("Send for review")).toBeDisabled();
  });

  test("clicking the selected reviewer again deselects them", async () => {
    apiMock.listAssignableAdmins.mockResolvedValue({ data: { data: admins } });
    render(
      <SendForReviewModal
        positionId={5}
        candidate={CANDIDATE}
        onClose={vi.fn()}
        onDone={vi.fn()}
      />,
    );

    const row = await screen.findByText("Admin One");
    fireEvent.click(row);
    expect(screen.getByText("Send for review")).not.toBeDisabled();
    fireEvent.click(row);
    expect(screen.getByText("Send for review")).toBeDisabled();
  });

  test("submit is disabled until a reviewer is selected", async () => {
    apiMock.listAssignableAdmins.mockResolvedValue({ data: { data: admins } });
    render(
      <SendForReviewModal
        positionId={5}
        candidate={CANDIDATE}
        onClose={vi.fn()}
        onDone={vi.fn()}
      />,
    );
    const button = await screen.findByText("Send for review");
    expect(button).toBeDisabled();
    fireEvent.click(screen.getByText("Admin Two"));
    expect(button).not.toBeDisabled();
  });

  test("shows current assignee and a remove action when already assigned", async () => {
    apiMock.listAssignableAdmins.mockResolvedValue({ data: { data: admins } });
    apiMock.unassignReview.mockResolvedValue({});
    const onDone = vi.fn();
    const onClose = vi.fn();

    render(
      <SendForReviewModal
        positionId={5}
        candidate={{
          ...CANDIDATE,
          active_assignment_id: 7,
          assigned_reviewer_name: "Admin One",
        }}
        onClose={onClose}
        onDone={onDone}
      />,
    );

    expect(
      await screen.findByText("hidden from the position owner", { exact: false }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByText("Return to owner"));

    await waitFor(() =>
      expect(apiMock.unassignReview).toHaveBeenCalledWith(5, 9),
    );
    expect(onDone).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  test("surfaces backend errors and keeps the modal open", async () => {
    apiMock.listAssignableAdmins.mockResolvedValue({ data: { data: admins } });
    apiMock.assignForReview.mockRejectedValue({
      response: { data: { message: "nope" } },
    });
    const onClose = vi.fn();

    render(
      <SendForReviewModal
        positionId={5}
        candidate={CANDIDATE}
        onClose={onClose}
        onDone={vi.fn()}
      />,
    );

    fireEvent.click(await screen.findByText("Admin One"));
    fireEvent.click(screen.getByText("Send for review"));

    expect(await screen.findByText("nope")).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });
});
