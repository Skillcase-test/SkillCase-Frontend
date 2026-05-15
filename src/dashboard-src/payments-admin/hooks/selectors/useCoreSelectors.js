import { useMemo } from "react";

export function useCoreSelectors(state) {
  const {
    rows,
    batchSearch,
    batchFilter,
    allSearch,
    allStatusFilter,
    monthSearch,
    tab,
    feeFilter,
    feeSearch,
    discountSearch,
    paymentSearch,
    rawSearch,
  } = state;

  const filteredBatchRows = useMemo(() => {
    const search = String(batchSearch || "")
      .toLowerCase()
      .trim();
    return rows.filter((r) => {
      const batchOk =
        !batchFilter || String(r.batch_name || "") === String(batchFilter);
      if (!batchOk) return false;
      if (!search) return true;
      return [
        r.batch_name || "",
        r.student_name || "",
        r.student_phone || "",
        r.status || "",
        r.lifecycle_state || "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(search);
    });
  }, [rows, batchFilter, batchSearch]);

  const filteredAllRows = useMemo(() => {
    const search = String(allSearch || "")
      .toLowerCase()
      .trim();
    return rows.filter((r) => {
      const statusOk =
        !allStatusFilter || String(r.status || "") === allStatusFilter;
      if (!statusOk) return false;
      if (!search) return true;
      return [
        r.student_name || "",
        r.student_phone || "",
        r.student_email || "",
        r.batch_name || "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(search);
    });
  }, [rows, allSearch, allStatusFilter]);

  const filteredMonthRows = useMemo(() => {
    const search = String(monthSearch || "")
      .toLowerCase()
      .trim();
    if (!search) return rows;
    return rows.filter((r) =>
      [
        r.student_name || "",
        r.student_phone || "",
        r.student_email || "",
        r.batch_name || "",
        r.status || "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(search),
    );
  }, [rows, monthSearch]);

  const filteredFeeRows = useMemo(() => {
    if (tab !== "fee") return rows;
    if (!feeFilter) return rows;
    if (feeFilter === "unpaid")
      return rows.filter((r) => Number(r.closingDuePaise || 0) > 0);
    if (feeFilter === "unpaid_last_month")
      return rows.filter((r) => Number(r.carryForwardDuePaise || 0) > 0);
    if (feeFilter === "discounted")
      return rows.filter((r) => Number(r.discountPaise || 0) > 0);
    if (feeFilter === "paid")
      return rows.filter((r) => Number(r.closingDuePaise || 0) === 0);
    return rows;
  }, [rows, tab, feeFilter]);

  const searchedFeeRows = useMemo(() => {
    const search = String(feeSearch || "")
      .toLowerCase()
      .trim();
    if (!search) return filteredFeeRows;
    return filteredFeeRows.filter((r) =>
      [
        r.student_name || "",
        r.student_phone || "",
        Number(r.closingDuePaise || 0),
        Number(r.carryForwardDuePaise || 0),
      ]
        .join(" ")
        .toLowerCase()
        .includes(search),
    );
  }, [filteredFeeRows, feeSearch]);

  const filteredDiscountRows = useMemo(() => {
    const search = String(discountSearch || "")
      .toLowerCase()
      .trim();
    if (!search) return rows;
    return rows.filter((r) =>
      [
        r.student_name || "",
        r.student_phone || "",
        r.discount_type || "",
        r.status || "",
        r.reason || "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(search),
    );
  }, [rows, discountSearch]);

  const filteredPaymentRows = useMemo(() => {
    const search = String(paymentSearch || "")
      .toLowerCase()
      .trim();
    if (!search) return rows;
    return rows.filter((r) =>
      [
        r.student_name || "",
        r.student_phone || "",
        r.payment_status || "",
        r.razorpay_payment_id || "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(search),
    );
  }, [rows, paymentSearch]);

  const filteredRawRows = useMemo(() => {
    const search = String(rawSearch || "")
      .toLowerCase()
      .trim();
    if (!search) return rows;
    return rows.filter((r) =>
      [
        r.event_type || "",
        r.event_id || "",
        r.processing_status || "",
        r.linked_enrollment_id || "",
        r.linked_payment_id || "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(search),
    );
  }, [rows, rawSearch]);

  return {
    filteredBatchRows,
    filteredAllRows,
    filteredMonthRows,
    filteredFeeRows,
    searchedFeeRows,
    filteredDiscountRows,
    filteredPaymentRows,
    filteredRawRows,
  };
}
