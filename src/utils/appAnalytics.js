import { Capacitor } from "@capacitor/core";
import api from "../api/axios";
import { APP_VERSION } from "../config/appVersion";
import { mirrorLegacyEvent, recordEvent } from "../telemetry";

const SESSION_STORAGE_KEY = "skillcase_app_analytics_session_id";

function platform() {
  return Capacitor.isNativePlatform() ? "app" : "web";
}

export async function trackAppAnalyticsEvent(event) {
  mirrorLegacyEvent(event?.event_name || event?.eventName, {
    ...(event?.metadata || {}),
    feature_key: event?.feature_key || event?.featureKey,
    content_type: event?.content_type || event?.contentType,
    content_id: event?.content_id || event?.contentId,
    proficiency_level: event?.proficiency_level || event?.proficiencyLevel,
  });
  try {
    await api.post("/analytics/events", {
      ...event,
      platform: platform(),
      app_version: APP_VERSION,
    });
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn("[AppAnalytics] event failed", error);
    }
  }
}

export async function startAppAnalyticsSession() {
  if (sessionStorage.getItem(SESSION_STORAGE_KEY)) return;
  recordEvent("app.authenticated_session", {
    domain: "app",
    entity_type: "session",
    lifecycle: "started",
  });
  try {
    const res = await api.post("/analytics/session/start", {
      platform: platform(),
      app_version: APP_VERSION,
    });
    const sessionId = res.data?.session?.session_id;
    if (sessionId) {
      sessionStorage.setItem(SESSION_STORAGE_KEY, sessionId);
    }
    trackAppAnalyticsEvent({
      event_name: "app_opened",
      feature_key: "app",
      content_type: "session",
      content_title: "App Opened",
    });
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn("[AppAnalytics] session start failed", error);
    }
  }
}

export function endAppAnalyticsSession() {
  const sessionId = sessionStorage.getItem(SESSION_STORAGE_KEY);
  if (!sessionId) return;
  recordEvent("app.authenticated_session", {
    domain: "app",
    entity_type: "session",
    entity_id: sessionId,
    lifecycle: "succeeded",
  });
  sessionStorage.removeItem(SESSION_STORAGE_KEY);
  api.post("/analytics/session/end", { session_id: sessionId }).catch((error) => {
    if (import.meta.env.DEV) {
      console.warn("[AppAnalytics] session end failed", error);
    }
  });
}
