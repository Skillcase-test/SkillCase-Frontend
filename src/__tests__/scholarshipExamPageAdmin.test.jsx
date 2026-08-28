/**
 * Frontend Tests — standalone scholarship exam page + revamped admin workspace
 *
 *   - ScholarshipExamPage: fully standalone exam-taking screen (no hardcore
 *     ExamPage coupling). Verifies the exam loads, questions render, and the
 *     manual submit flow lands on the "Exam Submitted!" screen.
 *   - AdminScholarshipManager (workspace): the modular single-exam workspace.
 *     Verifies the sidebar exam list renders, the live exam auto-opens,
 *     Duplicate calls the duplicate endpoint, Activate asks for confirmation
 *     (single-active guard) before calling updateExam, and the submission
 *     review can override an answer.
 */
import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, test, expect, beforeEach, vi } from "vitest";

vi.mock("../api/scholarshipExamApi", () => ({
  startExam: vi.fn(),
  saveAnswer: vi.fn(),
  recordWarning: vi.fn(),
  submitExam: vi.fn(),
  getTimeRemaining: vi.fn(),
  listExams: vi.fn(),
  createExam: vi.fn(),
  getExamDetail: vi.fn(),
  updateExam: vi.fn(),
  deleteExam: vi.fn(),
  duplicateExam: vi.fn(),
  addQuestion: vi.fn(),
  editQuestion: vi.fn(),
  deleteQuestion: vi.fn(),
  reorderQuestions: vi.fn(),
  setExamVisibility: vi.fn(),
  getExamVisibility: vi.fn(),
  removeExamVisibility: vi.fn(),
  removeExamVisibilityBulk: vi.fn(),
  listAllStudents: vi.fn(),
  getExamSubmissions: vi.fn(),
  reopenSubmission: vi.fn(),
  resetSubmissionForRetest: vi.fn(),
  getSubmissionDetail: vi.fn(),
  overrideAnswer: vi.fn(),
  overrideAnswerPoints: vi.fn(),
  exportExamExcel: vi.fn(),
  // OverviewTab reads these on mount. A vi.mock factory is strict — an export
  // it omits throws on access and kills the whole render, so they must resolve.
  getAdminLandingVisibility: vi.fn(() =>
    Promise.resolve({ data: { settings: { show_on_landing: false } } }),
  ),
  updateAdminLandingVisibility: vi.fn((v) =>
    Promise.resolve({ data: { settings: { show_on_landing: v } } }),
  ),
  getAdminProfileVisibility: vi.fn(() =>
    Promise.resolve({ data: { settings: { show_on_profile: false } } }),
  ),
  updateAdminProfileVisibility: vi.fn((v) =>
    Promise.resolve({ data: { settings: { show_on_profile: v } } }),
  ),
}));

vi.mock("../telemetry/legacyAnalytics", () => {
  const analytics = { capture: vi.fn() };
  return { useFirstPartyAnalytics: () => analytics };
});

import * as scholarshipApi from "../api/scholarshipExamApi";
import ScholarshipExamPage from "../pages/scholarship/ScholarshipExamPage";
import AdminScholarshipManager from "../dashboard-src/pages/exam/scholarship";

// ─── ScholarshipExamPage ────────────────────────────────────────────────────

describe("ScholarshipExamPage (standalone)", () => {
  beforeEach(() => vi.clearAllMocks());

  const examData = {
    data: {
      exam: { test_id: "e1", title: "Scholarship Test", duration_minutes: 30 },
      submission: {
        submission_id: "s1",
        status: "in_progress",
        warning_count: 0,
        remaining_seconds: 1800,
      },
      questions: [
        {
          question_id: "q1",
          question_type: "mcq_single",
          question_data: {
            question: "Was ist richtig?",
            options: ["Apfel", "Banane"],
          },
        },
      ],
      savedAnswers: {},
    },
  };

  test("renders the exam after start, with timer and submit", async () => {
    scholarshipApi.startExam.mockResolvedValue(examData);
    render(
      <MemoryRouter initialEntries={["/scholarship/e1/take"]}>
        <Routes>
          <Route path="/scholarship/:testId/take" element={<ScholarshipExamPage />} />
          <Route path="/scholarship" element={<div>SCHOLARSHIP_HUB</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText("Was ist richtig?")).toBeInTheDocument();
    expect(screen.getByText("Scholarship Test")).toBeInTheDocument();
    expect(screen.getByText("30:00")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Submit/ })).toBeInTheDocument();
    expect(scholarshipApi.startExam).toHaveBeenCalledWith("e1");
  });

  test("selecting an answer saves it and submit lands on the submitted screen", async () => {
    scholarshipApi.startExam.mockResolvedValue(examData);
    scholarshipApi.submitExam.mockResolvedValue({ data: { msg: "ok" } });
    render(
      <MemoryRouter initialEntries={["/scholarship/e1/take"]}>
        <Routes>
          <Route path="/scholarship/:testId/take" element={<ScholarshipExamPage />} />
          <Route path="/scholarship" element={<div>SCHOLARSHIP_HUB</div>} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.click(await screen.findByText("Apfel"));
    await waitFor(() =>
      expect(scholarshipApi.saveAnswer).toHaveBeenCalled(),
    );

    fireEvent.click(screen.getByRole("button", { name: /Submit/ }));
    expect(
      await screen.findByText("Confirm Submit"),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Yes" }));

    expect(await screen.findByText("Exam Submitted!")).toBeInTheDocument();
    // Submit carries the answers as a final flush, so the selected answer must
    // ride along with it.
    expect(scholarshipApi.submitExam).toHaveBeenCalledWith("e1", { q1: 0 });

    // The scholarship funnel exits back to the hub, not the hardcore home
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(await screen.findByText("SCHOLARSHIP_HUB")).toBeInTheDocument();
  });
});

// ─── AdminScholarshipManager (workspace) ────────────────────────────────────

// Each workspace render mounts the full orchestrator (fetch + auto-open + tab
// switching), and the full suite runs many files in parallel on a slow box —
// the 5s default test timeout is too tight under that load.
const adminTest = (name, fn) => test(name, fn, 20000);

describe("AdminScholarshipManager (single-exam workspace)", () => {
  beforeEach(() => vi.clearAllMocks());

  const exams = [
    { test_id: 1, title: "Scholarship 2026", proficiency_level: "ALL", duration_minutes: 60, total_questions: 5, is_active: true, results_visible: false, submission_count: 3 },
    { test_id: 2, title: "Scholarship 2027", proficiency_level: "ALL", duration_minutes: 45, total_questions: 0, is_active: false, results_visible: false, submission_count: 0 },
  ];

  const mockList = () => {
    scholarshipApi.listExams.mockResolvedValue({ data: { exams } });
    scholarshipApi.getExamDetail.mockResolvedValue({
      data: { exam: exams[0], questions: [] },
    });
    scholarshipApi.getExamVisibility.mockResolvedValue({ data: { students: [] } });
    scholarshipApi.listAllStudents.mockResolvedValue({ data: { students: [] } });
    scholarshipApi.getExamSubmissions.mockResolvedValue({ data: { submissions: [] } });
  };

  // The exam header + tab bar only render once the auto-open has finished, so
  // waiting on it guarantees the sidebar rows are stable (not mid-reload).
  // Generous timeout: the full suite runs many files in parallel on a slow box.
  const waitForExamOpen = () =>
    screen.findByRole("button", { name: "Questions" }, { timeout: 8000 });

  adminTest("renders the sidebar exam list with Live/Draft badges and auto-opens the live exam", async () => {
    mockList();
    render(<AdminScholarshipManager />);

    expect(
      await screen.findByText("Scholarship Exam Admin"),
    ).toBeInTheDocument();
    expect(screen.getByText("Scholarship 2026")).toBeInTheDocument();
    expect(screen.getByText("Scholarship 2027")).toBeInTheDocument();
    expect(screen.getByText("● Live")).toBeInTheDocument();
    expect(screen.getAllByText("Draft").length).toBeGreaterThan(0);

    // The live exam opens into the workspace automatically
    await waitFor(() =>
      expect(scholarshipApi.getExamDetail).toHaveBeenCalledWith(1),
    );
    // Header shows the active exam with the tab bar
    expect(await screen.findByRole("button", { name: "Questions" })).toBeInTheDocument();
  });

  adminTest("Duplicate asks for confirmation before calling the duplicate endpoint", async () => {
    mockList();
    scholarshipApi.duplicateExam.mockResolvedValue({
      data: { exam: { test_id: 3, title: "Scholarship 2026 (Copy)" } },
    });
    render(<AdminScholarshipManager />);

    await waitForExamOpen();
    const duplicateButtons = screen.getAllByRole("button", { name: /Duplicate/ });
    fireEvent.click(duplicateButtons[0]);

    // Confirmation is required before the copy is created
    expect(await screen.findByText("Duplicate exam?")).toBeInTheDocument();
    expect(scholarshipApi.duplicateExam).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Yes, Duplicate" }));

    await waitFor(() =>
      expect(scholarshipApi.duplicateExam).toHaveBeenCalledWith(1),
    );
  });

  adminTest("Activate on a draft confirms (single-active guard) then calls updateExam", async () => {
    mockList();
    scholarshipApi.updateExam.mockResolvedValue({
      data: { exam: { test_id: 2, is_active: true } },
    });
    render(<AdminScholarshipManager />);

    await waitForExamOpen();
    const activateButtons = screen.getAllByRole("button", { name: "Activate" });
    fireEvent.click(activateButtons[0]);

    // The confirm dialog explains the single-active switch
    expect(
      await screen.findByText(/Only one exam is served at a time/),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Yes, Activate" }));

    await waitFor(() =>
      expect(scholarshipApi.updateExam).toHaveBeenCalledWith(2, {
        is_active: true,
      }),
    );
  });

  adminTest("Activate always asks for confirmation, even with no other live exam", async () => {
    const noLive = exams.map((e) => ({ ...e, is_active: false }));
    scholarshipApi.listExams.mockResolvedValue({ data: { exams: noLive } });
    scholarshipApi.getExamDetail.mockResolvedValue({
      data: { exam: noLive[0], questions: [] },
    });
    scholarshipApi.getExamVisibility.mockResolvedValue({ data: { students: [] } });
    scholarshipApi.listAllStudents.mockResolvedValue({ data: { students: [] } });
    scholarshipApi.getExamSubmissions.mockResolvedValue({ data: { submissions: [] } });
    scholarshipApi.updateExam.mockResolvedValue({
      data: { exam: { test_id: 1, is_active: true } },
    });
    render(<AdminScholarshipManager />);

    await waitForExamOpen();
    const activateButtons = screen.getAllByRole("button", { name: "Activate" });
    fireEvent.click(activateButtons[0]);

    // Simple activate (no live-exam switch) still requires confirmation
    expect(await screen.findByText("Activate exam?")).toBeInTheDocument();
    expect(scholarshipApi.updateExam).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Yes, Activate" }));

    await waitFor(() =>
      expect(scholarshipApi.updateExam).toHaveBeenCalledWith(1, {
        is_active: true,
      }),
    );
    expect(screen.queryByText(/Only one exam is served at a time/)).not.toBeInTheDocument();
  });

  adminTest("Deactivate asks for confirmation before calling updateExam", async () => {
    mockList();
    scholarshipApi.updateExam.mockResolvedValue({
      data: { exam: { test_id: 1, is_active: false } },
    });
    render(<AdminScholarshipManager />);

    // Wait for the exam header (not just the sidebar title) before acting
    fireEvent.click(await screen.findByRole("button", { name: "Deactivate" }));

    expect(await screen.findByText("Deactivate exam?")).toBeInTheDocument();
    expect(scholarshipApi.updateExam).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Yes, Deactivate" }));

    await waitFor(() =>
      expect(scholarshipApi.updateExam).toHaveBeenCalledWith(1, {
        is_active: false,
      }),
    );
  });

  adminTest("Release Results asks for confirmation before exposing scores", async () => {
    mockList();
    scholarshipApi.updateExam.mockResolvedValue({
      data: { exam: { test_id: 1, is_active: true, results_visible: true } },
    });
    render(<AdminScholarshipManager />);

    // Wait for the exam header (not just the sidebar title) before acting
    fireEvent.click(await screen.findByRole("button", { name: "Release Results" }));

    expect(await screen.findByText("Release results?")).toBeInTheDocument();
    expect(scholarshipApi.updateExam).not.toHaveBeenCalled();
    // Acknowledgment required: button disabled until checked
    const ack = await screen.findByRole("checkbox");
    expect(screen.getByRole("button", { name: "Yes, Release Results" })).toBeDisabled();
    fireEvent.click(ack);
    fireEvent.click(screen.getByRole("button", { name: "Yes, Release Results" }));

    await waitFor(() =>
      expect(scholarshipApi.updateExam).toHaveBeenCalledWith(1, {
        results_visible: true,
      }),
    );
  });

  adminTest("Hide Results asks for confirmation before hiding scores", async () => {
    const visible = exams.map((e) => ({
      ...e,
      results_visible: e.test_id === 1,
    }));
    scholarshipApi.listExams.mockResolvedValue({ data: { exams: visible } });
    scholarshipApi.getExamDetail.mockResolvedValue({
      data: { exam: visible[0], questions: [] },
    });
    scholarshipApi.getExamVisibility.mockResolvedValue({ data: { students: [] } });
    scholarshipApi.listAllStudents.mockResolvedValue({ data: { students: [] } });
    scholarshipApi.getExamSubmissions.mockResolvedValue({ data: { submissions: [] } });
    scholarshipApi.updateExam.mockResolvedValue({
      data: { exam: { test_id: 1, results_visible: false } },
    });
    render(<AdminScholarshipManager />);

    // Wait for the exam header (not just the sidebar title) before acting
    fireEvent.click(await screen.findByRole("button", { name: "Hide Results" }));

    expect(await screen.findByText("Hide results?")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Yes, Hide Results" }));

    await waitFor(() =>
      expect(scholarshipApi.updateExam).toHaveBeenCalledWith(1, {
        results_visible: false,
      }),
    );
  });

  adminTest("submission review can override an answer as correct", async () => {
    mockList();
    scholarshipApi.getExamSubmissions.mockResolvedValue({
      data: {
        submissions: [
          {
            submission_id: 101,
            fullname: "Anna Schmidt",
            username: "anna",
            status: "completed",
            score: 50,
            started_at: new Date().toISOString(),
            finished_at: new Date().toISOString(),
          },
        ],
      },
    });
    scholarshipApi.getSubmissionDetail.mockResolvedValue({
      data: {
        submission: {
          submission_id: 101,
          fullname: "Anna Schmidt",
          username: "anna",
          score: 50,
          earned_points: 5,
          total_points: 10,
        },
        questions: [
          {
            question_id: "q1",
            question_type: "mcq_single",
            question_data: {
              question: "Was ist richtig?",
              correct: "Apfel",
            },
            user_answer: "Apfel",
            is_correct: false,
            points: 2,
            points_earned: 0,
          },
        ],
      },
    });
    scholarshipApi.overrideAnswer.mockResolvedValue({
      data: { is_correct: true, points_earned: 2, earned_points: 7, score: 70 },
    });
    render(<AdminScholarshipManager />);

    // Open the Submissions tab
    fireEvent.click(await screen.findByRole("button", { name: "Submissions" }));
    expect(await screen.findByText("Anna Schmidt")).toBeInTheDocument();

    // Open the review
    fireEvent.click(screen.getByRole("button", { name: "Review" }));
    expect(
      await screen.findByText(/Submission review — Anna Schmidt/),
    ).toBeInTheDocument();

    // Mark the wrong answer as correct
    fireEvent.click(screen.getByRole("button", { name: "Mark Correct" }));
    await waitFor(() =>
      expect(scholarshipApi.overrideAnswer).toHaveBeenCalledWith(101, "q1"),
    );
    // The updated score appears in the review header
    expect(await screen.findByText(/70.0%/)).toBeInTheDocument();
  });

  // ─── Candidates tab: pagination, search, bulk add/remove ──────────────────

  const students = Array.from({ length: 12 }, (_, i) => ({
    id: 200 + i,
    user_id: `u${i}`,
    username: `student${i}`,
    fullname: `Student ${i}`,
    number: `${100 + i}`,
    submission_status: null,
    score: null,
    started_at: null,
  }));

  const openCandidatesTab = async () => {
    fireEvent.click(
      await screen.findByRole("button", { name: "Candidates" }, { timeout: 8000 }),
    );
    await screen.findByText("Add candidates manually");
  };

  adminTest("candidate list shows the Scholarship / Added source pill", async () => {
    mockList();
    scholarshipApi.getExamVisibility.mockResolvedValue({
      data: {
        students: [
          {
            id: 1,
            user_id: "u1",
            username: "scholar",
            fullname: "Scholarly",
            number: "111",
            added_via: "scholarship",
            submission_status: null,
            score: null,
            started_at: null,
          },
          {
            id: 2,
            user_id: "u2",
            username: "normal",
            fullname: "Normal Guy",
            number: "222",
            added_via: "manual",
            submission_status: null,
            score: null,
            started_at: null,
          },
        ],
      },
    });
    render(<AdminScholarshipManager />);

    await openCandidatesTab();

    expect(screen.getByText("Scholarship")).toBeInTheDocument();
    expect(screen.getByText("Added")).toBeInTheDocument();
  });

  adminTest("granted list paginates to 10 with Show more", async () => {
    mockList();
    scholarshipApi.getExamVisibility.mockResolvedValue({
      data: { students },
    });
    render(<AdminScholarshipManager />);

    await openCandidatesTab();

    // Only the first 10 rows are shown
    expect(screen.getByText("Student 0")).toBeInTheDocument();
    expect(screen.queryByText("Student 11")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Show more \(2 remaining\)/ }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Show more/ }));
    expect(screen.getByText("Student 11")).toBeInTheDocument();
  });

  adminTest("granted list search filters candidates", async () => {
    mockList();
    scholarshipApi.getExamVisibility.mockResolvedValue({
      data: { students },
    });
    render(<AdminScholarshipManager />);

    await openCandidatesTab();
    fireEvent.change(
      screen.getByPlaceholderText(/Search candidates by name/),
      { target: { value: "Student 5" } },
    );

    expect(screen.getByText("Student 5")).toBeInTheDocument();
    expect(screen.queryByText("Student 0")).not.toBeInTheDocument();
  });

  adminTest("bulk adds multiple students via multi-select in the add list", async () => {
    mockList();
    scholarshipApi.getExamVisibility.mockResolvedValue({
      data: { students: [] },
    });
    scholarshipApi.listAllStudents.mockResolvedValue({
      data: {
        students: [
          { user_id: "u1", username: "alice", fullname: "Alice", number: "111" },
          { user_id: "u2", username: "bob", fullname: "Bob", number: "222" },
          { user_id: "u3", username: "carol", fullname: "Carol", number: "333" },
        ],
      },
    });
    scholarshipApi.setExamVisibility.mockResolvedValue({
      data: { count: 2 },
    });
    render(<AdminScholarshipManager />);

    await openCandidatesTab();

    fireEvent.click(screen.getByLabelText("Select Alice to add"));
    fireEvent.click(screen.getByLabelText("Select Bob to add"));
    fireEvent.click(
      screen.getByRole("button", { name: "Add selected (2)" }),
    );

    await waitFor(() =>
      expect(scholarshipApi.setExamVisibility).toHaveBeenCalledWith(1, [
        "u1",
        "u2",
      ]),
    );
  });

  adminTest("bulk removes selected candidates after confirmation", async () => {
    mockList();
    scholarshipApi.getExamVisibility.mockResolvedValue({
      data: { students: students.slice(0, 3) },
    });
    scholarshipApi.listAllStudents.mockResolvedValue({ data: { students: [] } });
    scholarshipApi.removeExamVisibilityBulk.mockResolvedValue({
      data: { removed: 2 },
    });
    render(<AdminScholarshipManager />);

    await openCandidatesTab();

    fireEvent.click(screen.getByLabelText("Select Student 0 to remove"));
    fireEvent.click(screen.getByLabelText("Select Student 1 to remove"));
    fireEvent.click(
      screen.getByRole("button", { name: "Remove selected (2)" }),
    );

    // Confirmation required before the bulk removal
    expect(await screen.findByText("Remove 2 candidates?")).toBeInTheDocument();
    expect(scholarshipApi.removeExamVisibilityBulk).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Yes, Remove" }));

    await waitFor(() =>
      expect(scholarshipApi.removeExamVisibilityBulk).toHaveBeenCalledWith(1, [
        200,
        201,
      ]),
    );
  });

  adminTest("submission review renders blocks as content with no mark buttons", async () => {
    mockList();
    scholarshipApi.getExamSubmissions.mockResolvedValue({
      data: {
        submissions: [
          {
            submission_id: 101,
            fullname: "Anna Schmidt",
            username: "anna",
            status: "completed",
            score: 50,
            started_at: new Date().toISOString(),
            finished_at: new Date().toISOString(),
          },
        ],
      },
    });
    scholarshipApi.getSubmissionDetail.mockResolvedValue({
      data: {
        submission: {
          submission_id: 101,
          fullname: "Anna Schmidt",
          username: "anna",
          score: 50,
          earned_points: 5,
          total_points: 10,
        },
        questions: [
          {
            question_id: "pb1",
            question_type: "page_break",
            question_data: {},
            audio_url: null,
            user_answer: null,
            is_correct: null,
            points: 0,
            points_earned: 0,
          },
          {
            question_id: "rp1",
            question_type: "reading_passage",
            question_data: { passage: "Berlin ist eine Stadt." },
            audio_url: null,
            user_answer: null,
            is_correct: null,
            points: 0,
            points_earned: 0,
          },
          {
            question_id: "ab1",
            question_type: "audio_block",
            question_data: {},
            audio_url: "https://example.com/audio.mp3",
            user_answer: null,
            is_correct: null,
            points: 0,
            points_earned: 0,
          },
          {
            question_id: "q1",
            question_type: "mcq_single",
            question_data: { question: "Was ist richtig?", correct: "Apfel" },
            audio_url: null,
            user_answer: "Apfel",
            is_correct: false,
            points: 2,
            points_earned: 0,
          },
        ],
      },
    });
    render(<AdminScholarshipManager />);

    fireEvent.click(await screen.findByRole("button", { name: "Submissions" }));
    await screen.findByText("Anna Schmidt");
    fireEvent.click(screen.getByRole("button", { name: "Review" }));

    // Blocks render as their content
    expect(await screen.findByText("Page Break")).toBeInTheDocument();
    expect(screen.getByText("Reading Passage")).toBeInTheDocument();
    expect(screen.getByText("Berlin ist eine Stadt.")).toBeInTheDocument();
    expect(screen.getByText("Audio")).toBeInTheDocument();

    // Only the one answerable question shows answer UI + a mark button
    expect(screen.getAllByText("Student answered")).toHaveLength(1);
    expect(
      screen.getAllByRole("button", { name: /Mark (Correct|Wrong)/ }),
    ).toHaveLength(1);
  });

  adminTest("submission review resolves index answers and shows matching/composite corrects", async () => {
    mockList();
    scholarshipApi.getExamSubmissions.mockResolvedValue({
      data: {
        submissions: [
          {
            submission_id: 102,
            fullname: "Max Müller",
            username: "max",
            status: "completed",
            score: 50,
            started_at: new Date().toISOString(),
            finished_at: new Date().toISOString(),
          },
        ],
      },
    });
    scholarshipApi.getSubmissionDetail.mockResolvedValue({
      data: {
        submission: {
          submission_id: 102,
          fullname: "Max Müller",
          username: "max",
          score: 50,
          earned_points: 5,
          total_points: 10,
        },
        questions: [
          {
            // Index-based answer: stored as 1 → must render as "Banane"
            question_id: "q1",
            question_type: "mcq_single",
            question_data: {
              question: "Was ist richtig?",
              correct: 0,
              options: ["Apfel", "Banane"],
            },
            audio_url: null,
            user_answer: 1,
            is_correct: false,
            points: 2,
            points_earned: 0,
          },
          {
            // correct_pairs must be shown (was previously missing)
            question_id: "q2",
            question_type: "matching",
            question_data: {
              question: "Match the words",
              left: ["Hund", "Katze"],
              right: ["dog", "cat"],
              correct_pairs: [
                [0, 0],
                [1, 1],
              ],
            },
            audio_url: null,
            user_answer: [
              [0, 1],
              [1, 0],
            ],
            is_correct: false,
            points: 2,
            points_earned: 0,
          },
          {
            // Composite per-item corrects are shown in the correct-answer block
            question_id: "q3",
            question_type: "composite_question",
            question_data: {
              question: "Fill the blanks",
              items: [
                { type: "blank", correct: "Berlin" },
                { type: "dropdown", options: ["rot", "grün"], correct: 1 },
              ],
            },
            audio_url: null,
            user_answer: { 0: "Berlin", 1: 1 },
            is_correct: true,
            points: 2,
            points_earned: 2,
          },
        ],
      },
    });
    render(<AdminScholarshipManager />);

    fireEvent.click(await screen.findByRole("button", { name: "Submissions" }));
    await screen.findByText("Max Müller");
    fireEvent.click(screen.getByRole("button", { name: "Review" }));

    // Index-based answers resolve to option text, not raw indices
    expect(await screen.findByText("Banane")).toBeInTheDocument();
    expect(screen.getByText("Apfel")).toBeInTheDocument();

    // Matching resolves pairs to left ↔ right text (both sides)
    expect(screen.getByText("Hund ↔ dog, Katze ↔ cat")).toBeInTheDocument();
    expect(screen.getByText("Hund ↔ cat, Katze ↔ dog")).toBeInTheDocument();

    // Composite correct answers resolve dropdown indices to text
    expect(
      screen.getAllByText("(a). Berlin | (b). grün"),
    ).toHaveLength(2); // student answer + correct answer (both correct)
    // Composite does not render the Mark Correct/Wrong button (uses chips)
    expect(screen.getAllByText("Student answered")).toHaveLength(3);
  });

  adminTest("questions tab renders blocks as distinct rows, not question chips", async () => {
    mockList();
    scholarshipApi.getExamDetail.mockResolvedValue({
      data: {
        exam: exams[0],
        questions: [
          {
            question_id: "pb1",
            question_type: "page_break",
            question_data: {},
            audio_url: null,
            points: 0,
          },
          {
            question_id: "rp1",
            question_type: "reading_passage",
            question_data: { passage: "Berlin ist eine Stadt." },
            audio_url: null,
            points: 0,
          },
          {
            question_id: "ab1",
            question_type: "audio_block",
            question_data: {},
            audio_url: "https://example.com/audio.mp3",
            points: 0,
          },
          {
            question_id: "q1",
            question_type: "mcq_single",
            question_data: { question: "Was ist richtig?" },
            audio_url: null,
            points: 1,
          },
        ],
      },
    });
    render(<AdminScholarshipManager />);

    fireEvent.click(await screen.findByRole("button", { name: "Questions" }));

    expect(await screen.findByText("Page Break")).toBeInTheDocument();
    expect(screen.getByText("Reading Passage")).toBeInTheDocument();
    expect(screen.getByText("Berlin ist eine Stadt.")).toBeInTheDocument();
    expect(screen.getByText("Audio Block")).toBeInTheDocument();
    expect(screen.getByText("Audio uploaded ✓")).toBeInTheDocument();
    expect(screen.getByText("Was ist richtig?")).toBeInTheDocument();
  });
});
