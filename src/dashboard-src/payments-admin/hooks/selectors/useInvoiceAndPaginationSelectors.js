import { useMemo } from "react";

export function useInvoiceAndPaginationSelectors(state, core) {
  const {
    rows,
    selectedEnrollmentId,
    invoiceRows,
    invoicePaymentRows,
    enrollmentSearchTerm,
    tab,
    rowsPerPage,
    currentPage,
  } = state;

  const selectedEnrollment = useMemo(
    () =>
      rows.find(
        (r) => String(r.enrollment_id) === String(selectedEnrollmentId),
      ),
    [rows, selectedEnrollmentId],
  );

  const invoicePaymentOptions = useMemo(() => {
    const alreadyInvoicedPaymentIds = new Set(
      invoiceRows.map((r) => String(r.payment_id || "")).filter(Boolean),
    );
    return invoicePaymentRows.filter(
      (p) =>
        String(p.enrollment_id) === String(selectedEnrollmentId) &&
        p.payment_status !== "refunded" &&
        !alreadyInvoicedPaymentIds.has(String(p.payment_id)),
    );
  }, [invoicePaymentRows, invoiceRows, selectedEnrollmentId]);

  const selectedEnrollmentInvoiceRows = useMemo(
    () =>
      invoiceRows.filter(
        (inv) =>
          String(inv.enrollment_id || "") ===
          String(selectedEnrollmentId || ""),
      ),
    [invoiceRows, selectedEnrollmentId],
  );

  const filteredEnrollmentOptions = useMemo(() => {
    const q = String(enrollmentSearchTerm || "")
      .trim()
      .toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      `${r.student_name || ""} ${r.student_phone || ""}`
        .toLowerCase()
        .includes(q),
    );
  }, [rows, enrollmentSearchTerm]);

  const feeSummary = useMemo(() => {
    if (tab !== "fee") return { unpaidSoFar: 0, paidSoFar: 0 };
    const unpaidSoFar = rows.reduce(
      (sum, r) => sum + Number(r.closingDuePaise || 0),
      0,
    );
    const paidSoFar = rows.reduce(
      (sum, r) => sum + Number(r.paidThisMonthPaise || 0),
      0,
    );
    return { unpaidSoFar, paidSoFar };
  }, [rows, tab]);

  const baseRowsForTable = useMemo(() => {
    if (tab === "all") return core.filteredAllRows;
    if (tab === "month") return core.filteredMonthRows;
    if (tab === "batch") return core.filteredBatchRows;
    if (tab === "fee") return core.searchedFeeRows;
    if (tab === "discounts") return core.filteredDiscountRows;
    if (tab === "payments") return core.filteredPaymentRows;
    if (tab === "rawlogs") return core.filteredRawRows;
    return rows;
  }, [tab, rows, core]);

  const totalPages = Math.max(
    1,
    Math.ceil(baseRowsForTable.length / rowsPerPage),
  );
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return baseRowsForTable.slice(start, start + rowsPerPage);
  }, [baseRowsForTable, currentPage, rowsPerPage]);

  return {
    selectedEnrollment,
    invoicePaymentOptions,
    selectedEnrollmentInvoiceRows,
    filteredEnrollmentOptions,
    feeSummary,
    baseRowsForTable,
    totalPages,
    paginatedRows,
  };
}
