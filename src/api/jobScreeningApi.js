import api from "./axios";

export const getProgress = () => api.get("/job-screening/progress");

export const completeWelcome = () => api.post("/job-screening/welcome-complete");

export const uploadProfileDocs = (formData) =>
  api.post("/job-screening/profile", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

export const checkInterview = () => api.post("/job-screening/check-interview");

export const checkAgreement = () => api.post("/job-screening/check-agreement");

export const startAgreement = () => api.post("/job-screening/start-agreement");

export const downloadOfferLetter = () => api.get("/job-screening/offer-letter/download");

export const uploadAdditionalDoc = (docId, formData) =>
  api.post(`/job-screening/additional-documents/${docId}`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

export const deleteAdditionalDoc = (docId) =>
  api.delete(`/job-screening/additional-documents/${docId}`);

export const refreshAdditionalDocs = () =>
  api.post("/job-screening/check-additional-docs");

export const skipRecruiterStatus = () =>
  api.post("/job-screening/skip-recruiter-status");

