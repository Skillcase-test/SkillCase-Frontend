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

  const selectedEnrollment = useMemo(() => {
    const found = (candidateOptions || rows || []).find(
      (r) => String(r.enrollment_id) === String(selectedEnrollmentId),
    ) || invoicePaymentRows.find(
      (r) => String(r.enrollment_id) === String(selectedEnrollmentId),
    );
    if (!found) return null;
    return {
      ...found,
      notes: found.enrollment_notes || found.notes || {},
    };
  }, [rows, candidateOptions, invoicePaymentRows, selectedEnrollmentId]);

  const invoicePaymentOptions = useMemo(() => {
    return invoicePaymentRows;
  }, [invoicePaymentRows]);

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
    if (tab !== "fee") return { unpaidSoFar: 0, paidSoFar: 0, potentialAfterDiscounts: 0, totalDiscounts: 0, activeButNotScheduled: 0 };
    return {
      unpaidSoFar: Number(feeSummary?.unpaid_this_month_paise || 0),
      paidSoFar: Number(feeSummary?.paid_this_month_paise || 0),
      potentialAfterDiscounts: Number(feeSummary?.potential_after_discounts_paise || 0),
      totalDiscounts: Number(feeSummary?.total_discounts_paise || 0),
      activeButNotScheduled: Number(feeSummary?.active_but_not_scheduled_paise || 0),
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
