import api from "./axios";

export const skillcaseInterviewToolsApi = {
  listPositions: () => api.get("/admin/skillcase-interviews/positions"),

  getPosition: (positionId) =>
    api.get(`/admin/skillcase-interviews/positions/${positionId}`),

  createPosition: (payload) =>
    api.post("/admin/skillcase-interviews/positions", payload),

  updatePosition: (positionId, payload) =>
    api.put(`/admin/skillcase-interviews/positions/${positionId}`, payload),

  deletePosition: (positionId) =>
    api.delete(`/admin/skillcase-interviews/positions/${positionId}`),

  updatePositionStatus: (positionId, status) =>
    api.patch(`/admin/skillcase-interviews/positions/${positionId}/status`, {
      status,
    }),

  getUploadUrl: (payload) =>
    api.post("/admin/skillcase-interviews/upload-url", payload),

  getCandidates: (positionId) =>
    api.get(`/admin/skillcase-interviews/positions/${positionId}/candidates`),

  getCandidateDetail: (positionId, submissionId) =>
    api.get(
      `/admin/skillcase-interviews/positions/${positionId}/candidates/${submissionId}`,
    ),

  reviewCandidate: (positionId, submissionId, payload) =>
    api.patch(
      `/admin/skillcase-interviews/positions/${positionId}/candidates/${submissionId}/review`,
      payload,
    ),
};
