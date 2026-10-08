import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

import IrelandJobsAdmin from "../pages/admin/IrelandJobsAdmin";

vi.mock("react-hot-toast", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
  default: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("../api/irelandJobsAdminApi", () => ({
  adminGetIrelandCandidates: vi.fn(),
  adminGetIrelandCandidateDetail: vi.fn(),
  adminUpdateIrelandCandidate: vi.fn(),
  adminReviewIrelandResume: vi.fn(),
  adminReviewIrelandDocument: vi.fn(),
  adminGetIrelandDocRequirements: vi.fn(),
  adminAddIrelandDocRequirement: vi.fn(),
  adminDeleteIrelandDocRequirement: vi.fn(),
  adminEnrollIrelandCandidate: vi.fn(),
  adminSetIrelandActive: vi.fn(),
}));

import * as api from "../api/irelandJobsAdminApi";

const detailPayload = {
  success: true,
  data: {
    steps: [
      { id: "welcome", title: "Welcome", status: "completed" },
      { id: "resume_profile", title: "Resume & Profile", status: "pending" },
      { id: "documents", title: "Documents", status: "locked" },
      { id: "role_select", title: "Choose Your Path", status: "locked" },
      { id: "matching", title: "Opportunity Matching", status: "locked" },
    ],
    currentStepId: "resume_profile",
    stepTimestamps: {},
    qualification: "Bsc Nursing",
    profileFields: { experience_years: 3, dob: "1998-01-01" },
    profileFieldsMeta: {},
    requiredDocuments: [
      { id: "ielts", label: "IELTS Certificate", fixed: true },
      { id: "passport", label: "Passport copy", fixed: false },
    ],
    resume: {
      uploaded: true,
      filename: "resume.pdf",
      downloadUrl: "https://example.com/resume.pdf",
      status: "pending",
      rejectionReason: null,
    },
    documents: {
      ielts: { answer: "preparing", status: null },
    },
    ielts: { status: null, filename: null, downloadUrl: null },
    ieltsInterestAt: null,
    role: null,
    isActive: true,
    user: {
      user_id: 42,
      fullname: "Mary Nurse",
      username: "mary",
      number: "9876543210",
      email: "mary@example.com",
    },
  },
};

function mockList() {
  api.adminGetIrelandCandidates.mockResolvedValue({
    data: {
      success: true,
      data: {
        candidates: [
          {
            user_id: 42,
            fullname: "Mary Nurse",
            number: "9876543210",
            qualification: "Bsc Nursing",
            steps_completed: 1,
            steps_total: 5,
            is_active: true,
            resume_status: "pending",
            needs_review: true,
          },
        ],
        total: 1,
      },
    },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockList();
  api.adminGetIrelandCandidateDetail.mockResolvedValue({ data: detailPayload });
  api.adminReviewIrelandResume.mockResolvedValue({ data: { success: true } });
  api.adminGetIrelandDocRequirements.mockResolvedValue({
    data: { success: true, data: { documents: [] } },
  });
});

describe("IrelandJobsAdmin", () => {
  test("renders the tab strip and candidate list", async () => {
    render(<IrelandJobsAdmin canEdit />);

    await waitFor(() =>
      expect(screen.getByText("Mary Nurse")).toBeInTheDocument(),
    );
    expect(screen.getByText("Ireland Jobs Admin")).toBeInTheDocument();
    expect(screen.getByText("Candidates List")).toBeInTheDocument();
    expect(screen.getByText("Doc Requirements")).toBeInTheDocument();
    // Enrollment moved to Analytics → View All Users (track dropdown).
    expect(screen.queryByText("Enroll Candidate")).not.toBeInTheDocument();
  });

  test("view-only admins see the View Only badge", async () => {
    render(<IrelandJobsAdmin canEdit={false} />);

    await waitFor(() =>
      expect(screen.getByText("Mary Nurse")).toBeInTheDocument(),
    );
    expect(screen.getAllByText("View Only").length).toBeGreaterThan(0);
  });

  test("candidate click opens German-style detail shell with timeline", async () => {
    render(<IrelandJobsAdmin canEdit />);
    await waitFor(() => screen.getByText("Mary Nurse"));

    fireEvent.click(screen.getByText("Mary Nurse"));

    await waitFor(() =>
      expect(screen.getByText("Candidate Pipeline Details")).toBeInTheDocument(),
    );
    expect(screen.getByText("Back to Candidates")).toBeInTheDocument();
    expect(screen.getByText("Pipeline Steps Timeline")).toBeInTheDocument();
    expect(screen.getByText("Resume & Profile")).toBeInTheDocument();
    expect(screen.getByText("Documents")).toBeInTheDocument();
    expect(screen.getByText("Opportunity Matching")).toBeInTheDocument();
    expect(api.adminGetIrelandCandidateDetail).toHaveBeenCalledWith(42);
  });

  test("resume approve fires the review API from the timeline node", async () => {
    render(<IrelandJobsAdmin canEdit />);
    await waitFor(() => screen.getByText("Mary Nurse"));
    fireEvent.click(screen.getByText("Mary Nurse"));
    await waitFor(() => screen.getByText("Verify Profile & Resume"));

    const approveButtons = screen.getAllByRole("button", {
      name: "Approve",
    });
    fireEvent.click(approveButtons[0]);

    await waitFor(() =>
      expect(api.adminReviewIrelandResume).toHaveBeenCalledWith(
        42,
        "approved",
      ),
    );
  });

  test("back button returns to the candidates list", async () => {
    render(<IrelandJobsAdmin canEdit />);
    await waitFor(() => screen.getByText("Mary Nurse"));
    fireEvent.click(screen.getByText("Mary Nurse"));
    await waitFor(() => screen.getByText("Back to Candidates"));

    fireEvent.click(screen.getByText("Back to Candidates"));

    await waitFor(() =>
      expect(screen.getByText("Candidates List")).toBeInTheDocument(),
    );
    expect(
      screen.queryByText("Candidate Pipeline Details"),
    ).not.toBeInTheDocument();
  });
});
