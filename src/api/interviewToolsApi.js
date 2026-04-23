import api from "./axios";

export const interviewToolsApi = {
  listPositions: () => api.get("/admin/interview-tools/positions"),

  getPosition: (positionId) =>
    api.get(`/admin/interview-tools/positions/${positionId}`),

  createPosition: (payload) =>
    api.post("/admin/interview-tools/positions", payload),

  duplicatePosition: (positionId) =>
    api.post(`/admin/interview-tools/positions/${positionId}/duplicate`),

  updatePosition: (positionId, payload) =>
    api.put(`/admin/interview-tools/positions/${positionId}`, payload),

  deletePosition: (positionId) =>
    api.delete(`/admin/interview-tools/positions/${positionId}`),

  updatePositionStatus: (positionId, status) =>
    api.patch(`/admin/interview-tools/positions/${positionId}/status`, {
      status,
    }),

  getUploadUrl: (payload) =>
    api.post("/admin/interview-tools/upload-url", payload),

  getCandidates: (positionId) =>
    api.get(`/admin/interview-tools/positions/${positionId}/candidates`),

  getCandidateDetail: (positionId, submissionId) =>
    api.get(
      `/admin/interview-tools/positions/${positionId}/candidates/${submissionId}`,
    ),

  reviewCandidate: (positionId, submissionId, payload) =>
    api.patch(
      `/admin/interview-tools/positions/${positionId}/candidates/${submissionId}/review`,
      payload,
    ),

  getPublicPosition: (slug) => api.get(`/interview-tools/public/${slug}`),

  startSubmission: (slug, payload) =>
    api.post(`/interview-tools/public/${slug}/start`, payload),

  restoreSubmission: (slug, sessionToken) =>
    api.get(`/interview-tools/public/${slug}/session/${sessionToken}`),

  getPublicUploadUrl: (submissionId, payload) =>
    api.post(`/interview-tools/submissions/${submissionId}/upload-url`, payload),

  saveAnswer: (submissionId, payload) =>
    api.post(`/interview-tools/submissions/${submissionId}/answers`, payload),

  finishSubmission: (submissionId, payload) =>
    api.post(`/interview-tools/submissions/${submissionId}/finish`, payload),
};
