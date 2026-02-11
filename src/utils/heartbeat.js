import api from "../api/axios";
import { APP_VERSION } from "../App";
import { Capacitor } from "@capacitor/core";

let heartbeatInterval = null;
let heartbeatBuffer = [];
let bufferTimeout = null;

// Dashboard activity tracking
const DASHBOARD_ACTIVE_KEY = "admin_dashboard_active";

// Check if admin dashboard is currently active
const isDashboardActive = () => {
  const lastActive = localStorage.getItem(DASHBOARD_ACTIVE_KEY);
  if (!lastActive) return false;

  const timeSinceActive = Date.now() - parseInt(lastActive);
  // Dashboard considered active if pinged within last 90 seconds
  return timeSinceActive < 90000;
};

// Call this from dashboard to signal it's active
export const signalDashboardActive = () => {
  localStorage.setItem(DASHBOARD_ACTIVE_KEY, Date.now().toString());
};

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

// Batch send heartbeats to reduce DB load
const flushHeartbeatBuffer = async () => {
  if (heartbeatBuffer.length === 0) return;

  try {
    await api.post("/user/heartbeat");
    heartbeatBuffer = [];
  } catch (error) {
    if (error.response?.status !== 403) {
      console.error("Heartbeat error:", error);
    }
  }
};

export const startHeartbeat = () => {
  if (heartbeatInterval) return;

  // Send heartbeat every 10 minutes, but only if dashboard is active
  heartbeatInterval = setInterval(async () => {
    // Only send heartbeat when admin dashboard is being actively viewed
    if (!isDashboardActive()) {
      return;
    }

    // Buffer the heartbeat and send after a short delay to batch multiple users
    heartbeatBuffer.push(Date.now());

    if (bufferTimeout) clearTimeout(bufferTimeout);
    bufferTimeout = setTimeout(flushHeartbeatBuffer, 2000);
  }, 600000); // 10 minutes

  // Send initial heartbeat only if dashboard is active
  if (isDashboardActive()) {
    api.post("/user/heartbeat").catch((error) => {
      if (error.response?.status !== 403) {
        console.error("Heartbeat error:", error);
      }
    });
  }
};

export const stopHeartbeat = () => {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
};
