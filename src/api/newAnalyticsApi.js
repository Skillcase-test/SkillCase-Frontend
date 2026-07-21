import api from "./axios";

export const newAnalyticsApi = {
  catalog: () => api.get("/admin/new-analytics/catalog"),
  metrics: (params) => api.get("/admin/new-analytics/metrics", { params }),
  journeys: (params) => api.get("/admin/new-analytics/journeys", { params }),
  journey: (subjectId, date) =>
    api.get(`/admin/new-analytics/journeys/${encodeURIComponent(subjectId)}`, {
      params: { date },
    }),
  refresh: (date) => api.post("/admin/new-analytics/refresh", { date }),
  refreshStatus: () => api.get("/admin/new-analytics/refresh-status"),
};
