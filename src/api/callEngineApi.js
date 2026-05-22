import api from "./axios";

export const callEngineApi = {
  getCallers: () => api.get("/admin/call-engine/callers"),
  getOverview: (payload) => api.post("/admin/call-engine/overview", payload),
  getReport: (payload) => api.post("/admin/call-engine/report", payload),
  getLogs: (payload) => api.post("/admin/call-engine/logs", payload),
  getMetricLogs: (payload) => api.post("/admin/call-engine/metric-logs", payload),
  askAssistant: (payload) => api.post("/admin/call-engine/assistant/ask", payload),
  getInsights: (payload) => api.post("/admin/call-engine/assistant/insights", payload),
  syncBackfill: (payload) => api.post("/admin/call-engine/sync/backfill", payload),
};
