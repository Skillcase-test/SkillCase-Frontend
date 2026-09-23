import api from "./axios";

const B2_EXERCISE_CACHE_TAG = "b2:exercises";
const B2_EXAM_CACHE_TAG = "b2:exams";

// ─── STUDENT ENDPOINTS — Practice Modules ────────────────────────────────────
// module: 'reading' | 'listening' | 'speaking' | 'writing'
// tag:    'all' | 'telc' | 'goethe'   ('all' is the aggregate — every exercise
//         in the module; 'telc'/'goethe' are exclusive filters)

export const getB2Exercises = (module, tag = "all") =>
  api.cachedGet(
    `/b2/exercises?module=${module}&tag=${tag}`,
    { meta: { cacheTags: [B2_EXERCISE_CACHE_TAG] } },
    "MEDIUM_PRIVATE",
  );

// Uncached: the payload carries the learner's submission and, once completed,
// review-only answer keys — it changes with every submit/reset.
export const getB2Exercise = (exerciseId) =>
  api.get(`/b2/exercises/${exerciseId}`);

// Reading / Listening objective submit
export const submitB2ExerciseAnswers = (exerciseId, data) =>
  api.post(`/b2/exercises/${exerciseId}/submit`, data, {
    meta: {
      invalidateCacheTags: [B2_EXERCISE_CACHE_TAG],
      refreshUsageLimitsOnSuccess: true,
    },
  });

export const submitB2ExerciseWriting = (exerciseId, data) =>
  api.post(`/b2/exercises/${exerciseId}/submit-writing`, data, {
    meta: {
      invalidateCacheTags: [B2_EXERCISE_CACHE_TAG],
      refreshUsageLimitsOnSuccess: true,
    },
  });

// Per-question speaking audio upload (multipart: audio, questionKey, recordDuration)
export const submitB2ExerciseSpeakingAnswer = (exerciseId, formData) =>
  api.post(`/b2/exercises/${exerciseId}/speaking-answer`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
    meta: { invalidateCacheTags: [B2_EXERCISE_CACHE_TAG] },
  });

// Finalize a speaking exercise once all recordings are in
export const submitB2ExerciseSpeaking = (exerciseId) =>
  api.post(`/b2/exercises/${exerciseId}/submit-speaking`, null, {
    meta: {
      invalidateCacheTags: [B2_EXERCISE_CACHE_TAG],
      refreshUsageLimitsOnSuccess: true,
    },
  });

export const resetB2Exercise = (exerciseId) =>
  api.post(`/b2/exercises/${exerciseId}/reset`, null, {
    meta: { invalidateCacheTags: [B2_EXERCISE_CACHE_TAG] },
  });

export const uploadB2ExerciseOcr = (formData) =>
  api.post("/b2/exercises/upload-ocr", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

// ─── STUDENT ENDPOINTS — Exam Papers ─────────────────────────────────────────

// Test hub overview — latest test, history, next paper, suggestions.
// Plain get: changes after every exam/exercise, must never serve stale.
export const getB2TestOverview = () => api.get("/b2/test/overview");

export const uploadB2ExamOcr = (formData) =>
  api.post("/b2/exams/upload-ocr", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
export const getB2Exams = () =>
  api.cachedGet(
    "/b2/exams",
    { meta: { cacheTags: [B2_EXAM_CACHE_TAG] } },
    "MEDIUM_PRIVATE",
  );
export const getB2ExamPapers = (examType) =>
  api.cachedGet(
    `/b2/exams/${examType}/papers`,
    { meta: { cacheTags: [B2_EXAM_CACHE_TAG] } },
    "MEDIUM_PRIVATE",
  );
export const startB2ExamSubmission = (paperId) =>
  api.post(`/b2/exams/papers/${paperId}/start`, null, {
    meta: { refreshUsageLimitsOnSuccess: true },
  });
export const getB2ExamSubmissionStatus = (submissionId) =>
  api.get(`/b2/exams/submissions/${submissionId}`);
export const getB2ExamSectionContent = (paperId, sectionType) =>
  api.get(`/b2/exams/papers/${paperId}/sections/${sectionType}`);
export const submitB2ExamReadingAnswers = (submissionId, data) =>
  api.post(`/b2/exams/submissions/${submissionId}/sections/reading/submit`, data, {
    meta: { invalidateCacheTags: [B2_EXAM_CACHE_TAG] },
  });
export const submitB2ExamListeningAnswers = (submissionId, data) =>
  api.post(`/b2/exams/submissions/${submissionId}/sections/listening/submit`, data, {
    meta: { invalidateCacheTags: [B2_EXAM_CACHE_TAG] },
  });
export const submitB2ExamWritingAnswers = (submissionId, data) =>
  api.post(`/b2/exams/submissions/${submissionId}/sections/writing/submit`, data, {
    meta: { invalidateCacheTags: [B2_EXAM_CACHE_TAG] },
  });
export const submitB2ExamSpeakingAudio = (submissionId, formData) =>
  api.post(`/b2/exams/submissions/${submissionId}/sections/speaking/submit`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
    meta: { invalidateCacheTags: [B2_EXAM_CACHE_TAG] },
  });
export const resetB2ExamSubmission = (submissionId) =>
  api.post(`/b2/exams/submissions/${submissionId}/reset`, null, {
    meta: { invalidateCacheTags: [B2_EXAM_CACHE_TAG] },
  });

// ─── ADMIN ENDPOINTS ─────────────────────────────────────────────────────────

export const uploadB2Exercise = (formData) =>
  api.post("/admin/b2/exercises/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
    meta: { invalidateCacheTags: [B2_EXERCISE_CACHE_TAG] },
  });
export const getB2ExercisesAdmin = (params = {}) =>
  api.get("/admin/b2/exercises", { params });
export const toggleB2Exercise = (id) =>
  api.put(`/admin/b2/exercises/${id}/toggle`, null, {
    meta: { invalidateCacheTags: [B2_EXERCISE_CACHE_TAG] },
  });
// `force` is required when learners have attempts (the API answers 409 with
// requiresForce) — deleting cascades their results; deactivating keeps them.
export const deleteB2Exercise = (id, { force = false } = {}) =>
  api.delete(`/admin/b2/exercises/${id}`, {
    params: force ? { force: "true" } : undefined,
    meta: { invalidateCacheTags: [B2_EXERCISE_CACHE_TAG] },
  });

export const uploadB2ExamPaper = (formData) =>
  api.post("/admin/b2/exams/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
    meta: { invalidateCacheTags: [B2_EXAM_CACHE_TAG] },
  });
export const getB2ExamPapersAdmin = () => api.get("/admin/b2/exams/papers");
export const toggleB2ExamPaper = (id) =>
  api.put(`/admin/b2/exams/papers/${id}/toggle`, null, {
    meta: { invalidateCacheTags: [B2_EXAM_CACHE_TAG] },
  });
export const deleteB2ExamPaper = (id, { force = false } = {}) =>
  api.delete(`/admin/b2/exams/papers/${id}`, {
    params: force ? { force: "true" } : undefined,
    meta: { invalidateCacheTags: [B2_EXAM_CACHE_TAG] },
  });

// Runs a delete; if learners have attempts, asks before forcing it through.
// Resolves true when deleted, false when the admin backed out.
export async function deleteWithAttemptGuard(deleteFn, id) {
  try {
    await deleteFn(id);
    return true;
  } catch (err) {
    if (err.response?.status !== 409 || !err.response.data?.requiresForce) {
      throw err;
    }
    const confirmed = window.confirm(
      `${err.response.data.error}\n\nDelete anyway? This cannot be undone.`,
    );
    if (!confirmed) return false;
    await deleteFn(id, { force: true });
    return true;
  }
}
