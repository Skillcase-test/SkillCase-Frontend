import * as Sentry from "@sentry/react";
import { Capacitor } from "@capacitor/core";
import { APP_VERSION } from "../config/appVersion";

const SENSITIVE_KEY_PATTERN =
  /token|authorization|cookie|password|otp|phone|email|secret|session|bearer/i;

function redactValue(value) {
  if (value == null) return value;
  if (typeof value === "string") {
    if (value.length > 256) return "[REDACTED_LONG_STRING]";
    return value;
  }
  if (Array.isArray(value)) return value.slice(0, 10).map(redactValue);
  if (typeof value === "object") {
    const out = {};
    Object.entries(value).forEach(([key, val]) => {
      out[key] = SENSITIVE_KEY_PATTERN.test(key) ? "[REDACTED]" : redactValue(val);
    });
    return out;
  }
  return value;
}

function sanitizeUrlPath(url) {
  if (!url) return "unknown";
  try {
    const parsed = new URL(url, window?.location?.origin);
    return parsed.pathname || url;
  } catch {
    return String(url).split("?")[0];
  }
}

function shouldEnableSentry() {
  if (!import.meta.env.VITE_SENTRY_DSN) return false;
  if (import.meta.env.VITE_SENTRY_ENABLED === "true") return true;
  return import.meta.env.PROD;
}

export function initSentry() {
  if (!shouldEnableSentry()) return;

  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.VITE_SENTRY_ENVIRONMENT || import.meta.env.MODE,
    release:
      import.meta.env.VITE_SENTRY_RELEASE ||
      `${import.meta.env.MODE}@${APP_VERSION}`,
    dist: APP_VERSION,
    sendDefaultPii: false,
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0.03,
    replaysOnErrorSampleRate: 1.0,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: false,
      }),
    ],
    beforeSend(event) {
      const next = { ...event };

      if (next.request) {
        next.request = {
          ...next.request,
          url: sanitizeUrlPath(next.request.url),
          headers: "[REDACTED]",
          data: "[REDACTED]",
          cookies: "[REDACTED]",
        };
      }

      if (next.extra) {
        next.extra = redactValue(next.extra);
      }

      if (next.breadcrumbs?.length) {
        next.breadcrumbs = next.breadcrumbs.slice(-40).map((crumb) => ({
          ...crumb,
          data: redactValue(crumb.data),
        }));
      }

      return next;
    },
  });

  Sentry.setTag("app.version", APP_VERSION);
  Sentry.setTag(
    "app.platform",
    Capacitor.isNativePlatform() ? "capacitor-app" : "web",
  );
  Sentry.setTag("build.type", import.meta.env.MODE || "unknown");
}

export function setSentryUserFromAuth(user) {
  if (!shouldEnableSentry()) return;
  if (!user) {
    Sentry.setUser(null);
    Sentry.setTag("user.role", "anonymous");
    return;
  }

  Sentry.setUser({
    id: user.user_id || undefined,
    username: user.username || undefined,
  });
  Sentry.setTag("user.role", user.role || "user");
  Sentry.setTag("user.level", user.user_prof_level || "unknown");
}

export function addSentryBreadcrumb({ category, message, data, level = "info" }) {
  if (!shouldEnableSentry()) return;
  Sentry.addBreadcrumb({
    category,
    message,
    level,
    data: redactValue(data),
  });
}

export function captureApiError(error, context = {}) {
  if (!shouldEnableSentry()) return;
  const status = error?.response?.status ?? 0;
  const method = (error?.config?.method || "get").toUpperCase();
  const urlPath = sanitizeUrlPath(error?.config?.url || "unknown");
  const endpointGroup = urlPath.split("/").filter(Boolean).slice(0, 2).join("/") || "unknown";

  Sentry.withScope((scope) => {
    scope.setTag("feature_area", context.featureArea || "api");
    scope.setTag("http.status", String(status || "network"));
    scope.setTag("http.method", method);
    scope.setTag("http.endpoint_group", endpointGroup);
    scope.setFingerprint([
      "api-error",
      method,
      endpointGroup,
      status ? `${Math.floor(status / 100)}xx` : "network",
    ]);
    scope.setExtra(
      "api",
      redactValue({
        cacheProfile: context.cacheProfile,
        requestId:
          error?.response?.headers?.["x-request-id"] ||
          error?.response?.headers?.["x-amzn-requestid"] ||
          null,
        urlPath,
        retries: context.retries ?? 0,
        canceled:
          error?.code === "ERR_CANCELED" || error?.name === "CanceledError",
      }),
    );
    Sentry.captureException(error);
  });
}

export function captureFeatureError(error, context = {}) {
  if (!shouldEnableSentry()) return;
  Sentry.withScope((scope) => {
    scope.setTag("feature_area", context.featureArea || "app");
    Object.entries(context.tags || {}).forEach(([key, val]) =>
      scope.setTag(key, String(val)),
    );
    if (context.extra) scope.setExtras(redactValue(context.extra));
    Sentry.captureException(error);
  });
}
