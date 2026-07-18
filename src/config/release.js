import { APP_VERSION } from "./appVersion";

export const APP_BUILD_ID =
  import.meta.env.VITE_BUILD_ID || import.meta.env.VITE_GIT_SHA || "development";

const releaseBase =
  import.meta.env.VITE_APP_RELEASE || `${import.meta.env.MODE}@${APP_VERSION}`;

export const APP_RELEASE = `${releaseBase}+${APP_BUILD_ID}`;
