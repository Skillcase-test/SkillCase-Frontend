import { paymentsAdminApi } from "../../../../api/paymentsAdminApi";
import { monthNameToNumber } from "../../utils/constants";

export function useActionsDiscounts(state) {
  const {
    discountForm,
    month,
    year,
    setDiscountForm,
    setError,
    loadTabData,
    rejectModal,
    setRejectModal,
  } = state;

  async function handleCreateDiscountRequest() {
    try {
      const monthNumber =
        monthNameToNumber[
          String(discountForm.target_month_name || "").toLowerCase()
        ] || month;
      await paymentsAdminApi.requestDiscount({
        enrollment_id: discountForm.enrollment_id,
        target_year: year,
        target_month: monthNumber,
        discount_type: discountForm.discount_type,
        discount_value:
          discountForm.discount_type === "percentage"
            ? undefined
            : Number(discountForm.discount_value || 0),
        discount_percent:
          discountForm.discount_type === "percentage"
            ? Number(discountForm.discount_percent || 0)
            : undefined,
        duration_months:
          discountForm.discount_type === "monthly" && discountForm.duration_months
            ? Number(discountForm.duration_months)
            : undefined,
        reason: discountForm.reason,
      });
      setDiscountForm((prev) => ({
        ...prev,
        enrollment_id: "",
        student_name: "",
        student_phone: "",
        discount_value: "",
        discount_percent: "",
        duration_months: "",
        reason: "",
      }));
      await loadTabData();
    } catch (err) {
      setError(err?.response?.data?.msg || "Discount request failed");
    }
  }

  async function handleDiscountDecision(discountId, decision) {
    try {
      await paymentsAdminApi.decideDiscount(discountId, {
        decision,
        rejection_reason:
          decision === "rejected"
            ? rejectModal.reason.trim() || undefined
            : undefined,
      });
      setRejectModal({ open: false, discountId: "", reason: "" });
      await loadTabData();
    } catch (err) {
      setError(err?.response?.data?.msg || "Discount decision failed");
    }
  }

  return { handleCreateDiscountRequest, handleDiscountDecision };
}
