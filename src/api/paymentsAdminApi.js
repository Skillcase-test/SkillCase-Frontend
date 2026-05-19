import api from "./axios";

export const paymentsAdminApi = {
  verifyStepUp: (password) =>
    api.post("/admin/payments/auth/verify-password", { password }),
  getStepUpStatus: () => api.get("/admin/payments/auth/status"),

  getMonthView: (year, month, params = {}) =>
    api.get("/admin/payments/enrollments/month-view", {
      params: { year, month, ...params },
    }),
  getEnrollmentOptions: (params = {}) =>
    api.get("/admin/payments/enrollments/options", { params }),
  getAllView: (params = {}) =>
    api.get("/admin/payments/enrollments/all-view", { params }),
  updateEnrollment: (enrollmentId, payload) =>
    api.patch(`/admin/payments/enrollments/${enrollmentId}`, payload),
  holdEnrollment: (enrollmentId, payload = {}) =>
    api.post(`/admin/payments/enrollments/${enrollmentId}/hold`, payload),
  unholdEnrollment: (enrollmentId, payload = {}) =>
    api.post(`/admin/payments/enrollments/${enrollmentId}/unhold`, payload),
  dropEnrollment: (enrollmentId, payload = {}) =>
    api.post(`/admin/payments/enrollments/${enrollmentId}/drop`, payload),
  undropEnrollment: (enrollmentId, payload = {}) =>
    api.post(`/admin/payments/enrollments/${enrollmentId}/undrop`, payload),
  finalizeEnrollment: (enrollmentId) =>
    api.post(`/admin/payments/enrollments/${enrollmentId}/finalize`),
  rejectEnrollment: (enrollmentId) =>
    api.post(`/admin/payments/enrollments/${enrollmentId}/reject`),

  getBatches: () => api.get("/admin/payments/batches"),
  createBatch: (payload) => api.post("/admin/payments/batches", payload),
  updateBatch: (batchId, payload) =>
    api.put(`/admin/payments/batches/${batchId}`, payload),
  deleteBatch: (batchId) => api.delete(`/admin/payments/batches/${batchId}`),

  getTotalFeeView: (year, month, params = {}) =>
    api.get("/admin/payments/ledger/total-fee-view", {
      params: { year, month, ...params },
    }),
  getTotalFeeBreakdown: (enrollment_id, year, month, type) =>
    api.get("/admin/payments/ledger/total-fee-breakdown", {
      params: { enrollment_id, year, month, type },
    }),

  getDiscounts: (year, month, params = {}) =>
    api.get("/admin/payments/discounts", { params: { year, month, ...params } }),
  requestDiscount: (payload) =>
    api.post("/admin/payments/discounts/request", payload),
  decideDiscount: (discountId, payload) =>
    api.post(`/admin/payments/discounts/${discountId}/decision`, payload),

  getPaymentView: (year, month, params = {}) =>
    api.get("/admin/payments/reports/payment-view", {
      params: { year, month, ...params },
    }),
  refundPayment: (paymentId) =>
    api.post(`/admin/payments/reports/payments/${paymentId}/refund`),
  reconcile: (payload = {}) =>
    api.post("/admin/payments/reports/reconcile", payload),
  importDumpDryRun: (formData) =>
    api.post("/admin/payments/import/dry-run", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  importDumpConfirm: (payload) =>
    api.post("/admin/payments/import/confirm", payload),

  getRawLogs: (params = {}) =>
    api.get("/admin/payments/razorpay-raw-logs", { params }),
  getInvoices: (year, month, params = {}) =>
    api.get("/admin/payments/invoices", { params: { year, month, ...params } }),

  generateInvoice: (payload) =>
    api.post("/admin/payments/invoices/generate", payload),
  sendInvoice: (payload) => api.post("/admin/payments/invoices/send", payload),
};
