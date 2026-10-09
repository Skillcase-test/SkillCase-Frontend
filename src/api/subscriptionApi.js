import api from "./axios";

/*
 * Subscription plans the signed-in learner may buy: GET /user/plans returns
 * `{ plans, current, currentPlan, next_billing_at }` — `plans` is server-filtered
 * (the ₹199 Plus plan only appears for B2-segment learners), `current` is the
 * catalog key of their active plan ("standard" | "b2_plus"), `currentPlan` its
 * label/price even when it is no longer buyable for them.
 */

export const getSubscriptionPlans = () => api.get("/user/plans").then((r) => r.data);

// Switch the plan on the SAME subscription (Razorpay plan change — no new
// checkout). 'activating' = prorated top-up charging now; 'scheduled' = switch
// queued for next billing with no charge today.
export const changePlan = (plan) => api.post("/user/change-plan", { plan }).then((r) => r.data);
