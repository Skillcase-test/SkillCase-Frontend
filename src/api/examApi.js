import api from "./axios";

// STUDENT EXAM ENDPOINTS
export const getVisibleExams = () => api.get("/exam/visible");

export const getExamInfo = (testId) => api.get(`/exam/${testId}`);

export const startExam = (testId) => api.post(`/exam/${testId}/start`);

export const getTimeRemaining = (testId) => api.get(`/exam/${testId}/time`);

export const saveAnswer = (testId, data) =>
  api.post(`/exam/${testId}/answer`, data);

export const recordWarning = (testId) => api.post(`/exam/${testId}/warning`);

export const submitExam = (testId) => api.post(`/exam/${testId}/submit`);

export const getExamResult = (testId) => api.get(`/exam/${testId}/result`);

// ADMIN EXAM ENDPOINTS
export const createExam = (data) => api.post("/admin/exam/create", data);

export const listExams = () => api.get("/admin/exam/list");

export const getExamDetail = (testId) => api.get(`/admin/exam/${testId}`);

export const updateExam = (testId, data) =>
  api.put(`/admin/exam/${testId}`, data);

export const deleteExam = (testId) => api.delete(`/admin/exam/${testId}`);

export const addQuestion = (testId, formData) =>
  api.post(`/admin/exam/${testId}/question`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

export const editQuestion = (testId, questionId, formData) =>
  api.put(`/admin/exam/${testId}/question/${questionId}`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

export const deleteQuestion = (testId, questionId) =>
  api.delete(`/admin/exam/${testId}/question/${questionId}`);

export const reorderQuestions = (testId, questionIds) =>
  api.put(`/admin/exam/${testId}/reorder`, { question_ids: questionIds });

export const setExamVisibility = (testId, data) =>
  api.post(`/admin/exam/${testId}/visibility`, data);

export const getExamVisibility = (testId) =>
  api.get(`/admin/exam/${testId}/visibility`);

export const removeExamVisibility = (testId, visId) =>
  api.delete(`/admin/exam/${testId}/visibility/${visId}`);

export const getExamSubmissions = (testId) =>
  api.get(`/admin/exam/${testId}/submissions`);

export const reopenSubmission = (submissionId) =>
  api.put(`/admin/exam/submission/${submissionId}/reopen`);

export const resetSubmissionForRetest = (submissionId) =>
  api.put(`/admin/exam/submission/${submissionId}/reset-reopen`);

// BATCH ENDPOINTS
export const createBatch = (data) => api.post("/admin/batch", data);

export const listBatches = () => api.get("/admin/batch");

export const updateBatch = (batchId, data) =>
  api.put(`/admin/batch/${batchId}`, data);

export const deleteBatch = (batchId) => api.delete(`/admin/batch/${batchId}`);

export const getBatchStudents = (batchId) =>
  api.get(`/admin/batch/${batchId}/students`);

export const assignStudents = (batchId, userIds) =>
  api.post(`/admin/batch/${batchId}/students`, { user_ids: userIds });

export const removeStudentFromBatch = (batchId, userId) =>
  api.delete(`/admin/batch/${batchId}/students/${userId}`);

export const listAllStudents = () => api.get("/admin/batch/students/all");
