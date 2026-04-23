import api from "./axios";

export const termsApi = {
  listTemplates: () => api.get("/admin/terms/templates"),
  createTemplate: (formData) =>
    api.post("/admin/terms/templates", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  getTemplateDetail: (templateId) => api.get(`/admin/terms/templates/${templateId}`),
  saveTemplateFields: (templateId, fields) =>
    api.put(`/admin/terms/templates/${templateId}/fields`, { fields }),
  updateTemplateStatus: (templateId, status) =>
    api.patch(`/admin/terms/templates/${templateId}/status`, { status }),
  deleteTemplate: (templateId) => api.delete(`/admin/terms/templates/${templateId}`),
  sendInvite: (templateId, payload) =>
    api.post(`/admin/terms/templates/${templateId}/send`, payload),
  listEnvelopes: (params = {}) => api.get("/admin/terms/envelopes", { params }),
  getEnvelopeDetail: (envelopeId) => api.get(`/admin/terms/envelopes/${envelopeId}`),
  resolveInvite: (token) => api.get(`/terms/invite/${token}`),
  submitInvite: (token, payload) => api.post(`/terms/invite/${token}/submit`, payload),
};
