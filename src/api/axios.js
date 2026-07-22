import axios from "axios";
import { store } from "../redux/store";
import { setUser } from "../redux/auth/authSlice";
import { setMaintenanceStatus } from "../utils/maintenanceSignal";
import { addSentryBreadcrumb, captureApiError } from "../observability/sentry";
import {
  getTelemetryHeaders,
  getTelemetryRequestContext,
  recordEvent,
} from "../telemetry";

const api = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_URL,
});

const GET_CACHE_TTLS = {
  NO_CACHE: 0,
  SHORT_PRIVATE: 60_000,
  MEDIUM_PRIVATE: 300_000,
  LONG_PUBLIC: 3_600_000,
};

const getCache = new Map();
const inFlightGet = new Map();
let activeAuthScope = "";
let paywallRefreshPromise = null;

// Statuses that describe an expected business or auth state rather than a
// defect: the paywall (402), auth challenges (401/403), absent optional content
// (404), conflicts, validation and rate limits. These were being reported as
// captured errors on every occurrence, which meant one locked account looping
// its gated endpoints produced roughly 1,400 error records. The failure is
// still recorded by the `api.request` telemetry event above, which carries the
// status code, reason code and route -- only the error report is suppressed.
const EXPECTED_API_STATUSES = new Set([401, 402, 403, 404, 409, 422, 429]);

function isExpectedApiOutcome(error) {
  const status = error?.response?.status;
  if (status && EXPECTED_API_STATUSES.has(status)) return true;
  // A transport failure while the device is offline is connectivity, not a bug.
  if (!status && typeof navigator !== "undefined" && navigator.onLine === false) {
    return true;
  }
  return false;
}

function getAuthScope() {
  const state = store.getState().auth;
  const uid = state?.user?.user_id || "anon";
  const token = state?.token || "";
  const tokenFingerprint = token ? token.slice(-12) : "no-token";
  return `${uid}::${tokenFingerprint}`;
}

function clearGetCaches() {
  getCache.clear();
  inFlightGet.clear();
}

function ensureAuthScopeFresh() {
  const currentScope = getAuthScope();
  if (currentScope !== activeAuthScope) {
    activeAuthScope = currentScope;
    clearGetCaches();
  }
  return currentScope;
}

function getCacheKey(url, params, authScope) {
  return `${authScope}::${url}::${JSON.stringify(params || {})}`;
}

api.cachedGet = async (url, config = {}, cacheProfile = "NO_CACHE") => {
  const authScope = ensureAuthScopeFresh();
  const requestConfig = {
    ...config,
    meta: { ...(config.meta || {}), cacheProfile },
  };
  const ttl = GET_CACHE_TTLS[cacheProfile] ?? 0;
  if (!ttl) return api.get(url, requestConfig);

  const key = getCacheKey(url, requestConfig?.params, authScope);
  const now = Date.now();
  const existing = getCache.get(key);
  if (existing && now < existing.expiresAt) {
    return existing.response;
  }

  if (!inFlightGet.has(key)) {
    inFlightGet.set(
      key,
      api.get(url, requestConfig).then((response) => {
        getCache.set(key, { response, expiresAt: Date.now() + ttl });
        return response;
      }),
    );
  }

  try {
    return await inFlightGet.get(key);
  } finally {
    inFlightGet.delete(key);
  }
};

api.clearGetCache = clearGetCaches;

api.interceptors.request.use((config) => {
  window.dispatchEvent(new CustomEvent("skillcase:telemetry:activity", { detail: { type: "api" } }));
  ensureAuthScopeFresh();
  const telemetryContext = getTelemetryRequestContext();
  config.meta = {
    ...(config.meta || {}),
    startedAt: Date.now(),
    telemetryContext,
  };
  config.headers = {
    ...(config.headers || {}),
    ...getTelemetryHeaders(telemetryContext),
  };

  const token = store.getState().auth.token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  recordEvent("api.request", {
    domain: "api",
    feature: config.url,
    entity_type: "http_request",
    entity_id: telemetryContext.interactionId,
    lifecycle: "started",
    attributes: {
      method: (config.method || "get").toUpperCase(),
      route: config.url,
      cache_profile: config.meta?.cacheProfile || "NO_CACHE",
      network_state: navigator.onLine ? "online" : "offline",
    },
  });
  return config;
});

api.interceptors.response.use(
  (response) => {
    setMaintenanceStatus(false);
    const durationMs = response?.config?.meta?.startedAt
      ? Date.now() - response.config.meta.startedAt
      : null;
    recordEvent("api.request", {
      domain: "api",
      feature: response?.config?.url,
      entity_type: "http_request",
      entity_id: response?.config?.meta?.telemetryContext?.interactionId,
      trace_id: response?.headers?.["x-request-id"] || null,
      lifecycle: "succeeded",
      elapsed_ms: Number.isFinite(durationMs) ? durationMs : null,
      outcome: String(response?.status || 200),
      attributes: {
        method: (response?.config?.method || "get").toUpperCase(),
        route: response?.config?.url,
        status_code: response?.status || 200,
        request_id: response?.headers?.["x-request-id"] || null,
        cache_profile: response?.config?.meta?.cacheProfile || "NO_CACHE",
      },
    });
    return response;
  },
  (error) => {
    const statusCode = error?.response?.status;
    const method = (error?.config?.method || "get").toUpperCase();
    const requestUrl = error?.config?.url || "unknown";
    const cacheProfile = error?.config?.meta?.cacheProfile || "NO_CACHE";
    const durationMs = error?.config?.meta?.startedAt
      ? Date.now() - error.config.meta.startedAt
      : null;

    recordEvent("api.request", {
      domain: "api",
      feature: requestUrl,
      entity_type: "http_request",
      entity_id: error?.config?.meta?.telemetryContext?.interactionId,
      trace_id:
        error?.response?.headers?.["x-request-id"] ||
        error?.response?.headers?.["x-amzn-requestid"] ||
        null,
      lifecycle:
        error?.code === "ERR_CANCELED" ? "cancelled" : "failed",
      elapsed_ms: Number.isFinite(durationMs) ? durationMs : null,
      outcome: String(statusCode || "network_error"),
      reason_code:
        error?.code === "ERR_CANCELED"
          ? "request_cancelled"
          : statusCode
            ? `http_${statusCode}`
            : "network_error",
      attributes: {
        method,
        route: requestUrl,
        status_code: statusCode || 0,
        request_id:
          error?.response?.headers?.["x-request-id"] ||
          error?.response?.headers?.["x-amzn-requestid"] ||
          null,
        cache_profile: cacheProfile,
        network_state: navigator.onLine ? "online" : "offline",
      },
    });

    if (statusCode === 503) {
      setMaintenanceStatus(true);
    }

    if (
      statusCode === 402 &&
      error?.response?.data?.locked === true &&
      !error?.config?.meta?.skipPaywallRefresh &&
      store.getState().auth?.token
    ) {
      clearGetCaches();
      if (!paywallRefreshPromise) {
        paywallRefreshPromise = api
          .post("/user/me", null, { meta: { skipPaywallRefresh: true } })
          .then((res) => {
            if (res.data?.user) {
              store.dispatch(setUser(res.data.user));
            }
          })
          .catch(() => {})
          .finally(() => {
            paywallRefreshPromise = null;
          });
      }
    }

    if (
      !axios.isCancel(error) &&
      error?.code !== "ERR_CANCELED" &&
      !isExpectedApiOutcome(error)
    ) {
      addSentryBreadcrumb({
        category: "api",
        message: "api-failure",
        level: "error",
        data: {
          method,
          requestUrl,
          statusCode: statusCode || "network_error",
          durationBucket:
            durationMs == null
              ? "unknown"
              : durationMs < 300
                ? "<300ms"
                : durationMs < 1000
                  ? "300ms-1s"
                  : ">=1s",
        },
      });

      captureApiError(error, {
        featureArea: "api",
        cacheProfile,
      });
    }

    return Promise.reject(error);
  },
);

export default api;
