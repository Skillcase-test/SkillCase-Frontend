/**
 * Frontend Tests — examApi.js
 *
 * Tests that all API functions:
 *  1. Call the correct HTTP method and path
 *  2. Pass data/formData correctly
 *  3. Include the right Content-Type for multipart uploads
 *
 * Vitest hoists vi.mock() calls above all variable declarations,
 * so factory functions CANNOT reference outer `const` variables.
 * We use vi.fn() inline in the factory, then call vi.mocked(axios)
 * after imports to get typed references to those same functions.
 */
import { vi } from "vitest";
import * as examApi from "../api/examApi";
import axios from "../api/axios";

// vi.mock is hoisted before all imports, so the factory MUST use only
// vi.fn() inline — no references to variables declared in this file.
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

describe("examApi", () => {
  // Get references to the mocked functions AFTER imports resolve
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

  describe("Student exam endpoints", () => {
    test("getVisibleExams calls GET /exam/visible", async () => {
      await examApi.getVisibleExams();
      expect(mockGet).toHaveBeenCalledWith("/exam/visible");
    });

    test("getExamInfo calls GET /exam/:testId", async () => {
      await examApi.getExamInfo("e1");
      expect(mockGet).toHaveBeenCalledWith("/exam/e1");
    });

    test("startExam calls POST /exam/:testId/start", async () => {
      await examApi.startExam("e1");
      expect(mockPost).toHaveBeenCalledWith("/exam/e1/start");
    });

    test("getTimeRemaining calls GET /exam/:testId/time", async () => {
      await examApi.getTimeRemaining("e1");
      expect(mockGet).toHaveBeenCalledWith("/exam/e1/time");
    });

    test("saveAnswer calls POST /exam/:testId/answer with data", async () => {
      const data = { question_id: "q1", answer: 2 };
      await examApi.saveAnswer("e1", data);
      expect(mockPost).toHaveBeenCalledWith("/exam/e1/answer", data);
    });

    test("recordWarning calls POST /exam/:testId/warning", async () => {
      await examApi.recordWarning("e1");
      expect(mockPost).toHaveBeenCalledWith("/exam/e1/warning");
    });

    test("submitExam calls POST /exam/:testId/submit", async () => {
      await examApi.submitExam("e1");
      expect(mockPost).toHaveBeenCalledWith("/exam/e1/submit");
    });

    test("getExamResult calls GET /exam/:testId/result", async () => {
      await examApi.getExamResult("e1");
      expect(mockGet).toHaveBeenCalledWith("/exam/e1/result");
    });
  });

  // ─── Admin exam endpoints ──────────────────────────────────────────────────

  describe("Admin exam endpoints", () => {
    test("createExam calls POST /admin/exam/create", async () => {
      await examApi.createExam({ title: "Test" });
      expect(mockPost).toHaveBeenCalledWith("/admin/exam/create", {
        title: "Test",
      });
    });

    test("listExams calls GET /admin/exam/list", async () => {
      await examApi.listExams();
      expect(mockGet).toHaveBeenCalledWith("/admin/exam/list");
    });

    test("getExamDetail calls GET /admin/exam/:testId", async () => {
      await examApi.getExamDetail("e1");
      expect(mockGet).toHaveBeenCalledWith("/admin/exam/e1");
    });

    test("updateExam calls PUT /admin/exam/:testId with data", async () => {
      await examApi.updateExam("e1", { title: "Updated" });
      expect(mockPut).toHaveBeenCalledWith("/admin/exam/e1", {
        title: "Updated",
      });
    });

    test("deleteExam calls DELETE /admin/exam/:testId", async () => {
      await examApi.deleteExam("e1");
      expect(mockDelete).toHaveBeenCalledWith("/admin/exam/e1");
    });

    test("addQuestion calls POST with multipart/form-data header", async () => {
      const formData = new FormData();
      await examApi.addQuestion("e1", formData);
      expect(mockPost).toHaveBeenCalledWith(
        "/admin/exam/e1/question",
        formData,
        { headers: { "Content-Type": "multipart/form-data" } },
      );
    });

    test("editQuestion calls PUT with multipart/form-data header", async () => {
      const formData = new FormData();
      await examApi.editQuestion("e1", "q1", formData);
      expect(mockPut).toHaveBeenCalledWith(
        "/admin/exam/e1/question/q1",
        formData,
        { headers: { "Content-Type": "multipart/form-data" } },
      );
    });

    test("deleteQuestion calls DELETE /admin/exam/:testId/question/:questionId", async () => {
      await examApi.deleteQuestion("e1", "q1");
      expect(mockDelete).toHaveBeenCalledWith("/admin/exam/e1/question/q1");
    });

    test("reorderQuestions calls PUT /admin/exam/:testId/reorder", async () => {
      await examApi.reorderQuestions("e1", ["q1", "q2", "q3"]);
      expect(mockPut).toHaveBeenCalledWith("/admin/exam/e1/reorder", {
        question_ids: ["q1", "q2", "q3"],
      });
    });
  });

  // ─── Visibility endpoints ──────────────────────────────────────────────────

  describe("Visibility endpoints", () => {
    test("setExamVisibility calls POST /admin/exam/:testId/visibility", async () => {
      await examApi.setExamVisibility("e1", { batch_ids: ["b1"] });
      expect(mockPost).toHaveBeenCalledWith("/admin/exam/e1/visibility", {
        batch_ids: ["b1"],
      });
    });

    test("getExamVisibility calls GET /admin/exam/:testId/visibility", async () => {
      await examApi.getExamVisibility("e1");
      expect(mockGet).toHaveBeenCalledWith("/admin/exam/e1/visibility");
    });

    test("removeExamVisibility calls DELETE /admin/exam/:testId/visibility/:visId", async () => {
      await examApi.removeExamVisibility("e1", "42");
      expect(mockDelete).toHaveBeenCalledWith("/admin/exam/e1/visibility/42");
    });
  });

  // ─── Submission management endpoints ──────────────────────────────────────

  describe("Submission management endpoints", () => {
    test("getExamSubmissions calls GET /admin/exam/:testId/submissions", async () => {
      await examApi.getExamSubmissions("e1");
      expect(mockGet).toHaveBeenCalledWith("/admin/exam/e1/submissions");
    });

    test("reopenSubmission calls PUT /admin/exam/submission/:submissionId/reopen", async () => {
      await examApi.reopenSubmission("s1");
      expect(mockPut).toHaveBeenCalledWith("/admin/exam/submission/s1/reopen");
    });

    test("resetSubmissionForRetest calls PUT /admin/exam/submission/:submissionId/reset-reopen", async () => {
      await examApi.resetSubmissionForRetest("s1");
      expect(mockPut).toHaveBeenCalledWith(
        "/admin/exam/submission/s1/reset-reopen",
      );
    });
  });

  // ─── Batch endpoints ───────────────────────────────────────────────────────

  describe("Batch endpoints", () => {
    test("createBatch calls POST /admin/batch", async () => {
      await examApi.createBatch({ batch_name: "A1 Morning" });
      expect(mockPost).toHaveBeenCalledWith("/admin/batch", {
        batch_name: "A1 Morning",
      });
    });

    test("listBatches calls GET /admin/batch", async () => {
      await examApi.listBatches();
      expect(mockGet).toHaveBeenCalledWith("/admin/batch");
    });

    test("updateBatch calls PUT /admin/batch/:batchId", async () => {
      await examApi.updateBatch("b1", { batch_name: "Updated" });
      expect(mockPut).toHaveBeenCalledWith("/admin/batch/b1", {
        batch_name: "Updated",
      });
    });

    test("deleteBatch calls DELETE /admin/batch/:batchId", async () => {
      await examApi.deleteBatch("b1");
      expect(mockDelete).toHaveBeenCalledWith("/admin/batch/b1");
    });

    test("getBatchStudents calls GET /admin/batch/:batchId/students", async () => {
      await examApi.getBatchStudents("b1");
      expect(mockGet).toHaveBeenCalledWith("/admin/batch/b1/students");
    });

    test("assignStudents calls POST /admin/batch/:batchId/students with user_ids", async () => {
      await examApi.assignStudents("b1", ["u1", "u2"]);
      expect(mockPost).toHaveBeenCalledWith("/admin/batch/b1/students", {
        user_ids: ["u1", "u2"],
      });
    });

    test("removeStudentFromBatch calls DELETE /admin/batch/:batchId/students/:userId", async () => {
      await examApi.removeStudentFromBatch("b1", "u1");
      expect(mockDelete).toHaveBeenCalledWith("/admin/batch/b1/students/u1");
    });

    test("listAllStudents calls GET /admin/batch/students/all", async () => {
      await examApi.listAllStudents();
      expect(mockGet).toHaveBeenCalledWith("/admin/batch/students/all");
    });
  });
});
