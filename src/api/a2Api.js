import api from "./axios";

// FLASHCARD
export const getFlashcardChapters = () => api.get("/a2/flashcard/chapters");
export const getFlashcards = (chapterId) =>
  api.get(`/a2/flashcard/cards/${chapterId}`);
export const saveFlashcardProgress = (data) =>
  api.post("/a2/flashcard/progress", data);
export const generateMiniQuiz = (setId) =>
  api.get(`/a2/flashcard/quiz/mini/${setId}`);
export const generateFinalQuiz = (setId) =>
  api.get(`/a2/flashcard/quiz/final/${setId}`);
export const submitFlashcardQuiz = (data) =>
  api.post("/a2/flashcard/quiz/submit", data);

// GRAMMAR
export const getGrammarTopics = () => api.get("/a2/grammar/topics");
export const getGrammarTopicDetail = (topicId) =>
  api.get(`/a2/grammar/topic/${topicId}`);
export const getGrammarQuestions = (topicId) =>
  api.get(`/a2/grammar/questions/${topicId}`);
export const saveGrammarProgress = (data) =>
  api.post("/a2/grammar/progress", data);
export const checkGrammarAnswer = (data) => api.post("/a2/grammar/check", data);

// LISTENING
export const getListeningChapters = () => api.get("/a2/listening/chapters");
export const getListeningContent = (chapterId) =>
  api.get(`/a2/listening/content/${chapterId}`);
export const saveListeningProgress = (data) =>
  api.post("/a2/listening/progress", data);
export const checkListeningAnswers = (data) =>
  api.post("/a2/listening/check", data);

// SPEAKING
export const getSpeakingChapters = () => api.get("/a2/speaking/chapters");
export const getSpeakingContent = (chapterId) =>
  api.get(`/a2/speaking/content/${chapterId}`);
export const saveSpeakingProgress = (data) =>
  api.post("/a2/speaking/progress", data);
export const saveSpeakingAssessment = (data) =>
  api.post("/a2/speaking/assessment", data);

// READING
export const getReadingChapters = () => api.get("/a2/reading/chapters");
export const getReadingContent = (chapterId) =>
  api.get(`/a2/reading/content/${chapterId}`);
export const saveReadingProgress = (data) =>
  api.post("/a2/reading/progress", data);
export const checkReadingAnswers = (data) =>
  api.post("/a2/reading/check", data);

// TEST
export const getTestTopics = () => api.get("/a2/test/topics");
export const getTestProgress = (topicId) =>
  api.get(`/a2/test/progress/${topicId}`);
export const getTestSet = (topicId, level, setNumber) =>
  api.get(`/a2/test/set/${topicId}/${level}/${setNumber}`);
export const submitTest = (data) => api.post("/a2/test/submit", data);
export const getTestReview = (topicId) => api.get(`/a2/test/review/${topicId}`);
export const getTestResults = (topicId, level) =>
  api.get(`/a2/test/${topicId}/${level}/results`);

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
