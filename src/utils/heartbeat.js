import api from "../api/axios";
import { APP_VERSION } from "../config/appVersion";
import { Capacitor } from "@capacitor/core";

let heartbeatInterval = null;
let heartbeatBuffer = [];
let bufferTimeout = null;


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

  // Send heartbeat every 10 seconds for ALL active users
  heartbeatInterval = setInterval(async () => {
    api.post("/user/heartbeat").catch((error) => {
      if (error.response?.status !== 403) {
        console.error("Heartbeat error:", error);
      }
    });
  }, 10000); // 10 seconds

  // Send initial heartbeat immediately
  api.post("/user/heartbeat").catch((error) => {
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
