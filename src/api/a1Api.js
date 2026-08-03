import api from "./axios";

// Migration
export const getA1MigrationStatus = () =>
  api.cachedGet("/a1-migration/status", {}, "SHORT_PRIVATE");
export const saveA1MigrationDecision = (action) =>
  api.post("/a1-migration/decision", { action });
export const getA1EntryRoute = () =>
  api.cachedGet("/a1-migration/entry-route", {}, "SHORT_PRIVATE");

// Flashcard
// These responses are cached, but the flashcard tag is invalidated after
// writes so the embedded user progress is not reused stale.
const A1_FLASHCARD_CACHE_TAG = "a1:flashcard";

export const getFlashcardChapters = () =>
  api.cachedGet(
    "/a1/flashcard/chapters",
    { meta: { cacheTags: [A1_FLASHCARD_CACHE_TAG] } },
    "MEDIUM_PRIVATE",
  );
export const getFlashcards = (chapterId) =>
  api.cachedGet(
    `/a1/flashcard/cards/${chapterId}`,
    { meta: { cacheTags: [A1_FLASHCARD_CACHE_TAG] } },
    "MEDIUM_PRIVATE",
  );
export const saveFlashcardProgress = (data) =>
  api.post("/a1/flashcard/progress", data, {
    meta: { invalidateCacheTags: [A1_FLASHCARD_CACHE_TAG] },
  });
export const generateMiniQuiz = (setId) =>
  api.cachedGet(
    `/a1/flashcard/quiz/mini/${setId}`,
    { meta: { cacheTags: [A1_FLASHCARD_CACHE_TAG] } },
    "MEDIUM_PRIVATE",
  );
export const generateFinalQuiz = (setId) =>
  api.cachedGet(
    `/a1/flashcard/quiz/final/${setId}`,
    { meta: { cacheTags: [A1_FLASHCARD_CACHE_TAG] } },
    "MEDIUM_PRIVATE",
  );
export const submitFlashcardQuiz = (data) =>
  api.post("/a1/flashcard/quiz/submit", data, {
    meta: { invalidateCacheTags: [A1_FLASHCARD_CACHE_TAG] },
  });

// Grammar
const A1_GRAMMAR_CACHE_TAG = "a1:grammar";

export const getGrammarTopics = () =>
  api.cachedGet(
    "/a1/grammar/topics",
    { meta: { cacheTags: [A1_GRAMMAR_CACHE_TAG] } },
    "MEDIUM_PRIVATE",
  );
export const getGrammarTopicDetail = (topicId) =>
  api.cachedGet(
    `/a1/grammar/topic/${topicId}`,
    { meta: { cacheTags: [A1_GRAMMAR_CACHE_TAG] } },
    "MEDIUM_PRIVATE",
  );
export const getGrammarQuestions = (topicId) =>
  api.cachedGet(
    `/a1/grammar/questions/${topicId}`,
    { meta: { cacheTags: [A1_GRAMMAR_CACHE_TAG] } },
    "MEDIUM_PRIVATE",
  );
export const saveGrammarProgress = (data) =>
  api.post("/a1/grammar/progress", data, {
    meta: { invalidateCacheTags: [A1_GRAMMAR_CACHE_TAG] },
  });
export const checkGrammarAnswer = (data) =>
  api.post("/a1/grammar/check", data, {
    meta: { skipCacheInvalidation: true },
  });

// Reading
const A1_READING_CACHE_TAG = "a1:reading";

export const getReadingChapters = () =>
  api.cachedGet(
    "/a1/reading/chapters",
    { meta: { cacheTags: [A1_READING_CACHE_TAG] } },
    "MEDIUM_PRIVATE",
  );
export const getReadingContent = (chapterId) =>
  api.cachedGet(
    `/a1/reading/content/${chapterId}`,
    { meta: { cacheTags: [A1_READING_CACHE_TAG] } },
    "MEDIUM_PRIVATE",
  );
export const saveReadingProgress = (data) =>
  api.post("/a1/reading/progress", data, {
    meta: { invalidateCacheTags: [A1_READING_CACHE_TAG] },
  });
export const checkReadingAnswers = (data) =>
  api.post("/a1/reading/check", data, {
    meta: { skipCacheInvalidation: true },
  });

// Listening
const A1_LISTENING_CACHE_TAG = "a1:listening";

export const getListeningChapters = () =>
  api.cachedGet(
    "/a1/listening/chapters",
    { meta: { cacheTags: [A1_LISTENING_CACHE_TAG] } },
    "MEDIUM_PRIVATE",
  );
export const getListeningContent = (chapterId) =>
  api.cachedGet(
    `/a1/listening/content/${chapterId}`,
    { meta: { cacheTags: [A1_LISTENING_CACHE_TAG] } },
    "MEDIUM_PRIVATE",
  );
export const saveListeningProgress = (data) =>
  api.post("/a1/listening/progress", data, {
    meta: { invalidateCacheTags: [A1_LISTENING_CACHE_TAG] },
  });
export const checkListeningAnswers = (data) =>
  api.post("/a1/listening/check", data, {
    meta: { skipCacheInvalidation: true },
  });

// Speaking
const A1_SPEAKING_CACHE_TAG = "a1:speaking";

export const getSpeakingChapters = () =>
  api.cachedGet(
    "/a1/speaking/chapters",
    { meta: { cacheTags: [A1_SPEAKING_CACHE_TAG] } },
    "MEDIUM_PRIVATE",
  );
export const getSpeakingContent = (chapterId) =>
  api.cachedGet(
    `/a1/speaking/content/${chapterId}`,
    { meta: { cacheTags: [A1_SPEAKING_CACHE_TAG] } },
    "MEDIUM_PRIVATE",
  );
export const saveSpeakingProgress = (data) =>
  api.post("/a1/speaking/progress", data, {
    meta: { invalidateCacheTags: [A1_SPEAKING_CACHE_TAG] },
  });
export const saveSpeakingAssessment = (data) =>
  api.post("/a1/speaking/assessment", data, {
    meta: { invalidateCacheTags: [A1_SPEAKING_CACHE_TAG] },
  });

// Test
const A1_TEST_CACHE_TAG = "a1:test";

export const getTestTopics = () =>
  api.cachedGet(
    "/a1/test/topics",
    { meta: { cacheTags: [A1_TEST_CACHE_TAG] } },
    "MEDIUM_PRIVATE",
  );
export const getTestProgress = (topicId) =>
  api.cachedGet(`/a1/test/progress/${topicId}`, {}, "NO_CACHE");
export const getTestSet = (topicId, level, setNumber) =>
  api.cachedGet(`/a1/test/set/${topicId}/${level}/${setNumber}`, {}, "NO_CACHE");
export const submitTest = (data) =>
  api.post("/a1/test/submit", data, {
    meta: { invalidateCacheTags: [A1_TEST_CACHE_TAG] },
  });
export const getTestReview = (topicId) =>
  api.cachedGet(
    `/a1/test/review/${topicId}`,
    { meta: { cacheTags: [A1_TEST_CACHE_TAG] } },
    "MEDIUM_PRIVATE",
  );
export const getTestResults = (topicId, level) =>
  api.cachedGet(
    `/a1/test/${topicId}/${level}/results`,
    { meta: { cacheTags: [A1_TEST_CACHE_TAG] } },
    "MEDIUM_PRIVATE",
  );

// ADMIN FUNCTIONS
export const getA1Chapters = (module) =>
  api.get(`/admin/a1/chapters/${module}`);
export const reorderA1Chapters = (module, orderedIds) =>
  api.put(`/admin/a1/reorder/${module}`, { orderedIds });
export const deleteA1Chapter = (module, chapterId) =>
  api.delete(`/admin/a1/delete/${module}/${chapterId}`);
export const getA1Template = (module) =>
  api.get(`/admin/a1/template/${module}`);

export const uploadA1Grammar = (formData) =>
  api.post("/admin/a1/upload/grammar", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

export const uploadA1Flashcard = (formData) =>
  api.post("/admin/a1/upload/flashcard", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

export const uploadA1Reading = (formData) =>
  api.post("/admin/a1/upload/reading", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

export const uploadA1Listening = (formData) =>
  api.post("/admin/a1/upload/listening", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

export const uploadA1Speaking = (formData) =>
  api.post("/admin/a1/upload/speaking", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

export const uploadA1Test = (formData) =>
  api.post("/admin/a1/upload/test", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
