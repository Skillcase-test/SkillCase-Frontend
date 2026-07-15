import api from "./axios";

export const adminGetCandidates = (
  page = 1,
  limit = 10,
  search = "",
  status = "total",
  startDate = "",
  endDate = "",
) =>
  api.get("/admin/job-screening/candidates", {
    params: {
      page,
      limit,
      search,
      status,
      start_date: startDate || undefined,
      end_date: endDate || undefined,
    },
  });

export const adminGetCandidateDetail = (userId) =>
  api.get(`/admin/job-screening/candidates/${userId}`);

export const adminUpdateCandidate = (userId, payload) =>
  api.put(`/admin/job-screening/candidates/${userId}`, payload);

export const adminUploadOfferLetter = (userId, formData, recruiterAccountId) =>
  api.post(`/admin/job-screening/candidates/${userId}/offer-letter`, formData, {
    params: recruiterAccountId ? { recruiterAccountId } : {},
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

export const adminUploadTrainingScheduleImage = (userId, formData) =>
  api.post(`/admin/job-screening/candidates/${userId}/training-schedule-image`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

export const adminUploadRecruiterScheduleImage = (userId, formData, recruiterAccountId) =>
  api.post(`/admin/job-screening/candidates/${userId}/recruiter-schedule-image`, formData, {
    params: recruiterAccountId ? { recruiterAccountId } : {},
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

export const getAdminDropdownOptions = () => api.get("/admin/job-screening/options");

export const adminGetSettings = () =>
  api.get("/admin/job-screening/settings");

export const adminUpdateSettings = (payload) =>
  api.post("/admin/job-screening/settings", payload);
