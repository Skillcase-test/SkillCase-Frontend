import { useEffect } from "react";
import { useCoreSelectors } from "./selectors/useCoreSelectors";
import { useInvoiceAndPaginationSelectors } from "./selectors/useInvoiceAndPaginationSelectors";

export function usePaymentsAdminSelectors(state) {
  const core = useCoreSelectors(state);
  const extra = useInvoiceAndPaginationSelectors(state, core);

  useEffect(() => {
    state.setCurrentPage(1);
  }, [
    state.tab,
    state.rowsPerPage,
    state.allSearch,
    state.monthSearch,
    state.batchSearch,
    state.feeSearch,
    state.discountSearch,
    state.paymentSearch,
    state.rawSearch,
    state.allStatusFilter,
    state.batchFilter,
    state.feeFilter,
    state.rawEventTypeFilter,
    state.rawStatusFilter,
    state.year,
    state.month,
  ]);

  return { ...core, ...extra };
}
