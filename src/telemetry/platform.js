import { Capacitor } from "@capacitor/core";
import { App as CapacitorApp } from "@capacitor/app";
import { APP_VERSION } from "../config/appVersion";
import { APP_BUILD_ID, APP_RELEASE } from "../config/release";

const context = {
  platform: "web",
  runtime: "browser",
  app_version: APP_VERSION,
  app_build: APP_BUILD_ID,
  release: APP_RELEASE,
};

function detectWebSurface() {
  const standalone =
    window.matchMedia?.("(display-mode: standalone)")?.matches ||
    window.navigator?.standalone === true;
  return standalone ? "pwa" : "web";
}

export async function initializePlatformContext() {
  const native = Capacitor.isNativePlatform();
  const capacitorPlatform = Capacitor.getPlatform();
  context.platform = native
    ? capacitorPlatform === "ios"
      ? "ios"
      : "android"
    : detectWebSurface();
  context.runtime = native ? "capacitor" : "browser";

  if (native) {
    try {
      const info = await CapacitorApp.getInfo();
      context.app_version = info.version || APP_VERSION;
      context.app_build = info.build || null;
    } catch {
      // APP_VERSION remains the safe fallback; platform resolution must fail open.
    }
  }
  return { ...context };
}

export function getPlatformContext() {
  if (!Capacitor.isNativePlatform()) context.platform = detectWebSurface();
  return { ...context };
}

export function getTelemetryHeaders({ sessionId, journeyId, interactionId } = {}) {
  const current = getPlatformContext();
  return {
    "X-Skillcase-Platform": current.platform,
    "X-Skillcase-Runtime": current.runtime,
    "X-Skillcase-App-Version": current.app_version || "unknown",
    "X-Skillcase-App-Build": current.app_build || "unknown",
    "X-Skillcase-Release": current.release || "unknown",
    ...(sessionId ? { "X-Skillcase-Session-Id": sessionId } : {}),
    ...(journeyId ? { "X-Skillcase-Journey-Id": journeyId } : {}),
    ...(interactionId
      ? { "X-Skillcase-Interaction-Id": interactionId }
      : {}),
  };
}
