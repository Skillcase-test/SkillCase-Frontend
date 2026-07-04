import api from "./axios";

// STUDENT ENDPOINTS
export const getB1ReadingChapters = (module) => api.get(`/b1/read-listen/chapters/${module}`);
export const getB1ReadingContent = (contentId) => api.get(`/b1/read-listen/content/${contentId}`);
export const submitB1ReadingQuiz = (data) => api.post("/b1/read-listen/submit", data);

export const getB1DescribeSpeakChapters = () => api.get("/b1/describe-speak/chapters");
export const getB1DescribeSpeakContent = (topicId) => api.get(`/b1/describe-speak/content/${topicId}`);
export const uploadB1DescribeSpeakOcr = (formData) => api.post("/b1/describe-speak/upload-ocr", formData, {
  headers: { "Content-Type": "multipart/form-data" },
});
export const submitB1DescribeSpeakWriting = (data) => api.post("/b1/describe-speak/submit-writing", data);
export const submitB1DescribeSpeakSpeaking = (formData) => api.post("/b1/describe-speak/submit-speaking", formData, {
  headers: { "Content-Type": "multipart/form-data" },
});
export const resetB1DescribeSpeakProgress = (topicId) => api.post(`/b1/describe-speak/reset/${topicId}`);

export const getB1FlashcardChapters = () => api.get("/b1/flashcard/chapters");
export const getB1Flashcards = (chapterId) => api.get(`/b1/flashcard/cards/${chapterId}`);
export const saveB1FlashcardProgress = (data) => api.post("/b1/flashcard/progress", data);
export const getB1FlashcardMiniQuiz = (setId) => api.get(`/b1/flashcard/quiz/mini/${setId}`);
export const getB1FlashcardFinalQuiz = (setId) => api.get(`/b1/flashcard/quiz/final/${setId}`);
export const submitB1FlashcardQuiz = (data) => api.post("/b1/flashcard/quiz/submit", data);

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
export const startB1ExamSubmission = (paperId) => api.post(`/b1/exams/papers/${paperId}/start`);
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
export const getB1Videos = (level) => api.get(`/b1/video/list/${level}`);
export const getB1VideoById = (videoId) => api.get(`/b1/video/${videoId}`);
export const submitB1VideoQuiz = (videoId, data) => api.post(`/b1/video/${videoId}/submit`, data);
export const updateB1VideoProgress = (videoId, data) => api.post(`/b1/video/${videoId}/progress`, data);

// B1 VIDEO ADMIN ENDPOINTS
export const getB1VideosAdmin = () => api.get("/admin/b1/video/all");
export const initB1VideoUpload = (data) => api.post("/admin/b1/video/init", data);
export const completeB1VideoUpload = (formData) => api.post("/admin/b1/video/complete", formData, {
  headers: { "Content-Type": "multipart/form-data" },
});
export const deleteB1Video = (videoId) => api.delete(`/admin/b1/video/${videoId}`);


