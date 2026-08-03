import api from "./axios";

// FLASHCARD
// These responses are cached, but the flashcard tag is invalidated after
// writes so the embedded user progress is not reused stale.
const A2_FLASHCARD_CACHE_TAG = "a2:flashcard";

export const getFlashcardChapters = () =>
  api.cachedGet(
    "/a2/flashcard/chapters",
    { meta: { cacheTags: [A2_FLASHCARD_CACHE_TAG] } },
    "MEDIUM_PRIVATE",
  );
export const getFlashcards = (chapterId) =>
  api.cachedGet(
    `/a2/flashcard/cards/${chapterId}`,
    { meta: { cacheTags: [A2_FLASHCARD_CACHE_TAG] } },
    "MEDIUM_PRIVATE",
  );
export const saveFlashcardProgress = (data) =>
  api.post("/a2/flashcard/progress", data, {
    meta: {
      invalidateCacheTags: [A2_FLASHCARD_CACHE_TAG],
      ...(data?.advanced === true && { refreshUsageLimitsOnSuccess: true }),
    },
  });
export const generateMiniQuiz = (setId) =>
  api.cachedGet(
    `/a2/flashcard/quiz/mini/${setId}`,
    { meta: { cacheTags: [A2_FLASHCARD_CACHE_TAG] } },
    "MEDIUM_PRIVATE",
  );
export const generateFinalQuiz = (setId) =>
  api.cachedGet(
    `/a2/flashcard/quiz/final/${setId}`,
    { meta: { cacheTags: [A2_FLASHCARD_CACHE_TAG] } },
    "MEDIUM_PRIVATE",
  );
export const submitFlashcardQuiz = (data) =>
  api.post("/a2/flashcard/quiz/submit", data, {
    meta: { invalidateCacheTags: [A2_FLASHCARD_CACHE_TAG] },
  });

// GRAMMAR
const A2_GRAMMAR_CACHE_TAG = "a2:grammar";

export const getGrammarTopics = () =>
  api.cachedGet(
    "/a2/grammar/topics",
    { meta: { cacheTags: [A2_GRAMMAR_CACHE_TAG] } },
    "MEDIUM_PRIVATE",
  );
export const getGrammarTopicDetail = (topicId) =>
  api.cachedGet(
    `/a2/grammar/topic/${topicId}`,
    { meta: { cacheTags: [A2_GRAMMAR_CACHE_TAG] } },
    "MEDIUM_PRIVATE",
  );
export const getGrammarQuestions = (topicId) =>
  api.cachedGet(
    `/a2/grammar/questions/${topicId}`,
    { meta: { cacheTags: [A2_GRAMMAR_CACHE_TAG] } },
    "MEDIUM_PRIVATE",
  );
export const saveGrammarProgress = (data) =>
  api.post("/a2/grammar/progress", data, {
    meta: {
      invalidateCacheTags: [A2_GRAMMAR_CACHE_TAG],
      ...(data?.isCompleted === true && { refreshUsageLimitsOnSuccess: true }),
    },
  });
export const checkGrammarAnswer = (data) =>
  api.post("/a2/grammar/check", data, {
    meta: { skipCacheInvalidation: true },
  });

// LISTENING
const A2_LISTENING_CACHE_TAG = "a2:listening";

export const getListeningChapters = () =>
  api.cachedGet(
    "/a2/listening/chapters",
    { meta: { cacheTags: [A2_LISTENING_CACHE_TAG] } },
    "MEDIUM_PRIVATE",
  );
export const getListeningContent = (chapterId) =>
  api.cachedGet(
    `/a2/listening/content/${chapterId}`,
    { meta: { cacheTags: [A2_LISTENING_CACHE_TAG] } },
    "MEDIUM_PRIVATE",
  );
export const saveListeningProgress = (data) =>
  api.post("/a2/listening/progress", data, {
    meta: {
      invalidateCacheTags: [A2_LISTENING_CACHE_TAG],
      ...(data?.isCompleted === true && { refreshUsageLimitsOnSuccess: true }),
    },
  });
export const checkListeningAnswers = (data) =>
  api.post("/a2/listening/check", data, {
    meta: { skipCacheInvalidation: true },
  });

// SPEAKING
const A2_SPEAKING_CACHE_TAG = "a2:speaking";

export const getSpeakingChapters = () =>
  api.cachedGet(
    "/a2/speaking/chapters",
    { meta: { cacheTags: [A2_SPEAKING_CACHE_TAG] } },
    "MEDIUM_PRIVATE",
  );
export const getSpeakingContent = (chapterId) =>
  api.cachedGet(
    `/a2/speaking/content/${chapterId}`,
    { meta: { cacheTags: [A2_SPEAKING_CACHE_TAG] } },
    "MEDIUM_PRIVATE",
  );
export const saveSpeakingProgress = (data) =>
  api.post("/a2/speaking/progress", data, {
    meta: {
      invalidateCacheTags: [A2_SPEAKING_CACHE_TAG],
      ...(data?.advanced === true && { refreshUsageLimitsOnSuccess: true }),
    },
  });
export const saveSpeakingAssessment = (data) =>
  api.post("/a2/speaking/assessment", data, {
    meta: { invalidateCacheTags: [A2_SPEAKING_CACHE_TAG] },
  });

// READING
const A2_READING_CACHE_TAG = "a2:reading";

export const getReadingChapters = () =>
  api.cachedGet(
    "/a2/reading/chapters",
    { meta: { cacheTags: [A2_READING_CACHE_TAG] } },
    "MEDIUM_PRIVATE",
  );
export const getReadingContent = (chapterId) =>
  api.cachedGet(
    `/a2/reading/content/${chapterId}`,
    { meta: { cacheTags: [A2_READING_CACHE_TAG] } },
    "MEDIUM_PRIVATE",
  );
export const saveReadingProgress = (data) =>
  api.post("/a2/reading/progress", data, {
    meta: {
      invalidateCacheTags: [A2_READING_CACHE_TAG],
      ...(data?.isCompleted === true && { refreshUsageLimitsOnSuccess: true }),
    },
  });
export const checkReadingAnswers = (data) =>
  api.post("/a2/reading/check", data, {
    meta: { skipCacheInvalidation: true },
  });

// TEST
const A2_TEST_CACHE_TAG = "a2:test";

export const getTestTopics = () =>
  api.cachedGet(
    "/a2/test/topics",
    { meta: { cacheTags: [A2_TEST_CACHE_TAG] } },
    "MEDIUM_PRIVATE",
  );
export const getTestProgress = (topicId) =>
  api.cachedGet(`/a2/test/progress/${topicId}`, {}, "NO_CACHE");
export const getTestSet = (topicId, level, setNumber) =>
  api.cachedGet(`/a2/test/set/${topicId}/${level}/${setNumber}`, {}, "NO_CACHE");
export const submitTest = (data) =>
  api.post("/a2/test/submit", data, {
    meta: {
      invalidateCacheTags: [A2_TEST_CACHE_TAG],
      refreshUsageLimitsOnSuccess: true,
    },
  });
export const getTestReview = (topicId) =>
  api.cachedGet(
    `/a2/test/review/${topicId}`,
    { meta: { cacheTags: [A2_TEST_CACHE_TAG] } },
    "MEDIUM_PRIVATE",
  );
export const getTestResults = (topicId, level) =>
  api.cachedGet(
    `/a2/test/${topicId}/${level}/results`,
    { meta: { cacheTags: [A2_TEST_CACHE_TAG] } },
    "MEDIUM_PRIVATE",
  );

// ADMIN FUNCTIONS
// Generic chapter operations
export const getA2Chapters = (module) =>
  api.get(`/admin/a2/chapters/${module}`);
export const reorderA2Chapters = (module, orderedIds) =>
  api.put(`/admin/a2/reorder/${module}`, { orderedIds });
export const deleteA2Chapter = (module, chapterId) =>
  api.delete(`/admin/a2/delete/${module}/${chapterId}`);

// Get JSON templates
export const getA2Template = (module) =>
  api.get(`/admin/a2/template/${module}`);

// Upload functions for each module
export const uploadA2Flashcard = (formData) =>
  api.post("/admin/a2/upload/flashcard", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
export const uploadA2Grammar = (formData) =>
  api.post("/admin/a2/upload/grammar", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
export const uploadA2Listening = (formData) =>
  api.post("/admin/a2/upload/listening", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
export const uploadA2Speaking = (formData) =>
  api.post("/admin/a2/upload/speaking", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
export const uploadA2Reading = (formData) =>
  api.post("/admin/a2/upload/reading", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
export const uploadA2Test = (formData) =>
  api.post("/admin/a2/upload/test", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
