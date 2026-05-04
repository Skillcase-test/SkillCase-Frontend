import api from "./axios";

// Migration
export const getA1MigrationStatus = () =>
  api.cachedGet("/a1-migration/status", {}, "SHORT_PRIVATE");
export const saveA1MigrationDecision = (action) =>
  api.post("/a1-migration/decision", { action });
export const getA1EntryRoute = () =>
  api.cachedGet("/a1-migration/entry-route", {}, "SHORT_PRIVATE");

// Flashcard
export const getFlashcardChapters = () =>
  api.cachedGet("/a1/flashcard/chapters", {}, "MEDIUM_PRIVATE");
export const getFlashcards = (chapterId) =>
  api.cachedGet(`/a1/flashcard/cards/${chapterId}`, {}, "MEDIUM_PRIVATE");
export const saveFlashcardProgress = (data) =>
  api.post("/a1/flashcard/progress", data);
export const generateMiniQuiz = (setId) =>
  api.cachedGet(`/a1/flashcard/quiz/mini/${setId}`, {}, "MEDIUM_PRIVATE");
export const generateFinalQuiz = (setId) =>
  api.cachedGet(`/a1/flashcard/quiz/final/${setId}`, {}, "MEDIUM_PRIVATE");
export const submitFlashcardQuiz = (data) =>
  api.post("/a1/flashcard/quiz/submit", data);

// Grammar
export const getGrammarTopics = () =>
  api.cachedGet("/a1/grammar/topics", {}, "MEDIUM_PRIVATE");
export const getGrammarTopicDetail = (topicId) =>
  api.cachedGet(`/a1/grammar/topic/${topicId}`, {}, "MEDIUM_PRIVATE");
export const getGrammarQuestions = (topicId) =>
  api.cachedGet(`/a1/grammar/questions/${topicId}`, {}, "MEDIUM_PRIVATE");
export const saveGrammarProgress = (data) =>
  api.post("/a1/grammar/progress", data);
export const checkGrammarAnswer = (data) => api.post("/a1/grammar/check", data);

// Reading
export const getReadingChapters = () =>
  api.cachedGet("/a1/reading/chapters", {}, "MEDIUM_PRIVATE");
export const getReadingContent = (chapterId) =>
  api.cachedGet(`/a1/reading/content/${chapterId}`, {}, "MEDIUM_PRIVATE");
export const saveReadingProgress = (data) =>
  api.post("/a1/reading/progress", data);
export const checkReadingAnswers = (data) =>
  api.post("/a1/reading/check", data);

// Listening
export const getListeningChapters = () =>
  api.cachedGet("/a1/listening/chapters", {}, "MEDIUM_PRIVATE");
export const getListeningContent = (chapterId) =>
  api.cachedGet(`/a1/listening/content/${chapterId}`, {}, "MEDIUM_PRIVATE");
export const saveListeningProgress = (data) =>
  api.post("/a1/listening/progress", data);
export const checkListeningAnswers = (data) =>
  api.post("/a1/listening/check", data);

// Speaking
export const getSpeakingChapters = () =>
  api.cachedGet("/a1/speaking/chapters", {}, "MEDIUM_PRIVATE");
export const getSpeakingContent = (chapterId) =>
  api.cachedGet(`/a1/speaking/content/${chapterId}`, {}, "MEDIUM_PRIVATE");
export const saveSpeakingProgress = (data) =>
  api.post("/a1/speaking/progress", data);
export const saveSpeakingAssessment = (data) =>
  api.post("/a1/speaking/assessment", data);

// Test
export const getTestTopics = () =>
  api.cachedGet("/a1/test/topics", {}, "MEDIUM_PRIVATE");
export const getTestProgress = (topicId) =>
  api.cachedGet(`/a1/test/progress/${topicId}`, {}, "NO_CACHE");
export const getTestSet = (topicId, level, setNumber) =>
  api.cachedGet(`/a1/test/set/${topicId}/${level}/${setNumber}`, {}, "NO_CACHE");
export const submitTest = (data) => api.post("/a1/test/submit", data);
export const getTestReview = (topicId) =>
  api.cachedGet(`/a1/test/review/${topicId}`, {}, "MEDIUM_PRIVATE");
export const getTestResults = (topicId, level) =>
  api.cachedGet(`/a1/test/${topicId}/${level}/results`, {}, "MEDIUM_PRIVATE");

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
