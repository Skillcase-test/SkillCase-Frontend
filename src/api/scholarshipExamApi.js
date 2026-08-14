import api from "./axios";

// STUDENT SCHOLARSHIP EXAM ENDPOINTS
export const getScholarshipExam = () => api.get("/scholarship-exam");

export const getExamInfo = (testId) =>
  api.get(`/scholarship-exam/${testId}`);

export const startExam = (testId) =>
  api.post(`/scholarship-exam/${testId}/start`);

export const getTimeRemaining = (testId) =>
  api.get(`/scholarship-exam/${testId}/time`);

export const saveAnswer = (testId, data) =>
  api.post(`/scholarship-exam/${testId}/answer`, data);

// The server decides whether an absence counts as a strike — it forgives short
// ones — so the client reports what happened instead of asserting a violation.
export const recordWarning = (testId, payload) =>
  api.post(`/scholarship-exam/${testId}/warning`, payload || {});

// Answers are sent with the submission too: a final flush that can't be lost to
// a debounce timer that never fired.
export const submitExam = (testId, answers) =>
  api.post(`/scholarship-exam/${testId}/submit`, answers ? { answers } : {});

export const getExamResult = (testId) =>
  api.get(`/scholarship-exam/${testId}/result`);

// ADMIN SCHOLARSHIP EXAM ENDPOINTS
export const createExam = (data) =>
  api.post("/admin/scholarship-exam/create", data);

export const listExams = () => api.get("/admin/scholarship-exam/list");

export const getExamDetail = (testId) =>
  api.get(`/admin/scholarship-exam/${testId}`);

export const updateExam = (testId, data) =>
  api.put(`/admin/scholarship-exam/${testId}`, data);

export const deleteExam = (testId) =>
  api.delete(`/admin/scholarship-exam/${testId}`);

export const duplicateExam = (testId) =>
  api.post(`/admin/scholarship-exam/${testId}/duplicate`);

export const addQuestion = (testId, formData) =>
  api.post(`/admin/scholarship-exam/${testId}/question`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

export const editQuestion = (testId, questionId, formData) =>
  api.put(`/admin/scholarship-exam/${testId}/question/${questionId}`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

export const deleteQuestion = (testId, questionId) =>
  api.delete(`/admin/scholarship-exam/${testId}/question/${questionId}`);

export const reorderQuestions = (testId, questionIds) =>
  api.put(`/admin/scholarship-exam/${testId}/reorder`, {
    question_ids: questionIds,
  });

export const setExamVisibility = (testId, userIds) =>
  api.post(`/admin/scholarship-exam/${testId}/visibility`, {
    user_ids: userIds,
  });

export const getExamVisibility = (testId) =>
  api.get(`/admin/scholarship-exam/${testId}/visibility`);

export const removeExamVisibility = (testId, visId) =>
  api.delete(`/admin/scholarship-exam/${testId}/visibility/${visId}`);

export const removeExamVisibilityBulk = (testId, visIds) =>
  api.delete(`/admin/scholarship-exam/${testId}/visibility`, {
    data: { vis_ids: visIds },
  });

export const listAllStudents = () =>
  api.get("/admin/scholarship-exam/students");

export const getExamSubmissions = (testId) =>
  api.get(`/admin/scholarship-exam/${testId}/submissions`);

export const reopenSubmission = (submissionId) =>
  api.put(`/admin/scholarship-exam/submission/${submissionId}/reopen`);

export const resetSubmissionForRetest = (submissionId) =>
  api.put(`/admin/scholarship-exam/submission/${submissionId}/reset-reopen`);

export const getSubmissionDetail = (submissionId) =>
  api.get(`/admin/scholarship-exam/submission/${submissionId}/detail`);

export const overrideAnswer = (submissionId, questionId) =>
  api.put(
    `/admin/scholarship-exam/submission/${submissionId}/answer/${questionId}/override`,
  );

export const overrideAnswerPoints = (submissionId, questionId, pointsEarned) =>
  api.put(
    `/admin/scholarship-exam/submission/${submissionId}/answer/${questionId}/override-points`,
    { points_earned: pointsEarned },
  );

export const exportExamExcel = (testId) =>
  api.get(`/admin/scholarship-exam/${testId}/export/excel`, {
    responseType: "blob",
  });
