// Single source of truth for reading paywall state off the redux user object.
// The backend payload carries the authoritative computed fields
// (trial_active / trial_days_left / trial_taken / trial_ended_dismissed), so
// the client never re-derives dates — it just reads flags.

// Paid autopay subscription (Razorpay) — the strongest state.
export function isPremiumUser(user) {
  return user?.autopay_enabled === true;
}

// 7-day free trial still running (tracked on our side, full premium access).
export function isTrialActive(user) {
  return user?.trial_active === true;
}

// Trial was ever claimed (started OR already expired) — one trial per user.
export function hasTakenTrial(user) {
  return user?.trial_taken === true;
}

// Whole-days remaining in the running trial (2, 1, 0).
export function trialDaysLeft(user) {
  return typeof user?.trial_days_left === "number" ? user.trial_days_left : 0;
}

// Trial has ended and the user explicitly dismissed the "trial ended" modal.
export function isTrialEndedDismissed(user) {
  return user?.trial_ended_dismissed === true;
}

// Everything that counts as "premium access" for gating purposes.
export function hasPremiumAccess(user) {
  return isPremiumUser(user) || isTrialActive(user);
}
