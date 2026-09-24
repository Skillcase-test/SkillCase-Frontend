import api from "./axios";

const A1_NURSING_CACHE_TAG = "a1:nursing";

export const getNursingChapters = () =>
  api.cachedGet(
    "/a1/nursing/chapters",
    { meta: { cacheTags: [A1_NURSING_CACHE_TAG] } },
    "MEDIUM_PRIVATE",
  );

export const getNursingChapter = (chapterId) =>
  api.cachedGet(
    `/a1/nursing/chapter/${chapterId}`,
    { meta: { cacheTags: [A1_NURSING_CACHE_TAG] } },
    "MEDIUM_PRIVATE",
  );

export const saveNursingProgress = (data) =>
  api.post("/a1/nursing/progress", data, {
    meta: {
      invalidateCacheTags: [A1_NURSING_CACHE_TAG],
      ...(data?.advanced === true && { refreshUsageLimitsOnSuccess: true }),
    },
  });

// Quiz draws are fresh every call — bypass the shared GET cache entirely.
export const getNursingQuickQuiz = (chapterId, checkpoint, seenCardIds) =>
  api.get(`/a1/nursing/quiz/quick/${chapterId}`, {
    params: { checkpoint, seen: (seenCardIds || []).join(",") },
  });

export const getNursingFinalQuiz = (chapterId) =>
  api.get(`/a1/nursing/quiz/final/${chapterId}`);

export const checkNursingAnswer = (chapterId, questionUid, answer) =>
  api.post("/a1/nursing/quiz/check", { chapterId, questionUid, answer });

export const submitNursingQuiz = (data) =>
  api.post("/a1/nursing/quiz/submit", data, {
    meta: { invalidateCacheTags: [A1_NURSING_CACHE_TAG] },
  });

// Admin
export const getNursingAdminChapters = () => api.get("/admin/a1/nursing/chapters");

export const uploadNursingChapter = (formData) =>
  api.post("/admin/a1/nursing/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

export const deleteNursingChapter = (chapterId) =>
  api.delete(`/admin/a1/nursing/chapter/${chapterId}`);

export const getNursingTemplate = () => api.get("/admin/a1/nursing/template");
