import api from "../api/axios";
import { APP_VERSION } from "../App";

let heartbeatInterval = null;

// Send app version when app opens
export const sendAppVersion = async () => {
  try {
    await api.post("/user/app-version", { appVersion: APP_VERSION });
  } catch (error) {
    console.error("Failed to send app version:", error);
  }
};

export const startHeartbeat = () => {
  if (heartbeatInterval) return;

  // Send heartbeat every 2 minutes 
  heartbeatInterval = setInterval(async () => {
    try {
      await api.post("/user/heartbeat");
    } catch (error) {
      // Silently fail, don't log 403 errors on public pages
      if (error.response?.status !== 403) {
        console.error("Heartbeat error:", error);
      }
    }
  }, 120000); // 2 minutes

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
