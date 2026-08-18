import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

import CandidateDetail from "../pages/admin/components/CandidateDetail";
import ProfileCompletionStep from "../pages/jobScreening/components/ProfileCompletionStep";
import InterviewStep from "../pages/jobScreening/components/InterviewStep";
import RegistrationStep from "../pages/jobScreening/components/RegistrationStep";
import ReviewPendingStep from "../pages/jobScreening/components/ReviewPendingStep";
import AdditionalDocumentsStep from "../pages/jobScreening/components/AdditionalDocumentsStep";
import MeetingStep from "../pages/jobScreening/components/MeetingStep";
import WelcomeStep from "../pages/jobScreening/components/WelcomeStep";
import * as jobScreeningApi from "../api/jobScreeningApi";

vi.mock("../api/jobScreeningApi", () => ({
  getProgress: vi.fn().mockResolvedValue({ data: { success: true, data: {} } }),
  completeWelcome: vi.fn().mockResolvedValue({ data: { success: true, data: {} } }),
  uploadProfileDocs: vi.fn().mockResolvedValue({ data: { success: true } }),
  checkInterview: vi.fn().mockResolvedValue({ data: { success: true } }),
  checkAgreement: vi.fn().mockResolvedValue({ data: { success: true } }),
  startAgreement: vi.fn().mockResolvedValue({ data: { success: true } }),
  downloadOfferLetter: vi.fn().mockResolvedValue({ data: { success: true } }),
  uploadAdditionalDoc: vi.fn().mockResolvedValue({ data: { success: true } }),
  deleteAdditionalDoc: vi.fn().mockResolvedValue({ data: { success: true } }),
  refreshAdditionalDocs: vi.fn().mockResolvedValue({ data: { success: true } }),
  markAdditionalDocViewed: vi.fn().mockResolvedValue({ data: { success: true } }),
  markProfileRejectionViewed: vi.fn().mockResolvedValue({ data: { success: true } }),
  markInterviewRejectionViewed: vi.fn().mockResolvedValue({ data: { success: true } }),
  markRecruiterRejectionViewed: vi.fn().mockResolvedValue({ data: { success: true } }),
  markStepNoteViewed: vi.fn().mockResolvedValue({ data: { success: true } }),
  skipRecruiterStatus: vi.fn().mockResolvedValue({ data: { success: true } }),
}));

vi.mock("react-router-dom", () => ({
  useNavigate: () => vi.fn(),
}));

describe("Job Screening Universal Step Notes Frontend Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Admin CandidateDetail Step Notes Management", () => {
    const mockCandidate = {
      user_id: "cand-123",
      fullname: "John Candidate",
      email: "john@example.com",
      number: "9876543210",
      current_step_id: "interview_attempt",
      steps_config: [
        { id: "welcome", title: "Welcome Checkpoint", status: "completed" },
        { id: "profile_completion", title: "Profile Verification", status: "completed" },
        { id: "interview_attempt", title: "Video Interview", status: "pending" },
      ],
      step_timestamps: {},
      step_notes: {
        profile_completion: {
          message: "Please re-scan your language cert in high quality.",
          created_by: { name: "Lead Reviewer" },
          updated_at: "2026-08-18T10:00:00.000Z",
          viewed_at: null,
        },
      },
    };

    test("renders existing note with Unseen badge and + Add Note buttons for steps without note", () => {
      render(
        <CandidateDetail
          candidate={mockCandidate}
          onUpdate={vi.fn()}
          onClose={vi.fn()}
          options={{ interviews: [], agreements: [], recruiters: [] }}
        />,
      );

      // Existing note on profile_completion
      expect(screen.getByText("Please re-scan your language cert in high quality.")).toBeInTheDocument();
      expect(screen.getByText("Unseen")).toBeInTheDocument();
      expect(screen.getByText(/By Lead Reviewer/)).toBeInTheDocument();

      // + Add Note buttons exist on welcome and interview_attempt
      const addNoteButtons = screen.getAllByRole("button", { name: /\+ Add Note/i });
      expect(addNoteButtons.length).toBeGreaterThanOrEqual(2);
    });

    test("clicking + Add Note opens confirmation modal and allows submitting note", async () => {
      const mockOnUpdate = vi.fn();
      render(
        <CandidateDetail
          candidate={mockCandidate}
          onUpdate={mockOnUpdate}
          onClose={vi.fn()}
          options={{ interviews: [], agreements: [], recruiters: [] }}
        />,
      );

      const addNoteButtons = screen.getAllByRole("button", { name: /\+ Add Note/i });
      fireEvent.click(addNoteButtons[0]); // Click on first + Add Note (Welcome step)

      const textarea = screen.getByPlaceholderText(/Type the message the candidate will see/i);
      expect(textarea).toBeInTheDocument();

      fireEvent.change(textarea, { target: { value: "Welcome to our accelerated German track." } });

      const confirmButton = screen.getByRole("button", { name: /Confirm/i });
      fireEvent.click(confirmButton);

      expect(mockOnUpdate).toHaveBeenCalledWith("cand-123", {
        step_note_update: {
          stepId: "welcome",
          message: "Welcome to our accelerated German track.",
        },
      });
    });

    test("clicking Edit opens modal with existing note and submits updated message", async () => {
      const mockOnUpdate = vi.fn();
      render(
        <CandidateDetail
          candidate={mockCandidate}
          onUpdate={mockOnUpdate}
          onClose={vi.fn()}
          options={{ interviews: [], agreements: [], recruiters: [] }}
        />,
      );

      const editButton = screen.getByRole("button", { name: /^Edit$/i });
      fireEvent.click(editButton);

      const textarea = screen.getByPlaceholderText(/Type the message the candidate will see/i);
      expect(textarea.value).toBe("Please re-scan your language cert in high quality.");

      fireEvent.change(textarea, { target: { value: "Updated note: B2 certificate is verified." } });

      const confirmButton = screen.getByRole("button", { name: /Confirm/i });
      fireEvent.click(confirmButton);

      expect(mockOnUpdate).toHaveBeenCalledWith("cand-123", {
        step_note_update: {
          stepId: "profile_completion",
          message: "Updated note: B2 certificate is verified.",
        },
      });
    });

    test("clicking Delete confirms and clears step note", async () => {
      const mockOnUpdate = vi.fn();
      render(
        <CandidateDetail
          candidate={mockCandidate}
          onUpdate={mockOnUpdate}
          onClose={vi.fn()}
          options={{ interviews: [], agreements: [], recruiters: [] }}
        />,
      );

      const deleteButton = screen.getByRole("button", { name: /^Delete$/i });
      fireEvent.click(deleteButton);

      expect(screen.getByText(/Delete Note for "Profile Verification"/i)).toBeInTheDocument();

      const confirmButton = screen.getByRole("button", { name: /Confirm/i });
      fireEvent.click(confirmButton);

      expect(mockOnUpdate).toHaveBeenCalledWith("cand-123", {
        clear_step_note_id: "profile_completion",
      });
    });
  });

  describe("Candidate Step Components Universal Note Display", () => {
    test("ProfileCompletionStep displays step note and triggers markStepNoteViewed on render", async () => {
      const progress = {
        resume_status: "pending",
        lang_cert_status: "pending",
        step_notes: {
          profile_completion: {
            message: "Important: Ensure your passport name matches the certificate.",
            viewed_at: null,
          },
        },
      };

      render(<ProfileCompletionStep progress={progress} onComplete={vi.fn()} onBack={vi.fn()} />);

      expect(screen.getByText("Important: Ensure your passport name matches the certificate.")).toBeInTheDocument();
      expect(jobScreeningApi.markStepNoteViewed).toHaveBeenCalledWith("profile_completion");
    });

    test("InterviewStep displays step note and triggers markStepNoteViewed on render", async () => {
      const progress = {
        candidate_email: "cand@test.com",
        assigned_interview_slug: "",
        steps_config: [{ id: "interview_attempt", status: "pending" }],
        step_notes: {
          interview_attempt: {
            message: "Make sure you have a quiet environment for the video interview.",
            viewed_at: null,
          },
        },
      };

      render(<InterviewStep progress={progress} onComplete={vi.fn()} onBack={vi.fn()} />);

      expect(screen.getByText("Make sure you have a quiet environment for the video interview.")).toBeInTheDocument();
      expect(jobScreeningApi.markStepNoteViewed).toHaveBeenCalledWith("interview_attempt");
    });

    test("RegistrationStep displays step note and triggers markStepNoteViewed on render", async () => {
      const progress = {
        assigned_agreement_title: "Skillcase Candidate Agreement",
        assigned_agreement_template_id: "tmpl_1",
        step_notes: {
          registration_form: {
            message: "Please sign section 3 carefully regarding start dates.",
            viewed_at: null,
          },
        },
      };

      render(<RegistrationStep progress={progress} onComplete={vi.fn()} />);

      expect(screen.getByText("Please sign section 3 carefully regarding start dates.")).toBeInTheDocument();
      expect(jobScreeningApi.markStepNoteViewed).toHaveBeenCalledWith("registration_form");
    });

    test("ReviewPendingStep displays step note and triggers markStepNoteViewed on render", async () => {
      const progress = {
        current_step_id: "review_pending",
        interview_rejection_message: null,
        step_notes: {
          review_pending: {
            message: "Our panel is reviewing your responses today.",
            viewed_at: null,
          },
        },
      };

      render(<ReviewPendingStep progress={progress} onComplete={vi.fn()} onBack={vi.fn()} />);

      expect(screen.getByText("Our panel is reviewing your responses today.")).toBeInTheDocument();
      expect(jobScreeningApi.markStepNoteViewed).toHaveBeenCalledWith("review_pending");
    });

    test("AdditionalDocumentsStep displays step note and triggers markStepNoteViewed on render", async () => {
      const progress = {
        resolvedRequiredDocs: [{ id: "passport", title: "Passport" }],
        additional_documents: {},
        steps_config: [{ id: "additional_documents", status: "pending" }],
        step_notes: {
          additional_documents: {
            message: "Please ensure all 4 corners of your passport page are visible.",
            viewed_at: null,
          },
        },
      };

      render(<AdditionalDocumentsStep progress={progress} onComplete={vi.fn()} onBack={vi.fn()} />);

      expect(screen.getByText("Please ensure all 4 corners of your passport page are visible.")).toBeInTheDocument();
      expect(jobScreeningApi.markStepNoteViewed).toHaveBeenCalledWith("additional_documents");
    });

    test("MeetingStep displays step note for training and triggers markStepNoteViewed", async () => {
      const progress = {
        training_slot_time: null,
        step_notes: {
          interview_training: {
            message: "Training slots open daily at 10 AM IST.",
            viewed_at: null,
          },
        },
      };

      render(<MeetingStep type="training" progress={progress} onComplete={vi.fn()} onBack={vi.fn()} />);

      expect(screen.getByText("Training slots open daily at 10 AM IST.")).toBeInTheDocument();
      expect(jobScreeningApi.markStepNoteViewed).toHaveBeenCalledWith("interview_training");
    });

    test("RegistrationStep displays step note and triggers markStepNoteViewed in completed state", async () => {
      const progress = {
        assigned_agreement_title: "Skillcase Candidate Agreement",
        steps_config: [{ id: "registration_form", status: "completed" }],
        step_notes: {
          registration_form: {
            message: "Agreement successfully signed and verified.",
            viewed_at: null,
          },
        },
      };

      render(<RegistrationStep progress={progress} onComplete={vi.fn()} />);

      expect(screen.getByText("Agreement Signed")).toBeInTheDocument();
      expect(screen.getByText("Agreement successfully signed and verified.")).toBeInTheDocument();
      expect(jobScreeningApi.markStepNoteViewed).toHaveBeenCalledWith("registration_form");
    });

    test("WelcomeStep displays step note and triggers markStepNoteViewed", async () => {
      const progress = {
        step_notes: {
          welcome: {
            message: "Welcome aboard! Let's get started with your application.",
            viewed_at: null,
          },
        },
      };

      render(<WelcomeStep progress={progress} onComplete={vi.fn()} />);

      expect(screen.getByText("Welcome aboard! Let's get started with your application.")).toBeInTheDocument();
      expect(jobScreeningApi.markStepNoteViewed).toHaveBeenCalledWith("welcome");
    });
  });

  describe("Admin CandidateDetail App Version Gating", () => {
    test("shows incompatible warning and disables Add Note button when candidate app_version < 1.2.5", () => {
      const oldAppCandidate = {
        user_id: "cand-old",
        fullname: "Old App User",
        email: "old@example.com",
        number: "9876543210",
        app_version: "1.2.4",
        current_step_id: "welcome",
        steps_config: [{ id: "welcome", title: "Welcome", status: "pending" }],
        step_notes: {},
      };

      render(
        <CandidateDetail
          candidate={oldAppCandidate}
          onUpdate={vi.fn()}
          onClose={vi.fn()}
          options={{ interviews: [], agreements: [], recruiters: [] }}
        />,
      );

      expect(screen.getByText(/App Version Incompatible \(v1\.2\.4 < v1\.2\.5\)/i)).toBeInTheDocument();
      const addNoteBtn = screen.getByRole("button", { name: /\+ Add Note/i });
      expect(addNoteBtn).toBeDisabled();
    });

    test("enables Add Note button and hides warning when candidate app_version >= 1.2.5", () => {
      const newAppCandidate = {
        user_id: "cand-new",
        fullname: "New App User",
        email: "new@example.com",
        number: "9876543210",
        app_version: "1.2.5",
        current_step_id: "welcome",
        steps_config: [{ id: "welcome", title: "Welcome", status: "pending" }],
        step_notes: {},
      };

      render(
        <CandidateDetail
          candidate={newAppCandidate}
          onUpdate={vi.fn()}
          onClose={vi.fn()}
          options={{ interviews: [], agreements: [], recruiters: [] }}
        />,
      );

      expect(screen.queryByText(/App Version Incompatible/i)).not.toBeInTheDocument();
      const addNoteBtn = screen.getByRole("button", { name: /\+ Add Note/i });
      expect(addNoteBtn).not.toBeDisabled();
    });
  });
});
