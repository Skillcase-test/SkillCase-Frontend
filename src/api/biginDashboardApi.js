import api from "./axios";

export const biginDashboardApi = {
  summary: (params) => api.get("/admin/bigin-dashboard/summary", { params }),
  candidates: (params) =>
    api.get("/admin/bigin-dashboard/candidates", { params }),
  funnel: (params) => api.get("/admin/bigin-dashboard/funnel", { params }),
  leadAgeing: (params) => api.get("/admin/bigin-dashboard/lead-ageing", { params }),
  salesPerformance: (params) =>
    api.get("/admin/bigin-dashboard/sales-performance", { params }),
  leadsBySource: (params) =>
    api.get("/admin/bigin-dashboard/leads-by-source", { params }),
  conversionBySource: (params) =>
    api.get("/admin/bigin-dashboard/conversion-by-source", { params }),
  dailyTrend: (params) => api.get("/admin/bigin-dashboard/daily-trend", { params }),
  syncStatus: () => api.get("/admin/bigin-dashboard/sync-status"),
  owners: () => api.get("/admin/bigin-dashboard/owners"),
};
