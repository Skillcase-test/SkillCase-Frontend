import api from "../api/axios";
import { APP_VERSION } from "../config/appVersion";
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

const HEARTBEAT_INTERVAL_MS = 10000;
const HEARTBEAT_MAX_BACKOFF_MS = 300000; // 5 minutes
let heartbeatBackoffMs = 0;
let heartbeatStopped = true;

// A hidden tab or an offline device is not an active session, so there is nothing to report and a request would only fail.
const canSendHeartbeat = () =>
  (typeof navigator === "undefined" || navigator.onLine !== false) &&
  (typeof document === "undefined" || document.visibilityState !== "hidden");

const scheduleHeartbeat = (delayMs) => {
  if (heartbeatStopped) return;
  heartbeatInterval = setTimeout(runHeartbeat, delayMs);
};

async function runHeartbeat() {
  if (heartbeatStopped) return;

  if (!canSendHeartbeat()) {
    scheduleHeartbeat(HEARTBEAT_INTERVAL_MS);
    return;
  }

  try {
    await api.post("/user/heartbeat");
    heartbeatBackoffMs = 0;
  } catch (error) {
    // Back off on transport failures so an outage costs a handful of attempts rather than six per minute for as long as it lasts.
    if (!error?.response) {
      heartbeatBackoffMs = Math.min(
        HEARTBEAT_MAX_BACKOFF_MS,
        Math.max(HEARTBEAT_INTERVAL_MS, heartbeatBackoffMs * 2),
      );
    } else {
      heartbeatBackoffMs = 0;
      if (error.response.status !== 403) {
        console.error("Heartbeat error:", error);
      }
    }
  }

  scheduleHeartbeat(heartbeatBackoffMs || HEARTBEAT_INTERVAL_MS);
}

// Coming back online or refocusing the tab means the next attempt should be immediate rather than waiting out a backoff earned while unreachable.
let wakeListenersBound = false;
const bindWakeListeners = () => {
  if (wakeListenersBound || typeof window === "undefined") return;
  wakeListenersBound = true;
  const wake = () => {
    if (heartbeatStopped || !canSendHeartbeat()) return;
    heartbeatBackoffMs = 0;
    if (heartbeatInterval) clearTimeout(heartbeatInterval);
    scheduleHeartbeat(0);
  };
  window.addEventListener("online", wake);
  document.addEventListener("visibilitychange", wake);
};

export const startHeartbeat = () => {
  if (!heartbeatStopped) return;
  heartbeatStopped = false;
  heartbeatBackoffMs = 0;
  bindWakeListeners();
  void runHeartbeat();
};

export const stopHeartbeat = () => {
  heartbeatStopped = true;
  if (heartbeatInterval) {
    clearTimeout(heartbeatInterval);
    heartbeatInterval = null;
  }
};
