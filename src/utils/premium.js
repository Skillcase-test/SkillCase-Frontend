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

// The plan's feature list, worded as on the upgrade page. Talk to Maya leads at the levels
// that have it, in place of the generic AI line.
export const PLAN_FEATURES = [
  "Unlimited AI conversations",
  "Unlimited German lessons",
  "Unlimited Flashcards",
  "Unlimited learning & many more",
];

export function planFeatures(user, planMinutes) {
  const maya = mayaFeatureValue(user, planMinutes);
  return maya ? [`Talk to Maya · ${maya}`, ...PLAN_FEATURES.slice(1)] : PLAN_FEATURES;
}

// Course learners marked paid by the team, with no subscription of their own.
// They're Career Plus and can buy Career Pro (₹199 autopay) on top, at the
// levels the plan is sold for. Cancelling it later drops them back to this.
export function isLearnerAccess(user) {
  return user?.is_paid === true && user?.autopay_enabled !== true;
}

export function canLearnerUpgradeToPro(user) {
  return isLearnerAccess(user) && user?.admin_pro !== true && hasMayaLevel(user?.user_prof_level);
}

// Which premium look the learner gets: "pro" for the ₹199 plan or Pro given by
// a super admin, "plus" for the ₹99 plan and admin-granted access. null for
// free and trial users.
export function premiumTier(user) {
  if (!isPremiumUser(user)) return null;
  if (user?.is_paid === true && user?.admin_pro === true) return "pro";
  return user?.autopay_enabled === true && user?.subscription_plan === "b2_plus" ? "pro" : "plus";
}

// Window event that replays a premium animation (temporary test buttons).
// detail.kind: "trial" | "trial-exit" | "plan-exit"
export const PREMIUM_PREVIEW_EVENT = "skillcase:premium-intro-preview";

export const PREMIUM_TIER_NAMES = { plus: "Career Plus", pro: "Career Pro" };

export function premiumPlanName(user) {
  const tier = premiumTier(user);
  return tier ? PREMIUM_TIER_NAMES[tier] : null;
}

// The header look: the plan's tier, "trial" (the Plus look with a trial pill), or null
export function premiumLook(user) {
  return premiumTier(user) || (isTrialActive(user) ? "trial" : null);
}

const LOOK_RANK = { "": 0, trial: 1, plus: 2, pro: 3 };

// What changed since the look the app last animated the learner into (premium_intro_tier):
// "trial" (trial starts), "welcome" (a plan starts), "upgrade" (Plus → Pro), or "exit"
// (trial or plan over, or Pro → Plus). null when nothing changed, or until /user/me has
// reported the flag. Learners whose access ended before this version have "" stored, so
// they never get an exit.
export function premiumTransition(user) {
  const seen = user?.premium_intro_tier;
  if (typeof seen !== "string" || !(seen in LOOK_RANK)) return null;
  const to = premiumLook(user) || "";
  if (LOOK_RANK[to] === LOOK_RANK[seen]) return null;
  if (LOOK_RANK[to] < LOOK_RANK[seen]) return { kind: "exit", from: seen, to };
  const kind = to === "trial" ? "trial" : seen === "plus" && to === "pro" ? "upgrade" : "welcome";
  return { kind, from: seen, to };
}

// The look to draw: until the exit animation has played, the learner keeps the look they had
export function shownPremiumLook(user) {
  const t = premiumTransition(user);
  return t?.kind === "exit" ? t.from : premiumLook(user);
}

// Trial days counted like a calendar: 7 right after starting, 1 on the last day
export function trialDaysRemaining(user) {
  const end = user?.trial_end_at ? new Date(user.trial_end_at).getTime() : NaN;
  return Math.max(0, Number.isFinite(end) ? Math.ceil((end - Date.now()) / 86400000) : trialDaysLeft(user) + 1);
}

export function trialPillLabel(user) {
  const days = trialDaysRemaining(user);
  return days <= 1 ? "last day" : `${days}d left`;
}
