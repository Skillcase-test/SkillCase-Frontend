import api from "../api/axios";
import { APP_VERSION } from "../App";
import { Capacitor } from "@capacitor/core";

let heartbeatInterval = null;

// Send app version when app opens - ONLY for native mobile app
export const sendAppVersion = async () => {
  // Only send app version from native mobile app, not from web
  if (!Capacitor.isNativePlatform()) {
    return;
  }

  try {
    await api.post("/user/app-version", { appVersion: APP_VERSION });
  } catch (error) {
    console.error("Failed to send app version:", error);
  }
};

export const startHeartbeat = () => {
  if (heartbeatInterval) return;

  // Send heartbeat every 5 minutes to reduce database wake-ups
  heartbeatInterval = setInterval(async () => {
    try {
      await api.post("/user/heartbeat");
    } catch (error) {
      // Silently fail, don't log 403 errors on public pages
      if (error.response?.status !== 403) {
        console.error("Heartbeat error:", error);
      }
    }
  }, 300000); // 5 minutes

  // Send initial heartbeat
  api.post("/user/heartbeat").catch((error) => {
    // Don't log 403 errors to avoid exposing backend URL on public pages
    if (error.response?.status !== 403) {
      console.error("Heartbeat error:", error);
    }
  });
};

export const stopHeartbeat = () => {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
};
