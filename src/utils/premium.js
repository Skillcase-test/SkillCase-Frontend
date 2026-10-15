// Single source of truth for reading paywall state off the redux user object.
// The backend payload carries the authoritative computed fields
// (trial_active / trial_days_left / trial_taken / trial_ended_dismissed), so
// the client never re-derives dates — it just reads flags.

import { hasMayaLevel } from "./levels";

// Paid autopay subscription (Razorpay) or course enrolled (is_paid) — full premium state.
export function isPremiumUser(user) {
  return user?.autopay_enabled === true || user?.is_paid === true;
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

// Talk to Maya entitlement label for paywall/upsell surfaces: A2, B1 and B2 are
// metered by the plan's daily pool; A1 doesn't have the feature yet.
export function mayaFeatureValue(user, planMinutes) {
  if (hasMayaLevel(user?.user_prof_level)) return `${planMinutes ?? 10} min/day`;
  return null;
}

// Course learners marked paid by the team, with no subscription of their own.
// They're Career Plus and can buy Career Pro (₹199 autopay) on top, at the
// levels the plan is sold for. Cancelling it later drops them back to this.
export function isLearnerAccess(user) {
  return user?.is_paid === true && user?.autopay_enabled !== true;
}

export function canLearnerUpgradeToPro(user) {
  return isLearnerAccess(user) && hasMayaLevel(user?.user_prof_level);
}

// Which premium look the learner gets: "pro" for the ₹199 plan, "plus" for the
// ₹99 plan and admin-granted access. null for free and trial users.
export function premiumTier(user) {
  if (!isPremiumUser(user)) return null;
  return user?.autopay_enabled === true && user?.subscription_plan === "b2_plus" ? "pro" : "plus";
}

// Window event that replays the premium welcome (temporary test button)
export const PREMIUM_PREVIEW_EVENT = "skillcase:premium-intro-preview";

export const PREMIUM_TIER_NAMES = { plus: "Career Plus", pro: "Career Pro" };

export function premiumPlanName(user) {
  const tier = premiumTier(user);
  return tier ? PREMIUM_TIER_NAMES[tier] : null;
}

// The premium welcome animation is due when the learner is on a tier above the
// last one they saw it for. Only decided once /user/me has reported the flag.
export function premiumIntroDue(user) {
  const tier = premiumTier(user);
  if (!tier || typeof user?.premium_intro_tier !== "string") return null;
  const rank = { "": 0, plus: 1, pro: 2 };
  return (rank[tier] ?? 0) > (rank[user.premium_intro_tier] ?? 0) ? tier : null;
}
