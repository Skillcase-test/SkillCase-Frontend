import { captureTelemetryError } from "../telemetry";

function sanitizeUrlPath(url) {
  if (!url) return "unknown";
  try {
    const parsed = new URL(url, window?.location?.origin);
    return parsed.pathname || url;
  } catch {
    return String(url).split("?")[0];
  }
}

export function captureApiError(error) {
  const status = error?.response?.status ?? 0;
  captureTelemetryError(error, {
    domain: "api",
    feature: sanitizeUrlPath(error?.config?.url || "unknown"),
    handled: true,
    reason_code: status ? `http_${status}` : error?.code || "network_error",
    request_id:
      error?.response?.headers?.["x-request-id"] ||
      error?.response?.headers?.["x-amzn-requestid"] ||
      null,
  });
}

export function captureFeatureError(error, context = {}) {
  captureTelemetryError(error, {
    domain: context.featureArea || "app",
    feature: window.location?.pathname,
    handled: true,
    reason_code: context.tags?.action || error?.code || "feature_error",
  });
}
