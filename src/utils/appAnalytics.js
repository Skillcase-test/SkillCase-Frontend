import { Capacitor } from "@capacitor/core";
import api from "../api/axios";
import { APP_VERSION } from "../config/appVersion";

const SESSION_STORAGE_KEY = "skillcase_app_analytics_session_id";

function platform() {
  return Capacitor.isNativePlatform() ? "app" : "web";
}

export async function trackAppAnalyticsEvent(event) {
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
  sessionStorage.removeItem(SESSION_STORAGE_KEY);
  api.post("/analytics/session/end", { session_id: sessionId }).catch((error) => {
    if (import.meta.env.DEV) {
      console.warn("[AppAnalytics] session end failed", error);
    }
  });
}
