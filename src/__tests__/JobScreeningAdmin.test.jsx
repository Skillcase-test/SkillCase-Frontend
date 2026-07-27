import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

import JobScreeningAdmin from "../pages/admin/JobScreeningAdmin";

vi.mock("react-hot-toast", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
  default: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("../api/jobScreeningAdminApi", () => ({
  adminGetCandidates: vi.fn(),
  adminGetCandidateDetail: vi.fn(),
  adminUpdateCandidate: vi.fn(),
  adminReviewAdditionalDoc: vi.fn(),
  adminUploadOfferLetter: vi.fn(),
  getAdminDropdownOptions: vi.fn(),
  adminGetSettings: vi.fn(),
  adminUpdateSettings: vi.fn(),
  adminUploadTrainingScheduleImage: vi.fn(),
  adminUploadRecruiterScheduleImage: vi.fn(),
}));

import * as jobScreeningAdminApi from "../api/jobScreeningAdminApi";

function mockHappyApiResponses() {
  jobScreeningAdminApi.adminGetCandidates.mockResolvedValue({
    data: {
      success: true,
      data: [],
      summary: {
        total_users: 0,
        initiated: 0,
        profile_updated: 0,
        interview_completed: 0,
        actions_pending: 0,
        active_candidates: 0,
        inactive_candidates: 0,
      },
      pagination: { totalPages: 1 },
    },
  });
  jobScreeningAdminApi.getAdminDropdownOptions.mockResolvedValue({
    data: { success: true, interviews: [], agreements: [], recruiters: [] },
  });
  jobScreeningAdminApi.adminGetSettings.mockResolvedValue({
    data: {
      success: true,
      data: {
        default_interview_id: "",
        default_agreement_template_id: "",
        required_additional_documents: [],
        default_recruiter_id: "",
        default_job_title: "",
        default_job_location: "",
        default_job_salary_range: "",
        default_job_type: "",
        default_job_description: "",
        steps_config: [],
        paywall_enabled: false,
      },
    },
  });
}

describe("JobScreeningAdmin — read-only enforcement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHappyApiResponses();
  });

  test("view-only admin cannot trigger the global settings update", async () => {
    render(<JobScreeningAdmin canEdit={false} />);

    // Wait for initial data load, then switch to the Global Settings tab.
    const settingsTabButton = await screen.findByRole("button", {
      name: "Global Settings",
    });
    fireEvent.click(settingsTabButton);

    const saveButton = await screen.findByRole("button", {
      name: "Save Global Defaults",
    });

    expect(saveButton).toBeDisabled();
    expect(screen.getAllByText("View Only").length).toBeGreaterThan(0);

    // jsdom (like real browsers) refuses to dispatch click on a disabled
    // button at all, so this click is a no-op — which is exactly the point:
    // the UI-level disabling alone is enough to block the mutation.
    fireEvent.click(saveButton);

    expect(jobScreeningAdminApi.adminUpdateSettings).not.toHaveBeenCalled();
  });

  test("editor admin CAN trigger the global settings update", async () => {
    jobScreeningAdminApi.adminUpdateSettings.mockResolvedValue({
      data: { success: true, data: {} },
    });
    render(<JobScreeningAdmin canEdit={true} />);

    const settingsTabButton = await screen.findByRole("button", {
      name: "Global Settings",
    });
    fireEvent.click(settingsTabButton);

    const saveButton = await screen.findByRole("button", {
      name: "Save Global Defaults",
    });

    expect(saveButton).not.toBeDisabled();
    expect(screen.queryByText("View Only")).not.toBeInTheDocument();

    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(jobScreeningAdminApi.adminUpdateSettings).toHaveBeenCalledTimes(1);
    });
  });

  test("view-only admin cannot drive candidate-level updates either", async () => {
    jobScreeningAdminApi.adminGetCandidates.mockResolvedValue({
      data: {
        success: true,
        data: [
          {
            user_id: "candidate-1",
            fullname: "Jane Candidate",
            email: "jane@example.com",
            current_step_id: "profile_completion",
            steps_config: [],
          },
        ],
        summary: {},
        pagination: { totalPages: 1 },
      },
    });
    jobScreeningAdminApi.adminGetCandidateDetail.mockResolvedValue({
      data: {
        success: true,
        data: {
          user_id: "candidate-1",
          fullname: "Jane Candidate",
          email: "jane@example.com",
          steps_config: [],
        },
      },
    });

    render(<JobScreeningAdmin canEdit={false} />);

    const candidateButton = await screen.findByRole("button", {
      name: /Jane Candidate/i,
    });
    fireEvent.click(candidateButton);

    // The detail pane should be reachable (view access), but its edit fieldset disabled.
    await screen.findByText("Candidate Pipeline Details");
    expect(screen.getAllByText("View Only").length).toBeGreaterThan(0);

    const nameInput = await screen.findByDisplayValue("Jane Candidate");
    expect(nameInput).toBeDisabled();
  });
});
