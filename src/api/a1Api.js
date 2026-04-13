import api from "./axios";

// Migration
export const getA1MigrationStatus = () => api.get("/a1-migration/status");
export const saveA1MigrationDecision = (action) =>
  api.post("/a1-migration/decision", { action });
export const getA1EntryRoute = () => api.get("/a1-migration/entry-route");

// Flashcard
export const getFlashcardChapters = () => api.get("/a1/flashcard/chapters");
export const getFlashcards = (chapterId) =>
  api.get(`/a1/flashcard/cards/${chapterId}`);
export const saveFlashcardProgress = (data) =>
  api.post("/a1/flashcard/progress", data);
export const generateMiniQuiz = (setId) =>
  api.get(`/a1/flashcard/quiz/mini/${setId}`);
export const generateFinalQuiz = (setId) =>
  api.get(`/a1/flashcard/quiz/final/${setId}`);
export const submitFlashcardQuiz = (data) =>
  api.post("/a1/flashcard/quiz/submit", data);

// Grammar
export const getGrammarTopics = () => api.get("/a1/grammar/topics");
export const getGrammarTopicDetail = (topicId) =>
  api.get(`/a1/grammar/topic/${topicId}`);
export const getGrammarQuestions = (topicId) =>
  api.get(`/a1/grammar/questions/${topicId}`);
export const saveGrammarProgress = (data) =>
  api.post("/a1/grammar/progress", data);
export const checkGrammarAnswer = (data) => api.post("/a1/grammar/check", data);

// Reading
export const getReadingChapters = () => api.get("/a1/reading/chapters");
export const getReadingContent = (chapterId) =>
  api.get(`/a1/reading/content/${chapterId}`);
export const saveReadingProgress = (data) =>
  api.post("/a1/reading/progress", data);
export const checkReadingAnswers = (data) =>
  api.post("/a1/reading/check", data);

// Listening
export const getListeningChapters = () => api.get("/a1/listening/chapters");
export const getListeningContent = (chapterId) =>
  api.get(`/a1/listening/content/${chapterId}`);
export const saveListeningProgress = (data) =>
  api.post("/a1/listening/progress", data);
export const checkListeningAnswers = (data) =>
  api.post("/a1/listening/check", data);

// Speaking
export const getSpeakingChapters = () => api.get("/a1/speaking/chapters");
export const getSpeakingContent = (chapterId) =>
  api.get(`/a1/speaking/content/${chapterId}`);
export const saveSpeakingProgress = (data) =>
  api.post("/a1/speaking/progress", data);
export const saveSpeakingAssessment = (data) =>
  api.post("/a1/speaking/assessment", data);

// Test
export const getTestTopics = () => api.get("/a1/test/topics");
export const getTestProgress = (topicId) =>
  api.get(`/a1/test/progress/${topicId}`);
export const getTestSet = (topicId, level, setNumber) =>
  api.get(`/a1/test/set/${topicId}/${level}/${setNumber}`);
export const submitTest = (data) => api.post("/a1/test/submit", data);
export const getTestReview = (topicId) => api.get(`/a1/test/review/${topicId}`);
export const getTestResults = (topicId, level) =>
  api.get(`/a1/test/${topicId}/${level}/results`);

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
