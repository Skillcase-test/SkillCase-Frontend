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
