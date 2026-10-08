import api from "./axios";

export const adminGetIrelandCandidates = (
  page = 1,
  limit = 20,
  search = "",
  status = "all",
) =>
  api.get("/admin/ireland-jobs/candidates", {
    params: { page, limit, search, status },
  });

export const adminGetIrelandCandidateDetail = (userId) =>
  api.get(`/admin/ireland-jobs/candidates/${userId}`);

export const adminUpdateIrelandCandidate = (userId, payload) =>
  api.put(`/admin/ireland-jobs/candidates/${userId}`, payload);

export const adminReviewIrelandResume = (userId, status, reason) =>
  api.patch(`/admin/ireland-jobs/candidates/${userId}/resume`, {
    status,
    reason,
  });

export const adminReviewIrelandDocument = (userId, docId, status, reason) =>
  api.patch(`/admin/ireland-jobs/candidates/${userId}/documents/${docId}`, {
    status,
    reason,
  });

export const adminGetIrelandDocRequirements = () =>
  api.get("/admin/ireland-jobs/document-requirements");

export const adminAddIrelandDocRequirement = (label) =>
  api.post("/admin/ireland-jobs/document-requirements", { label });

export const adminDeleteIrelandDocRequirement = (docId) =>
  api.delete(`/admin/ireland-jobs/document-requirements/${docId}`);

export const adminEnrollIrelandCandidate = (identifier, qualification) =>
  api.post("/admin/ireland-jobs/candidates/enroll", {
    identifier,
    qualification,
  });

export const adminSetIrelandActive = (userId, active, reason) =>
  api.patch(`/admin/ireland-jobs/candidates/${userId}/active`, {
    active,
    reason,
  });

export const adminGetIrelandStepsConfig = () =>
  api.get("/admin/ireland-jobs/steps-config");

export const adminUpdateIrelandStepsConfig = (payload) =>
  api.put("/admin/ireland-jobs/steps-config", payload);

export const adminGetIrelandOpportunityContent = () =>
  api.get("/admin/ireland-jobs/opportunity-content");

export const adminUpdateIrelandOpportunityContent = (role, payload) =>
  api.put("/admin/ireland-jobs/opportunity-content", { role, ...payload });
