import api from "./axios";

const B1_READ_LISTEN_CACHE_TAG = "b1:read-listen";
const B1_DESCRIBE_SPEAK_CACHE_TAG = "b1:describe-speak";
const B1_VIDEO_CACHE_TAG = "b1:video";
const B1_FLASHCARD_CACHE_TAG = "b1:flashcard";

// STUDENT ENDPOINTS
export const getB1ReadingChapters = (module) =>
  api.cachedGet(
    `/b1/read-listen/chapters/${module}`,
    { meta: { cacheTags: [B1_READ_LISTEN_CACHE_TAG] } },
    "MEDIUM_PRIVATE",
  );
export const getB1ReadingChapterItems = (module, chapterId) =>
  api.cachedGet(
    `/b1/read-listen/chapters/${module}/${chapterId}/items`,
    { meta: { cacheTags: [B1_READ_LISTEN_CACHE_TAG] } },
    "MEDIUM_PRIVATE",
  );
export const getB1ReadingContent = (contentId) =>
  api.cachedGet(
    `/b1/read-listen/content/${contentId}`,
    { meta: { cacheTags: [B1_READ_LISTEN_CACHE_TAG] } },
    "MEDIUM_PRIVATE",
  );
export const submitB1ReadingQuiz = (data) =>
  api.post("/b1/read-listen/submit", data, {
    meta: {
      invalidateCacheTags: [B1_READ_LISTEN_CACHE_TAG],
      refreshUsageLimitsOnSuccess: true,
    },
  });

export const getB1DescribeSpeakChapters = () =>
  api.cachedGet(
    "/b1/describe-speak/chapters",
    { meta: { cacheTags: [B1_DESCRIBE_SPEAK_CACHE_TAG] } },
    "MEDIUM_PRIVATE",
  );
export const getB1DescribeSpeakChapterItems = (chapterId) =>
  api.cachedGet(
    `/b1/describe-speak/chapters/${chapterId}/items`,
    { meta: { cacheTags: [B1_DESCRIBE_SPEAK_CACHE_TAG] } },
    "MEDIUM_PRIVATE",
  );
export const getB1DescribeSpeakContent = (topicId) =>
  api.cachedGet(
    `/b1/describe-speak/content/${topicId}`,
    { meta: { cacheTags: [B1_DESCRIBE_SPEAK_CACHE_TAG] } },
    "MEDIUM_PRIVATE",
  );
export const uploadB1DescribeSpeakOcr = (formData) => api.post("/b1/describe-speak/upload-ocr", formData, {
  headers: { "Content-Type": "multipart/form-data" },
  meta: { skipCacheInvalidation: true },
});
export const submitB1DescribeSpeakWriting = (data) =>
  api.post("/b1/describe-speak/submit-writing", data, {
    meta: { invalidateCacheTags: [B1_DESCRIBE_SPEAK_CACHE_TAG] },
  });
export const submitB1DescribeSpeakSpeaking = (formData) => api.post("/b1/describe-speak/submit-speaking", formData, {
  headers: { "Content-Type": "multipart/form-data" },
  meta: {
    invalidateCacheTags: [B1_DESCRIBE_SPEAK_CACHE_TAG],
    refreshUsageLimitsOnSuccess: true,
  },
});
export const resetB1DescribeSpeakProgress = (topicId) =>
  api.post(`/b1/describe-speak/reset/${topicId}`, null, {
    meta: { invalidateCacheTags: [B1_DESCRIBE_SPEAK_CACHE_TAG] },
  });
export const skipB1DescribeSpeakSpeaking = (topicId) =>
  api.post(`/b1/describe-speak/skip-speaking/${topicId}`, null, {
    meta: {
      invalidateCacheTags: [B1_DESCRIBE_SPEAK_CACHE_TAG],
      refreshUsageLimitsOnSuccess: true,
    },
  });

export const getB1FlashcardChapters = () =>
  api.cachedGet(
    "/b1/flashcard/chapters",
    { meta: { cacheTags: [B1_FLASHCARD_CACHE_TAG] } },
    "MEDIUM_PRIVATE",
  );
export const getB1Flashcards = (chapterId) =>
  api.cachedGet(
    `/b1/flashcard/cards/${chapterId}`,
    { meta: { cacheTags: [B1_FLASHCARD_CACHE_TAG] } },
    "MEDIUM_PRIVATE",
  );
export const saveB1FlashcardProgress = (data) =>
  api.post("/b1/flashcard/progress", data, {
    meta: {
      invalidateCacheTags: [B1_FLASHCARD_CACHE_TAG],
      ...(data?.advanced === true && { refreshUsageLimitsOnSuccess: true }),
    },
  });
export const getB1FlashcardMiniQuiz = (setId) =>
  api.cachedGet(
    `/b1/flashcard/quiz/mini/${setId}`,
    { meta: { cacheTags: [B1_FLASHCARD_CACHE_TAG] } },
    "MEDIUM_PRIVATE",
  );
export const getB1FlashcardFinalQuiz = (setId) =>
  api.cachedGet(
    `/b1/flashcard/quiz/final/${setId}`,
    { meta: { cacheTags: [B1_FLASHCARD_CACHE_TAG] } },
    "MEDIUM_PRIVATE",
  );
export const submitB1FlashcardQuiz = (data) =>
  api.post("/b1/flashcard/quiz/submit", data, {
    meta: { invalidateCacheTags: [B1_FLASHCARD_CACHE_TAG] },
  });

// ADMIN ENDPOINTS
export const getB1Chapters = (module) => api.get(`/admin/b1/chapters/${module}`);
export const reorderB1Chapters = (module, orderedIds) => api.put(`/admin/b1/reorder/${module}`, { orderedIds });
export const deleteB1Chapter = (module, chapterId) => api.delete(`/admin/b1/delete/${module}/${chapterId}`);
export const uploadB1Reading = (formData) => api.post("/admin/b1/upload/read-listen", formData, {
  headers: { "Content-Type": "multipart/form-data" },
});

export const getB1DescribeSpeakChaptersAdmin = () => api.get("/admin/b1/describe-speak/chapters");
export const reorderB1DescribeSpeakChapters = (orderedIds) => api.put("/admin/b1/describe-speak/reorder", { orderedIds });
export const deleteB1DescribeSpeakChapter = (chapterId) => api.delete(`/admin/b1/describe-speak/delete/${chapterId}`);
export const uploadB1DescribeSpeak = (formData) => api.post("/admin/b1/upload/describe-speak", formData, {
  headers: { "Content-Type": "multipart/form-data" },
});

export const uploadB1ExamPaper = (formData) => api.post("/admin/b1/exams/upload", formData, {
  headers: { "Content-Type": "multipart/form-data" },
});
export const getB1ExamPapersAdmin = () => api.get("/admin/b1/exams/papers");
export const deleteB1ExamPaper = (id) => api.delete(`/admin/b1/exams/papers/${id}`);

export const uploadB1Flashcard = (formData) => api.post("/admin/b1/upload/flashcard", formData, {
  headers: { "Content-Type": "multipart/form-data" },
});

// B1 EXAM PAPERS ENDPOINTS
export const uploadB1ExamOcr = (formData) => api.post("/b1/exams/upload-ocr", formData, {
  headers: { "Content-Type": "multipart/form-data" },
});
export const getB1Exams = () => api.get("/b1/exams");
export const getB1ExamPapers = (examType) => api.get(`/b1/exams/${examType}/papers`);
export const startB1ExamSubmission = (paperId) =>
  api.post(`/b1/exams/papers/${paperId}/start`, null, {
    meta: { refreshUsageLimitsOnSuccess: true },
  });
export const getB1ExamSubmissionStatus = (submissionId) => api.get(`/b1/exams/submissions/${submissionId}`);
export const getB1ExamSectionContent = (paperId, sectionType) => api.get(`/b1/exams/papers/${paperId}/sections/${sectionType}`);
export const submitB1ExamReadingAnswers = (submissionId, data) => api.post(`/b1/exams/submissions/${submissionId}/sections/reading/submit`, data);
export const submitB1ExamListeningAnswers = (submissionId, data) => api.post(`/b1/exams/submissions/${submissionId}/sections/listening/submit`, data);
export const submitB1ExamWritingAnswers = (submissionId, data) => api.post(`/b1/exams/submissions/${submissionId}/sections/writing/submit`, data);
export const submitB1ExamSpeakingAudio = (submissionId, formData) => api.post(`/b1/exams/submissions/${submissionId}/sections/speaking/submit`, formData, {
  headers: { "Content-Type": "multipart/form-data" },
});
export const resetB1ExamSubmission = (submissionId) => api.post(`/b1/exams/submissions/${submissionId}/reset`);

// B1 VIDEO & AUDIO ENDPOINTS
export const getB1Videos = (level) =>
  api.cachedGet(
    `/b1/video/list/${level}`,
    { meta: { cacheTags: [B1_VIDEO_CACHE_TAG] } },
    "MEDIUM_PRIVATE",
  );
export const getB1VideoById = (videoId) =>
  api.cachedGet(
    `/b1/video/${videoId}`,
    { meta: { cacheTags: [B1_VIDEO_CACHE_TAG] } },
    "MEDIUM_PRIVATE",
  );
export const submitB1VideoQuiz = (videoId, data) =>
  api.post(`/b1/video/${videoId}/submit`, data, {
    meta: {
      invalidateCacheTags: [B1_READ_LISTEN_CACHE_TAG, B1_VIDEO_CACHE_TAG],
      refreshUsageLimitsOnSuccess: true,
    },
  });
export const updateB1VideoProgress = (videoId, data) =>
  api.post(`/b1/video/${videoId}/progress`, data, {
    meta: {
      invalidateCacheTags: [B1_READ_LISTEN_CACHE_TAG, B1_VIDEO_CACHE_TAG],
    },
  });

// B1 VIDEO ADMIN ENDPOINTS
export const getB1VideosAdmin = () => api.get("/admin/b1/video/all");
export const initB1VideoUpload = (data) => api.post("/admin/b1/video/init", data);
export const completeB1VideoUpload = (formData) => api.post("/admin/b1/video/complete", formData, {
  headers: { "Content-Type": "multipart/form-data" },
});
export const deleteB1Video = (videoId) => api.delete(`/admin/b1/video/${videoId}`);
