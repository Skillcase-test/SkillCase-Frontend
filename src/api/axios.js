import axios from "axios";
import { store } from "../redux/store";
import { setUser } from "../redux/auth/authSlice";
import {
  isMaintenanceResponse,
  setMaintenanceStatus,
} from "../utils/maintenanceSignal";
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
const cacheTagEpochs = new Map();
let activeAuthScope = "";
let paywallRefreshPromise = null;
// Bumped by clearGetCaches(). A GET already in flight when a clear happens
// captured a stale epoch — its `.then()` must not repopulate the cache with
// pre-write data after the clear runs, or the clear is silently undone the
// moment that slow/older request finally resolves.
let cacheEpoch = 0;

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
  cacheEpoch += 1;
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

function normalizeCacheTags(tags) {
  if (!Array.isArray(tags)) return [];

  return Array.from(
    new Set(
      tags
        .filter((tag) => typeof tag === "string")
        .map((tag) => tag.trim())
        .filter(Boolean),
    ),
  );
}

function getCacheTagEpoch(tag) {
  return cacheTagEpochs.get(tag) || 0;
}

function invalidateGetCacheTags(tags) {
  const normalizedTags = normalizeCacheTags(tags);
  if (!normalizedTags.length) return;

  normalizedTags.forEach((tag) => {
    cacheTagEpochs.set(tag, getCacheTagEpoch(tag) + 1);
  });

  const hasInvalidatedTag = (entry) =>
    entry?.tags?.some((tag) => normalizedTags.includes(tag));

  for (const [key, entry] of getCache.entries()) {
    if (hasInvalidatedTag(entry)) getCache.delete(key);
  }

  // Dropping an in-flight request prevents a late response from being
  // returned to a later caller. Its promise still settles for the original
  // caller, but the epoch check below prevents it from repopulating cache.
  for (const [key, entry] of inFlightGet.entries()) {
    if (hasInvalidatedTag(entry)) inFlightGet.delete(key);
  }
}

api.cachedGet = async (url, config = {}, cacheProfile = "NO_CACHE") => {
  const authScope = ensureAuthScopeFresh();
  const requestConfig = {
    ...config,
    meta: { ...(config.meta || {}), cacheProfile },
  };
  const cacheTags = normalizeCacheTags(requestConfig.meta?.cacheTags);
  if (cacheTags.length) {
    // The application cache is invalidated below, but the browser may also
    // have cached the HTTP response because the backend deliberately uses a
    // private max-age. A tag generation in the query string gives the next
    // read a new HTTP cache key after a progress write without disabling
    // caching altogether.
    requestConfig.params = {
      ...(requestConfig.params || {}),
      __skillcase_cache_version: [
        `global:${cacheEpoch}`,
        ...cacheTags.map((tag) => `${tag}:${getCacheTagEpoch(tag)}`),
      ].join("|"),
    };
  }
  const ttl = GET_CACHE_TTLS[cacheProfile] ?? 0;
  if (!ttl) return api.get(url, requestConfig);

  const key = getCacheKey(url, requestConfig?.params, authScope);
  const now = Date.now();
  const existing = getCache.get(key);
  if (existing && now < existing.expiresAt) {
    // TEMP DEBUG: verify tagged-learning cache reuse during rollout; remove
    // once the cache migration is confirmed.
    console.log("[usageLimitDebug] cachedGet: served from cache", {
      at: now,
      url,
      ageMs: ttl - (existing.expiresAt - now),
    });
    return existing.response;
  }
  if (existing) getCache.delete(key);

  if (!inFlightGet.has(key)) {
    const epochAtStart = cacheEpoch;
    const tagEpochsAtStart = new Map(
      cacheTags.map((tag) => [tag, getCacheTagEpoch(tag)]),
    );
    const entry = { tags: cacheTags, promise: null };
    entry.promise = api.get(url, requestConfig).then((response) => {
        // A clear that ran while this request was in flight bumps the
        // epoch — caching this response now would silently resurrect
        // exactly the stale data that clear was meant to get rid of.
        const tagsStillValid = cacheTags.every(
          (tag) => getCacheTagEpoch(tag) === tagEpochsAtStart.get(tag),
        );
        if (cacheEpoch === epochAtStart && tagsStillValid) {
          getCache.set(key, {
            response,
            expiresAt: Date.now() + ttl,
            tags: cacheTags,
          });
        } else {
          console.log("[usageLimitDebug] cachedGet: discarding stale in-flight response (cache cleared meanwhile)", {
            at: Date.now(),
            url,
            epochAtStart,
            cacheEpoch,
          });
        }
        return response;
      })
      .finally(() => {
        // A tag invalidation may have replaced this key with a newer request;
        // never let the old request delete the replacement.
        if (inFlightGet.get(key) === entry) inFlightGet.delete(key);
      });

    inFlightGet.set(key, entry);
  }

  return await inFlightGet.get(key).promise;
};

api.clearGetCache = clearGetCaches;
api.invalidateGetCacheTags = invalidateGetCacheTags;

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
    const method = (response?.config?.method || "get").toLowerCase();
    if (method !== "get") {
      // Tagged learning writes invalidate only their related GETs. Untagged
      // mutations keep the existing full-clear fallback until migrated;
      // read-only POST checks can opt out entirely.
      const invalidationTags = normalizeCacheTags(
        response?.config?.meta?.invalidateCacheTags,
      );
      if (invalidationTags.length) {
        invalidateGetCacheTags(invalidationTags);
      } else if (response?.config?.meta?.skipCacheInvalidation !== true) {
        // Keep the existing safe fallback for mutations that have not yet
        // been assigned tags. Flashcard writes use targeted invalidation.
        clearGetCaches();
      }
    }
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

    const invalidationTags = normalizeCacheTags(
      error?.config?.meta?.invalidateCacheTags,
    );
    if (invalidationTags.length) invalidateGetCacheTags(invalidationTags);

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

    if (isMaintenanceResponse(error)) {
      setMaintenanceStatus(true);
    }

    if (statusCode === 402 && error?.response?.data?.reason === "usage_limit") {
      // Module usage-limit lock — distinct from the blanket subscription
      // paywall below. Nothing on the user row changed, so there's no need
      // to refetch /user/me; just surface the modal with the block details.
      window.dispatchEvent(
        new CustomEvent("skillcase:usage-limit", { detail: error.response.data }),
      );
    } else if (
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
