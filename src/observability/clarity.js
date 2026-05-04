import { Capacitor } from "@capacitor/core";

function isReady() {
  return typeof window.clarity === "function";
}

function shouldEnableClarity() {
  if (import.meta.env.MODE === "test") return false;
  if (import.meta.env.VITE_CLARITY_ENABLED === "true") return true;
  return import.meta.env.PROD;
}

/**
 * Identify the logged-in user so Clarity sessions are linked to a real user.
 * Also sets all custom tags used for filtering in the Clarity dashboard.
 * Call this any time the user object changes (login, logout, profile update).
 */
export function identifyUserInClarity(user) {
  if (!shouldEnableClarity() || !isReady()) return;

  if (!user) {
    clearClarityIdentity();
    return;
  }

  try {
    // clarity("identify", userId, sessionId, pageId, friendlyName)
    // sessionId and pageId left as null — Clarity auto-generates them
    window.clarity(
      "identify",
      String(user.user_id),
      null,
      null,
      user.fullname || user.username || null,
    );

    // Custom tags — visible as filters in Recordings, Heatmaps, and Funnels
    window.clarity("set", "user_role", user.role || "user");
    window.clarity("set", "is_paid", String(Boolean(user.is_paid)));
    window.clarity("set", "prof_level", user.user_prof_level || "unknown");
    window.clarity("set", "onboarding_done", String(Boolean(user.onboarding_completed)));
    window.clarity("set", "platform", Capacitor.isNativePlatform() ? "app" : "web");
  } catch (err) {
    // Analytics must never break the app — fail silently
    console.warn("[Clarity] identifyUser failed:", err);
  }
}

/**
 * Clear user identity — call on logout.
 */
export function clearClarityIdentity() {
  if (!shouldEnableClarity() || !isReady()) return;
  try {
    window.clarity("identify", null);
  } catch {
    // ignore
  }
}

/**
 * Set an arbitrary custom tag for the current session.
 * Use this to tag sessions with feature-specific context
 * (e.g. which exam the user is taking, which module they opened).
 */
export function setClarityTag(key, value) {
  if (!shouldEnableClarity() || !isReady()) return;
  try {
    window.clarity("set", String(key), String(value));
  } catch {
    // ignore
  }
}

/**
 * Force the current session to be recorded regardless of the
 * sampling rate configured in the Clarity dashboard.
 * Use this for high-value flows: exam start, interview start, terms signing.
 */
export function upgradeClaritySession(reason) {
  if (!shouldEnableClarity() || !isReady()) return;
  try {
    window.clarity("upgrade", reason || "important_session");
  } catch {
    // ignore
  }
}
