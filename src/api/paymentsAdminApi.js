import api from "./axios";
import { adminAccessApi } from "./adminAccessApi";

export const paymentsAdminApi = {
  // Fetches the current admin's role + permissions (used on panel mount).
  getMyAccess: () => adminAccessApi.getMyAccess(),

  getOverallStats: (params = {}) =>
    api.get("/admin/payments/reports/overall-stats", { params }),

  getMonthView: (year, month, params = {}) =>
    api.get("/admin/payments/enrollments/month-view", {
      params: { year, month, ...params },
    }),
  getEnrollmentOptions: (params = {}) =>
    api.get("/admin/payments/enrollments/options", { params }),
  getAllView: (params = {}) =>
    api.get("/admin/payments/enrollments/all-view", { params }),
  createManualEnrollment: (payload) =>
    api.post("/admin/payments/enrollments/manual", payload),
  updateEnrollment: (enrollmentId, payload) =>
    api.patch(`/admin/payments/enrollments/${enrollmentId}`, payload),
  sendAgreement: (enrollmentId) =>
    api.post(`/admin/payments/enrollments/${enrollmentId}/send-agreement`),
  getPaymentDocumentUploadUrl: (payload) =>
    api.post("/admin/payments/documents/upload-url", payload),
  getPaymentDocumentDownloadUrl: (key) =>
    api.get("/admin/payments/documents/download-url", { params: { key } }),
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
  deleteEnrollment: (enrollmentId) =>
    api.post(`/admin/payments/enrollments/${enrollmentId}/delete`),
  overrideEnrollmentState: (enrollmentId, payload) =>
    api.post(`/admin/payments/enrollments/${enrollmentId}/override-state`, payload),
  createPaymentLink: (payload) =>
    api.post("/admin/payments/create-payment-link", payload),

  getBatches: (params = {}) => api.get("/admin/payments/batches", { params }),
  getBatchStudents: (batchId, params = {}) =>
    api.get(`/admin/payments/batches/${batchId}/students`, { params }),
  createBatch: (payload) => api.post("/admin/payments/batches", payload),
  updateBatch: (batchId, payload) =>
    api.put(`/admin/payments/batches/${batchId}`, payload),
  deleteBatch: (batchId) => api.delete(`/admin/payments/batches/${batchId}`),

  getTotalFeeView: (year, month, params = {}) =>
    api.get("/admin/payments/ledger/total-fee-view", {
      params: { year, month, ...params },
    }),
  exportFeeView: (year, month, exportType, cohortFilter) =>
    api.get("/admin/payments/ledger/total-fee-view/export", {
      params: { year, month, export_type: exportType, cohort_filter: cohortFilter },
      responseType: "blob",
    }),
  getTotalFeeBreakdown: (enrollment_id, year, month) =>
    api.get("/admin/payments/ledger/total-fee-breakdown", {
      params: { enrollment_id, year, month, type: "due" },
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
  reconcile: (payload = {}) =>
    api.post("/admin/payments/reports/reconcile", payload),
  importDumpDryRun: (formData) =>
    api.post("/admin/payments/import/dry-run", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  importDumpConfirm: (payload) =>
    api.post("/admin/payments/import/confirm", payload),
  importCandidatesDryRun: (formData) =>
    api.post("/admin/payments/import/candidates/dry-run", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  importCandidatesConfirm: (payload) =>
    api.post("/admin/payments/import/candidates/confirm", payload),

  getRawLogs: (params = {}) =>
    api.get("/admin/payments/razorpay-raw-logs", { params }),
  getInvoices: (year, month, params = {}) =>
    api.get("/admin/payments/invoices", { params: { year, month, ...params } }),
  getInvoicePaymentOptions: (enrollment_id, params = {}) => {
    const cleanId = enrollment_id && enrollment_id !== "null" && enrollment_id !== "undefined" ? enrollment_id : undefined;
    return api.get("/admin/payments/invoices/payments", { params: { enrollment_id: cleanId, ...params } });
  },

  generateInvoice: (payload) =>
    api.post("/admin/payments/invoices/generate", payload),
  sendInvoice: (payload) => api.post("/admin/payments/invoices/send", payload),
  deleteInvoice: (invoiceId) =>
    api.delete(`/admin/payments/invoices/${invoiceId}`),
  getInvoicePdf: (invoiceId) =>
    api.get(`/admin/payments/invoices/${invoiceId}/pdf`),
  getBookedSummary: (params = {}) =>
    api.get("/admin/payments/invoices/booked-summary", { params }),
  getBookedSummaryCandidates: (year, month) =>
    api.get("/admin/payments/invoices/booked-summary/candidates", { params: { year, month } }),

  createManualTransaction: (payload) =>
    api.post("/admin/payments/transactions/manual", payload),
  updateManualTransaction: (paymentId, payload) =>
    api.patch(`/admin/payments/transactions/manual/${paymentId}`, payload),
  deleteManualTransaction: (paymentId) =>
    api.delete(`/admin/payments/transactions/manual/${paymentId}`),
  relinkTransactionByPhone: (paymentId, phone) =>
    api.patch(`/admin/payments/transactions/${paymentId}/link-by-phone`, { phone }),
  checkDuplicateTransactions: (payload) =>
    api.post("/admin/payments/transactions/check-duplicates", payload),
  createBatchManualTransactions: (payload) =>
    api.post("/admin/payments/transactions/batch-manual", payload),
  getImportHistory: (params = {}) =>
    api.get("/admin/payments/import/history", { params }),
  downloadImportFile: (importId) =>
    api.get(`/admin/payments/import/history/${importId}/download`),
  rollbackImport: (importId) =>
    api.post("/admin/payments/import/rollback", { importId }),
  getBookedAmountCandidatePayments: (phone) =>
    api.get("/admin/payments/booked-amounts/candidate-payments", { params: { phone } }),
  bookAmount: (payload) =>
    api.post("/admin/payments/booked-amounts", payload),
  bookAmountBulk: (payload) =>
    api.post("/admin/payments/booked-amounts/bulk", payload),

  getCandidatePaymentsWithReceipts: (enrollmentId) =>
    api.get(`/admin/payments/recruitment/candidates/${enrollmentId}/payments-with-receipts`),
  generateReceipt: (payload) =>
    api.post("/admin/payments/recruitment/receipts/generate", payload),
  sendReceipt: (payload) =>
    api.post("/admin/payments/recruitment/receipts/send", payload),
  getReceiptPdf: (receiptId) =>
    api.get(`/admin/payments/recruitment/receipts/${receiptId}/pdf`),
  deleteReceiptDraft: (receiptId) =>
    api.delete(`/admin/payments/recruitment/receipts/${receiptId}`),
};
