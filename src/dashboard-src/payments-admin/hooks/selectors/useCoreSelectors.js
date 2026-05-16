export function useCoreSelectors(state) {
  const { rows } = state;
  return {
    filteredBatchRows: rows,
    filteredAllRows: rows,
    filteredMonthRows: rows,
    filteredFeeRows: rows,
    searchedFeeRows: rows,
    filteredDiscountRows: rows,
    filteredPaymentRows: rows,
    filteredRawRows: rows,
  };
}
