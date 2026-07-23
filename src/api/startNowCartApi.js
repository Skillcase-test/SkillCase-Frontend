import api from "./axios";

// Public: create a Razorpay checkout for the selected cart block IDs.
// The server recomputes the amount from the DB — this never sends a price.
export const checkoutCart = (blockIds) =>
  api.post("/payments/public/cart/checkout", { blockIds });
