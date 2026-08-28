/**
 * Frontend Tests — scholarshipExamApi.js
 *
 * Verifies every scholarship exam API function hits the right
 * /scholarship-exam (student) and /admin/scholarship-exam (admin) paths with
 * the correct method, payload, multipart/form-data headers and blob response
 * type for the Excel export. Scholarship exams are per-user (no batches), so
 * visibility payloads carry `user_ids` instead of `batch_ids`.
 *
 * Vitest hoists vi.mock() calls above all variable declarations, so factory
 * functions CANNOT reference outer `const` variables. We use vi.fn() inline in
 * the factory, then call vi.mocked(axios) after imports to get typed refs.
 */
import { describe, test, expect, beforeEach, vi } from "vitest";
import * as scholarshipApi from "../api/scholarshipExamApi";
import axios from "../api/axios";

vi.mock("../api/axios", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    interceptors: {
      request: { use: vi.fn(), eject: vi.fn() },
      response: { use: vi.fn(), eject: vi.fn() },
    },
    defaults: { headers: { common: {} } },
  },
}));

describe("scholarshipExamApi", () => {
  let mockGet, mockPost, mockPut, mockDelete;

  beforeEach(() => {
    vi.clearAllMocks();
    const mocked = vi.mocked(axios);
    mockGet = mocked.get;
    mockPost = mocked.post;
    mockPut = mocked.put;
    mockDelete = mocked.delete;
    mockGet.mockResolvedValue({ data: {} });
    mockPost.mockResolvedValue({ data: {} });
    mockPut.mockResolvedValue({ data: {} });
    mockDelete.mockResolvedValue({ data: {} });
  });

  // ─── Student exam endpoints ────────────────────────────────────────────────

  describe("Student endpoints", () => {
    test("getScholarshipExam calls GET /scholarship-exam", async () => {
      await scholarshipApi.getScholarshipExam();
      expect(mockGet).toHaveBeenCalledWith("/scholarship-exam");
    });

    test("getExamInfo calls GET /scholarship-exam/:testId", async () => {
      await scholarshipApi.getExamInfo("e1");
      expect(mockGet).toHaveBeenCalledWith("/scholarship-exam/e1");
    });

    test("startExam calls POST /scholarship-exam/:testId/start", async () => {
      await scholarshipApi.startExam("e1");
      expect(mockPost).toHaveBeenCalledWith("/scholarship-exam/e1/start");
    });

    test("getTimeRemaining calls GET /scholarship-exam/:testId/time", async () => {
      await scholarshipApi.getTimeRemaining("e1");
      expect(mockGet).toHaveBeenCalledWith("/scholarship-exam/e1/time");
    });

    test("saveAnswer calls POST /scholarship-exam/:testId/answer with data", async () => {
      const data = { question_id: "q1", answer: 2 };
      await scholarshipApi.saveAnswer("e1", data);
      expect(mockPost).toHaveBeenCalledWith("/scholarship-exam/e1/answer", data);
    });

    // The server judges whether an absence is a strike, so the client reports
    // what happened; an omitted payload still has to send a valid empty body.
    test("recordWarning posts the proctor payload", async () => {
      await scholarshipApi.recordWarning("e1", {
        reason: "Left the exam screen",
        away_ms: 15000,
      });
      expect(mockPost).toHaveBeenCalledWith("/scholarship-exam/e1/warning", {
        reason: "Left the exam screen",
        away_ms: 15000,
      });
    });

    test("recordWarning posts an empty object when no payload is given", async () => {
      await scholarshipApi.recordWarning("e1");
      expect(mockPost).toHaveBeenCalledWith("/scholarship-exam/e1/warning", {});
    });

    // Submit carries a final answer flush so a debounce that never fired can't
    // lose the last answer.
    test("submitExam posts answers when given", async () => {
      await scholarshipApi.submitExam("e1", { 1: 2 });
      expect(mockPost).toHaveBeenCalledWith("/scholarship-exam/e1/submit", {
        answers: { 1: 2 },
      });
    });

    test("submitExam posts an empty body when no answers are given", async () => {
      await scholarshipApi.submitExam("e1");
      expect(mockPost).toHaveBeenCalledWith("/scholarship-exam/e1/submit", {});
    });

    test("getExamResult calls GET /scholarship-exam/:testId/result", async () => {
      await scholarshipApi.getExamResult("e1");
      expect(mockGet).toHaveBeenCalledWith("/scholarship-exam/e1/result");
    });
  });

  // ─── Admin exam endpoints ──────────────────────────────────────────────────

  describe("Admin exam endpoints", () => {
    test("createExam calls POST /admin/scholarship-exam/create", async () => {
      await scholarshipApi.createExam({ title: "Test" });
      expect(mockPost).toHaveBeenCalledWith("/admin/scholarship-exam/create", {
        title: "Test",
      });
    });

    test("listExams calls GET /admin/scholarship-exam/list", async () => {
      await scholarshipApi.listExams();
      expect(mockGet).toHaveBeenCalledWith("/admin/scholarship-exam/list");
    });

    test("getExamDetail calls GET /admin/scholarship-exam/:testId", async () => {
      await scholarshipApi.getExamDetail("e1");
      expect(mockGet).toHaveBeenCalledWith("/admin/scholarship-exam/e1");
    });

    test("updateExam calls PUT /admin/scholarship-exam/:testId with data", async () => {
      await scholarshipApi.updateExam("e1", { title: "Updated" });
      expect(mockPut).toHaveBeenCalledWith("/admin/scholarship-exam/e1", {
        title: "Updated",
      });
    });

    test("deleteExam calls DELETE /admin/scholarship-exam/:testId", async () => {
      await scholarshipApi.deleteExam("e1");
      expect(mockDelete).toHaveBeenCalledWith("/admin/scholarship-exam/e1");
    });

    test("duplicateExam calls POST /admin/scholarship-exam/:testId/duplicate", async () => {
      await scholarshipApi.duplicateExam("e1");
      expect(mockPost).toHaveBeenCalledWith(
        "/admin/scholarship-exam/e1/duplicate",
      );
    });

    test("addQuestion calls POST with multipart/form-data header", async () => {
      const formData = new FormData();
      await scholarshipApi.addQuestion("e1", formData);
      expect(mockPost).toHaveBeenCalledWith(
        "/admin/scholarship-exam/e1/question",
        formData,
        { headers: { "Content-Type": "multipart/form-data" } },
      );
    });

    test("editQuestion calls PUT with multipart/form-data header", async () => {
      const formData = new FormData();
      await scholarshipApi.editQuestion("e1", "q1", formData);
      expect(mockPut).toHaveBeenCalledWith(
        "/admin/scholarship-exam/e1/question/q1",
        formData,
        { headers: { "Content-Type": "multipart/form-data" } },
      );
    });

    test("deleteQuestion calls DELETE /admin/scholarship-exam/:testId/question/:questionId", async () => {
      await scholarshipApi.deleteQuestion("e1", "q1");
      expect(mockDelete).toHaveBeenCalledWith(
        "/admin/scholarship-exam/e1/question/q1",
      );
    });

    test("reorderQuestions calls PUT /admin/scholarship-exam/:testId/reorder", async () => {
      await scholarshipApi.reorderQuestions("e1", ["q1", "q2", "q3"]);
      expect(mockPut).toHaveBeenCalledWith("/admin/scholarship-exam/e1/reorder", {
        question_ids: ["q1", "q2", "q3"],
      });
    });
  });

  // ─── Per-user visibility endpoints (no batches) ───────────────────────────

  describe("Visibility endpoints (per-user)", () => {
    test("setExamVisibility posts user_ids array", async () => {
      await scholarshipApi.setExamVisibility("e1", ["u1", "u2"]);
      expect(mockPost).toHaveBeenCalledWith(
        "/admin/scholarship-exam/e1/visibility",
        { user_ids: ["u1", "u2"] },
      );
    });

    test("getExamVisibility calls GET /admin/scholarship-exam/:testId/visibility", async () => {
      await scholarshipApi.getExamVisibility("e1");
      expect(mockGet).toHaveBeenCalledWith(
        "/admin/scholarship-exam/e1/visibility",
      );
    });

    test("removeExamVisibility calls DELETE visibility/:visId", async () => {
      await scholarshipApi.removeExamVisibility("e1", "42");
      expect(mockDelete).toHaveBeenCalledWith(
        "/admin/scholarship-exam/e1/visibility/42",
      );
    });

    test("listAllStudents calls GET /admin/scholarship-exam/students", async () => {
      await scholarshipApi.listAllStudents();
      expect(mockGet).toHaveBeenCalledWith("/admin/scholarship-exam/students");
    });
  });

  // ─── Submission management endpoints ──────────────────────────────────────

  describe("Submission management endpoints", () => {
    test("getExamSubmissions calls GET /admin/scholarship-exam/:testId/submissions", async () => {
      await scholarshipApi.getExamSubmissions("e1");
      expect(mockGet).toHaveBeenCalledWith(
        "/admin/scholarship-exam/e1/submissions",
      );
    });

    test("reopenSubmission calls PUT /admin/scholarship-exam/submission/:id/reopen", async () => {
      await scholarshipApi.reopenSubmission("s1");
      expect(mockPut).toHaveBeenCalledWith(
        "/admin/scholarship-exam/submission/s1/reopen",
      );
    });

    test("resetSubmissionForRetest calls PUT .../submission/:id/reset-reopen", async () => {
      await scholarshipApi.resetSubmissionForRetest("s1");
      expect(mockPut).toHaveBeenCalledWith(
        "/admin/scholarship-exam/submission/s1/reset-reopen",
      );
    });

    test("getSubmissionDetail calls GET .../submission/:id/detail", async () => {
      await scholarshipApi.getSubmissionDetail("s1");
      expect(mockGet).toHaveBeenCalledWith(
        "/admin/scholarship-exam/submission/s1/detail",
      );
    });

    test("overrideAnswer calls PUT .../answer/:questionId/override", async () => {
      await scholarshipApi.overrideAnswer("s1", "q1");
      expect(mockPut).toHaveBeenCalledWith(
        "/admin/scholarship-exam/submission/s1/answer/q1/override",
      );
    });

    test("overrideAnswerPoints sends points_earned", async () => {
      await scholarshipApi.overrideAnswerPoints("s1", "q1", 2.5);
      expect(mockPut).toHaveBeenCalledWith(
        "/admin/scholarship-exam/submission/s1/answer/q1/override-points",
        { points_earned: 2.5 },
      );
    });
  });

  // ─── Excel export ─────────────────────────────────────────────────────────

  describe("Excel export", () => {
    test("exportExamExcel requests a blob response", async () => {
      await scholarshipApi.exportExamExcel("e1");
      expect(mockGet).toHaveBeenCalledWith(
        "/admin/scholarship-exam/e1/export/excel",
        { responseType: "blob" },
      );
    });
  });

  // ─── Scholarship tiers ────────────────────────────────────────────────────

  describe("Tier endpoints", () => {
    test("listTiers calls GET /admin/scholarship-exam/:testId/tiers", async () => {
      await scholarshipApi.listTiers("e1");
      expect(mockGet).toHaveBeenCalledWith("/admin/scholarship-exam/e1/tiers");
    });

    test("createTier calls POST /admin/scholarship-exam/:testId/tiers", async () => {
      await scholarshipApi.createTier("e1", { min_score: 80, scholarship_pct: 20 });
      expect(mockPost).toHaveBeenCalledWith("/admin/scholarship-exam/e1/tiers", { min_score: 80, scholarship_pct: 20 });
    });

    test("updateTier calls PUT /admin/scholarship-exam/:testId/tiers/:tierId", async () => {
      await scholarshipApi.updateTier("e1", "t1", { scholarship_pct: 25 });
      expect(mockPut).toHaveBeenCalledWith("/admin/scholarship-exam/e1/tiers/t1", { scholarship_pct: 25 });
    });

    test("deleteTier calls DELETE /admin/scholarship-exam/:testId/tiers/:tierId", async () => {
      await scholarshipApi.deleteTier("e1", "t1");
      expect(mockDelete).toHaveBeenCalledWith("/admin/scholarship-exam/e1/tiers/t1");
    });
  });
});
