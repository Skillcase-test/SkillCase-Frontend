import { Capacitor } from "@capacitor/core";

const ANDROID_ID = "com.skillcase.app";
// Numeric id from App Store Connect; fill in once the iOS listing exists
export const APP_STORE_ID = "";

export const isIos = () => Capacitor.getPlatform() === "ios";

export const storeName = () => (isIos() ? "App Store" : "Play Store");

// Native store link first, web listing as the fallback
export const storeUrls = () =>
  isIos()
    ? APP_STORE_ID
      ? {
          app: `itms-apps://apps.apple.com/app/id${APP_STORE_ID}`,
          web: `https://apps.apple.com/app/id${APP_STORE_ID}`,
        }
      : null
    : {
        app: `market://details?id=${ANDROID_ID}`,
        web: `https://play.google.com/store/apps/details?id=${ANDROID_ID}`,
      };
