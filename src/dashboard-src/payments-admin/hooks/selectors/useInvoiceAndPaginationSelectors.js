import { useMemo } from "react";

export function useInvoiceAndPaginationSelectors(state, core) {
  const {
    rows,
    selectedEnrollmentId,
    invoiceRows,
    invoicePaymentRows,
    enrollmentSearchTerm,
    candidateOptions,
    tab,
    rowsPerPage,
    pagination,
    feeSummary,
  } = state;

  const selectedEnrollment = useMemo(
    () =>
      (candidateOptions || rows).find(
        (r) => String(r.enrollment_id) === String(selectedEnrollmentId),
      ),
    [rows, candidateOptions, selectedEnrollmentId],
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
    const source = candidateOptions?.length ? candidateOptions : rows;
    if (!q) return source;
    return source.filter((r) =>
      `${r.student_name || ""} ${r.student_phone || ""}`
        .toLowerCase()
        .includes(q),
    );
  }, [rows, candidateOptions, enrollmentSearchTerm]);

  const resolvedFeeSummary = useMemo(() => {
    if (tab !== "fee") return { unpaidSoFar: 0, paidSoFar: 0 };
    return {
      unpaidSoFar: Number(feeSummary?.unpaid_this_month_paise || 0),
      paidSoFar: Number(feeSummary?.paid_this_month_paise || 0),
    };
  }, [feeSummary, tab]);

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

  const totalPages = Math.max(1, Number(pagination?.total_pages || Math.ceil(baseRowsForTable.length / rowsPerPage) || 1));
  const paginatedRows = useMemo(() => baseRowsForTable, [baseRowsForTable]);

  return {
    selectedEnrollment,
    invoicePaymentOptions,
    selectedEnrollmentInvoiceRows,
    filteredEnrollmentOptions,
    feeSummary: resolvedFeeSummary,
    baseRowsForTable,
    totalPages,
    paginatedRows,
  };
}
