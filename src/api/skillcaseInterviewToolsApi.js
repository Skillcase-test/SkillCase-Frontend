import api from "./axios";

export const skillcaseInterviewToolsApi = {
  listPositions: () => api.get("/admin/skillcase-interviews/positions"),

  getPosition: (positionId) =>
    api.get(`/admin/skillcase-interviews/positions/${positionId}`),

  createPosition: (payload) =>
    api.post("/admin/skillcase-interviews/positions", payload),

  duplicatePosition: (positionId) =>
    api.post(`/admin/skillcase-interviews/positions/${positionId}/duplicate`),

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
  inviteCandidate: (positionId, payload) =>
    api.post(`/admin/skillcase-interviews/positions/${positionId}/invite`, payload),

  getCandidateDetail: (positionId, submissionId) =>
    api.get(
      `/admin/skillcase-interviews/positions/${positionId}/candidates/${submissionId}`,
    ),

  reviewCandidate: (positionId, submissionId, payload) =>
    api.patch(
      `/admin/skillcase-interviews/positions/${positionId}/candidates/${submissionId}/review`,
      payload,
    ),

  getPositionEventLog: (positionId) =>
    api.get(`/admin/skillcase-interviews/positions/${positionId}/events`),
  getInviteEventLog: (positionId) =>
    api.get(`/admin/skillcase-interviews/positions/${positionId}/invite-events`),

  downloadCandidatePDF: (positionId, submissionId) =>
    api.get(
      `/admin/skillcase-interviews/positions/${positionId}/candidates/${submissionId}/pdf`,
      { responseType: "blob" },
    ),

  downloadInterviewPDF: (positionId) =>
    api.get(`/admin/skillcase-interviews/positions/${positionId}/pdf`, {
      responseType: "blob",
    }),
};
