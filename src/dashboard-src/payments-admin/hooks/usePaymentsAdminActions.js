import { useActionsEnrollment } from "./actions/useActionsEnrollment";
import { useActionsBatch } from "./actions/useActionsBatch";
import { useActionsDiscounts } from "./actions/useActionsDiscounts";
import { useActionsPayments } from "./actions/useActionsPayments";
import { useActionsInvoices } from "./actions/useActionsInvoices";

export function usePaymentsAdminActions(state) {
  return {
    ...useActionsEnrollment(state),
    ...useActionsBatch(state),
    ...useActionsDiscounts(state),
    ...useActionsPayments(state),
    ...useActionsInvoices(state),
  };
}
