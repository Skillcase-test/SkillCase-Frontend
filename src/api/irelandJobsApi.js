import api from "./axios";

export const getIrelandProgress = () => api.get("/ireland-jobs/progress");

export const completeIrelandWelcome = () =>
  api.post("/ireland-jobs/welcome-complete");

export const uploadIrelandResume = (formData) =>
  api.post("/ireland-jobs/resume", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

export const updateIrelandProfileFields = (payload) =>
  api.put("/ireland-jobs/profile-fields", payload);

export const markIrelandResumeRejectionViewed = () =>
  api.post("/ireland-jobs/resume/view-rejection");

export const setIrelandDocAnswers = (answers) =>
  api.put("/ireland-jobs/documents/answers", { answers });

// source="role_select" marks an upload from the Choose-your-path step, so the
// server leaves the Documents-step answer alone (see uploadDocument).
export const uploadIrelandDocument = (docId, formData, { source } = {}) =>
  api.post(`/ireland-jobs/documents/${docId}`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
    ...(source ? { params: { source } } : {}),
  });

export const deleteIrelandDocument = (docId) =>
  api.delete(`/ireland-jobs/documents/${docId}`);

export const selectIrelandRole = (role) =>
  api.post("/ireland-jobs/role", { role });

export const markIrelandIeltsInterest = () =>
  api.post("/ireland-jobs/ielts-interest");

export const markIrelandOpportunityInterest = (role) =>
  api.post("/ireland-jobs/opportunity-interest", { role });
