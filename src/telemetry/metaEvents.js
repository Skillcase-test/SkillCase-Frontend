import { Capacitor, registerPlugin } from "@capacitor/core";

const MetaEvents = registerPlugin("MetaEvents");

// Only the events worth optimising ad delivery on. Forwarding the high-volume
// learning events would send Meta noise instead of signal, so they stay
// first-party. These arrive via the legacy capture() bridge.
export const META_EVENT_NAMES = {
  exam_started: "exam_started",
  exam_submitted: "exam_submitted",
  event_registration_started: "event_registration_started",
  event_registered: "event_registered",
  flashcard_set_completed: "flashcard_set_completed",
};

// Signup and login do not go through capture() — the live path is
// OnboardingFlow, which reports via trackFlowAction. Registration is only
// counted once onboarding completes, not at OTP, because a new user who drops
// out mid-flow never becomes an account.
const ONBOARDING_FLOW_ID = "learner_onboarding";

// Meta only accepts scalar parameter values, and nothing identifying is ever
// forwarded — this allowlist mirrors the first-party SAFE_ATTRIBUTE_KEYS rule.
const FORWARDED_PARAMS = [
  "level",
  "proficiency_level",
  "module",
  "feature_key",
  "content_type",
];

export function metaEventName(name) {
  return META_EVENT_NAMES[name] || null;
}

export function metaFlowEventName(flowId, action, branch) {
  if (flowId !== ONBOARDING_FLOW_ID) return null;
  if (action === "flow_completed") return "fb_mobile_complete_registration";
  if (action === "otp_verified" && branch === "returning_user") return "user_logged_in";
  return null;
}

export function metaEventParams(properties) {
  const output = {};
  if (!properties || typeof properties !== "object") return output;
  for (const key of FORWARDED_PARAMS) {
    const value = properties[key];
    if (typeof value === "number" ? Number.isFinite(value) : typeof value === "string" && value) {
      output[key] = value;
    }
  }
  return output;
}

function send(method, payload) {
  if (!Capacitor.isNativePlatform()) return;
  try {
    MetaEvents[method](payload).catch(() => {});
  } catch {
    // Attribution is never allowed to break a product flow.
  }
}

export function logMetaEvent(name, properties = {}) {
  const eventName = metaEventName(name);
  if (!eventName) return;
  send("logEvent", { name: eventName, params: metaEventParams(properties) });
}

export function logMetaFlowEvent(flowId, action, context = {}) {
  const eventName = metaFlowEventName(flowId, action, context.branch);
  if (!eventName) return;
  send("logEvent", { name: eventName, params: metaEventParams(context.attributes) });
}

export function logMetaPurchase(amount, currency = "INR", properties = {}) {
  const value = Number(amount);
  if (!Number.isFinite(value) || value <= 0) return;
  send("logPurchase", { amount: value, currency, params: metaEventParams(properties) });
}
