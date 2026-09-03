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

// "Book my seat" — eligible candidate mints a Razorpay payment link for ₹3,000.
// Returns { checkoutUrl, paymentLinkId, amountPaise, attemptId } on success.
// Throws 409 if the candidate is not eligible, the offer expired, or a
// seat booking already exists for this user+testId.
export const createSeatCheckout = (testId) =>
  api.post(`/scholarship-exam/${testId}/seat-checkout`);

// ADMIN SCHOLARSHIP EXAM ENDPOINTS
export const createExam = (data) =>
  api.post("/admin/scholarship-exam/create", data);

export const listExams = (params) =>
  params
    ? api.get("/admin/scholarship-exam/list", { params })
    : api.get("/admin/scholarship-exam/list");

export const getExamDetail = (testId) =>
  api.get(`/admin/scholarship-exam/${testId}`);

export const updateExam = (testId, data) =>
  api.put(`/admin/scholarship-exam/${testId}`, data);

export const deleteExam = (testId) =>
  api.delete(`/admin/scholarship-exam/${testId}`);

export const duplicateExam = (testId) =>
  api.post(`/admin/scholarship-exam/${testId}/duplicate`);

// ── Pathways ───────────────────────────────────────────────────────────────
// Public, pre-auth feed for the onboarding "What are you here for?" screen.
export const getPublicPathways = () =>
  api.get("/scholarship-exam/pathways/public");

// Admin: all pathways incl. the built-in "Jobs in Germany".
export const listPathways = () =>
  api.get("/admin/scholarship-exam/pathways");

// Admin: create a pathway. Accepts FormData.
export const createPathway = (formData) =>
  api.post("/admin/scholarship-exam/pathways", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

// Admin: edit a pathway. Accepts a FormData (image file field is optional).
export const updatePathway = (id, formData) =>
  api.put(`/admin/scholarship-exam/pathways/${id}`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

// Admin: delete a pathway.
export const deletePathway = (id) =>
  api.delete(`/admin/scholarship-exam/pathways/${id}`);

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

// SCHOLARSHIP TIERS (admin)
export const listTiers = (testId) =>
  api.get(`/admin/scholarship-exam/${testId}/tiers`);

export const createTier = (testId, data) =>
  api.post(`/admin/scholarship-exam/${testId}/tiers`, data);

export const updateTier = (testId, tierId, data) =>
  api.put(`/admin/scholarship-exam/${testId}/tiers/${tierId}`, data);

export const deleteTier = (testId, tierId) =>
  api.delete(`/admin/scholarship-exam/${testId}/tiers/${tierId}`);

export const getLandingVisibility = () =>
  api.get("/scholarship-exam/landing-visibility");

export const getProfileVisibility = () =>
  api.get("/scholarship-exam/profile-visibility");

export const getAdminLandingVisibility = () =>
  api.get("/admin/scholarship-exam/landing-visibility");

export const updateAdminLandingVisibility = (show_on_landing) =>
  api.put("/admin/scholarship-exam/landing-visibility", { show_on_landing });

export const getAdminProfileVisibility = () =>
  api.get("/admin/scholarship-exam/profile-visibility");

export const updateAdminProfileVisibility = (show_on_profile) =>
  api.put("/admin/scholarship-exam/profile-visibility", { show_on_profile });

// ── Per-user awards (global, no testId) ──────────────────────────────────
export const searchUsersForAward = (q) =>
  api.get("/admin/scholarship-exam/user-awards/search-users", { params: { q } });

export const listUserAwards = (params) =>
  api.get("/admin/scholarship-exam/user-awards", { params });

export const createUserAward = (data) =>
  api.post("/admin/scholarship-exam/user-awards", data);

export const updateUserAward = (awardId, data) =>
  api.put(`/admin/scholarship-exam/user-awards/${awardId}`, data);

export const revokeUserAward = (awardId, data) =>
  api.delete(`/admin/scholarship-exam/user-awards/${awardId}`, { data });

export const listCompletedCandidatesForAward = (testId, params) =>
  api.get(`/admin/scholarship-exam/${testId}/completed-candidates`, { params });

// ── Scholarship audit log ──────────────────────────────────────────────────
export const getAuditLog = (params) =>
  api.get("/admin/scholarship-exam/audit-log", { params });
