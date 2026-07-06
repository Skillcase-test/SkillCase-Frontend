import { Capacitor } from "@capacitor/core";

const CLARITY_READY_TIMEOUT_MS = 20_000;
const CLARITY_READY_POLL_MS = 250;

let clarityWaitStartedAt = 0;
let clarityFlushTimer = null;
const pendingClarityCalls = [];

function isReady() {
  return typeof window.clarity === "function";
}

function shouldEnableClarity() {
  if (import.meta.env.MODE === "test") return false;
  if (import.meta.env.VITE_CLARITY_ENABLED === "true") return true;
  return import.meta.env.PROD;
}

function flushPendingClarityCalls() {
  if (!shouldEnableClarity()) return;

  if (!isReady()) {
    if (!clarityWaitStartedAt) clarityWaitStartedAt = Date.now();
    if (Date.now() - clarityWaitStartedAt > CLARITY_READY_TIMEOUT_MS) {
      pendingClarityCalls.length = 0;
      clarityFlushTimer = null;
      return;
    }
    clarityFlushTimer = window.setTimeout(
      flushPendingClarityCalls,
      CLARITY_READY_POLL_MS,
    );
    return;
  }

  clarityWaitStartedAt = 0;
  clarityFlushTimer = null;
  while (pendingClarityCalls.length > 0) {
    const call = pendingClarityCalls.shift();
    try {
      call();
    } catch {
      // Analytics must never break the app.
    }
  }
}

function withClarityReady(call) {
  if (!shouldEnableClarity()) return;

  if (isReady()) {
    try {
      call();
    } catch {
      // Analytics must never break the app.
    }
    return;
  }

  pendingClarityCalls.push(call);
  if (!clarityFlushTimer) {
    flushPendingClarityCalls();
  }
}

/**
 * Identify the logged-in user so Clarity sessions are linked to a real user.
 * Also sets all custom tags used for filtering in the Clarity dashboard.
 * Call this any time the user object changes (login, logout, profile update).
 */
export function identifyUserInClarity(user) {
  if (!shouldEnableClarity()) return;

  if (!user) {
    clearClarityIdentity();
    return;
  }

  withClarityReady(() => {
    // clarity("identify", userId, sessionId, pageId, friendlyName)
    // sessionId and pageId left as null - Clarity auto-generates them.
    window.clarity(
      "identify",
      String(user.user_id),
      null,
      null,
      user.fullname || user.username || null,
    );

    // Custom tags - visible as filters in Recordings, Heatmaps, and Funnels.
    window.clarity("set", "user_role", user.role || "user");
    window.clarity("set", "is_paid", String(Boolean(user.is_paid)));
    window.clarity("set", "prof_level", user.user_prof_level || "unknown");
    window.clarity(
      "set",
      "onboarding_done",
      String(Boolean(user.onboarding_completed)),
    );
    window.clarity(
      "set",
      "platform",
      Capacitor.isNativePlatform() ? "app" : "web",
    );
  });
}

/**
 * Clear user identity - call on logout.
 */
export function clearClarityIdentity() {
  withClarityReady(() => {
    window.clarity("identify", null);
  });
}

/**
 * Set an arbitrary custom tag for the current session.
 * Use this to tag sessions with feature-specific context
 * (e.g. which exam the user is taking, which module they opened).
 */
export function setClarityTag(key, value) {
  withClarityReady(() => {
    window.clarity("set", String(key), String(value));
  });
}

/**
 * Track a named Clarity API event and optionally attach session tags.
 * Keep payloads non-PII: use mode, level, step, lesson id/title, etc.
 */
export function trackClarityEvent(eventName, tags = {}, upgradeReason = null) {
  withClarityReady(() => {
    Object.entries(tags || {}).forEach(([key, value]) => {
      if (value === undefined || value === null) return;
      window.clarity("set", String(key), String(value));
    });
    window.clarity("event", String(eventName));
    if (upgradeReason) {
      window.clarity("upgrade", String(upgradeReason));
    }
  });
}

/**
 * Force the current session to be recorded regardless of the
 * sampling rate configured in the Clarity dashboard.
 * Use this for high-value flows: exam start, interview start, terms signing.
 */
export function upgradeClaritySession(reason) {
  withClarityReady(() => {
    window.clarity("upgrade", reason || "important_session");
  });
}
