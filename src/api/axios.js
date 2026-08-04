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

const CACHE_EPOCH_STORAGE_KEY = "skillcase:get-cache-epochs:v1";
const MAX_PERSISTED_CACHE_SCOPES = 32;
const getCache = new Map();
const inFlightGet = new Map();
let cacheTagEpochs = new Map();
let activeAuthScope = "";
let paywallRefreshPromise = null;
// Bumped by clearGetCaches(). A GET already in flight when a clear happens
// captured a stale epoch — its `.then()` must not repopulate the cache with
// pre-write data after the clear runs, or the clear is silently undone the
// moment that slow/older request finally resolves.
let cacheEpoch = 0;

function getEpochStorage() {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function normalizeEpoch(value) {
  return Number.isSafeInteger(value) && value >= 0 ? value : 0;
}

function normalizeEpochRecord(record) {
  const tags = {};
  const savedTags = record?.tags;

  if (savedTags && typeof savedTags === "object" && !Array.isArray(savedTags)) {
    Object.entries(savedTags).forEach(([tag, epoch]) => {
      if (
        typeof tag === "string" &&
        tag &&
        Number.isSafeInteger(epoch) &&
        epoch >= 0
      ) {
        tags[tag] = epoch;
      }
    });
  }

  return {
    global: normalizeEpoch(record?.global),
    tags,
  };
}

function mergeEpochRecords(...records) {
  const merged = { global: 0, tags: {} };

  records.forEach((record) => {
    const normalized = normalizeEpochRecord(record);
    merged.global = Math.max(merged.global, normalized.global);
    Object.entries(normalized.tags).forEach(([tag, epoch]) => {
      merged.tags[tag] = Math.max(merged.tags[tag] || 0, epoch);
    });
  });

  return merged;
}

function readPersistedCacheEpochs() {
  const storage = getEpochStorage();
  if (!storage) return {};

  try {
    const parsed = JSON.parse(storage.getItem(CACHE_EPOCH_STORAGE_KEY) || "{}");
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }

    // Older builds included a token suffix in the scope key. Collapse those
    // records into the user-id scope while reading so a deployment does not
    // reset its HTTP-cache generation, and never write the token residue back.
    return Object.entries(parsed).reduce((scopes, [scope, record]) => {
      if (typeof scope !== "string" || !scope) return scopes;
      const userScope = scope.split("::", 1)[0] || "anon";
      scopes[userScope] = mergeEpochRecords(scopes[userScope], record);
      return scopes;
    }, {});
  } catch {
    return {};
  }
}

// The browser's HTTP cache survives a reload, while module variables do not.
// Keep one generation record per auth scope so a post-write request cannot
// reuse the URL/body that was cached before that write. A scope with no write
// still reuses its previous generation and therefore keeps normal cache hits.
const persistedCacheEpochs = readPersistedCacheEpochs();

function getCacheEpochRecord() {
  const tags = {};
  cacheTagEpochs.forEach((epoch, tag) => {
    tags[tag] = epoch;
  });
  return { global: cacheEpoch, tags };
}

function setCacheEpochRecord(record) {
  const normalized = normalizeEpochRecord(record);
  cacheEpoch = normalized.global;
  cacheTagEpochs = new Map(Object.entries(normalized.tags));
}

function restoreCacheEpochs(scope) {
  setCacheEpochRecord(persistedCacheEpochs[scope]);
}

function adoptExternalCacheEpochs(record) {
  const current = getCacheEpochRecord();
  const merged = mergeEpochRecords(current, record);
  const hasNewerGlobal = merged.global > current.global;
  const hasNewerTag = Object.entries(merged.tags).some(
    ([tag, epoch]) => epoch > (current.tags[tag] || 0),
  );

  if (hasNewerGlobal || hasNewerTag) {
    getCache.clear();
    inFlightGet.clear();
  }

  setCacheEpochRecord(merged);
}

function prunePersistedCacheEpochs(records, keepScope) {
  const scopes = Object.keys(records);
  while (scopes.length > MAX_PERSISTED_CACHE_SCOPES) {
    const removable = scopes.find((scope) => scope !== keepScope);
    if (removable === undefined) break;
    delete records[removable];
    scopes.splice(scopes.indexOf(removable), 1);
  }
  return records;
}

function replacePersistedCacheEpochs(records) {
  Object.keys(persistedCacheEpochs).forEach((scope) => {
    delete persistedCacheEpochs[scope];
  });
  Object.assign(persistedCacheEpochs, records);
}

function persistCacheEpochs() {
  if (!activeAuthScope) return;

  const storage = getEpochStorage();
  // Another tab may have advanced a different tag since this module last
  // read localStorage. Merge by maximum epoch before writing so this tab
  // cannot clobber that invalidation with its stale in-memory snapshot.
  const latest = readPersistedCacheEpochs();
  const mergedActive = mergeEpochRecords(
    latest[activeAuthScope],
    getCacheEpochRecord(),
  );
  adoptExternalCacheEpochs(mergedActive);

  const next = { ...latest };
  delete next[activeAuthScope];
  next[activeAuthScope] = getCacheEpochRecord();
  prunePersistedCacheEpochs(next, activeAuthScope);
  replacePersistedCacheEpochs(next);

  if (!storage) return;
  try {
    storage.setItem(CACHE_EPOCH_STORAGE_KEY, JSON.stringify(persistedCacheEpochs));
  } catch {
    // Private browsing and quota-restricted contexts can reject storage. The
    // in-memory epoch guards still protect the current page in that case.
  }
}

function handleCacheEpochStorage(event) {
  if (event?.key !== CACHE_EPOCH_STORAGE_KEY) return;

  const latest = readPersistedCacheEpochs();
  replacePersistedCacheEpochs(latest);
  if (activeAuthScope && latest[activeAuthScope]) {
    adoptExternalCacheEpochs(latest[activeAuthScope]);
  }
}

if (typeof window !== "undefined") {
  window.addEventListener("storage", handleCacheEpochStorage);
}

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
  return String(state?.user?.user_id || "anon");
}

function clearGetCaches() {
  ensureAuthScopeFresh();
  getCache.clear();
  inFlightGet.clear();
  cacheEpoch += 1;
  persistCacheEpochs();
}

function ensureAuthScopeFresh() {
  const currentScope = getAuthScope();
  if (currentScope !== activeAuthScope) {
    const hadActiveScope = activeAuthScope !== "";
    getCache.clear();
    inFlightGet.clear();
    activeAuthScope = currentScope;
    restoreCacheEpochs(currentScope);
    // A scope transition must invalidate any request that was in flight for
    // the previous user/session. The initial module load intentionally does
    // not bump the restored value, which is what preserves valid HTTP-cache
    // reuse across a reload.
    if (hadActiveScope) {
      cacheEpoch += 1;
      persistCacheEpochs();
    }
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

  ensureAuthScopeFresh();

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

  persistCacheEpochs();
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

  const requestMethod = (config.method || "get").toLowerCase();
  if (requestMethod !== "get") {
    const invalidationTags = normalizeCacheTags(config.meta.invalidateCacheTags);
    if (invalidationTags.length) {
      // Invalidate at request start as well as on direct response-handler
      // calls. This closes the small window where a fire-and-forget progress
      // save is followed immediately by a GET before the POST resolves.
      invalidateGetCacheTags(invalidationTags);
    }
  }

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
        // Keep request-start invalidation for fire-and-forget saves, and also
        // invalidate after the server response. The latter prevents a GET
        // that started between request dispatch and DB commit from surviving
        // under the post-request generation.
        invalidateGetCacheTags(invalidationTags);
      } else if (response?.config?.meta?.skipCacheInvalidation !== true) {
        // Keep the existing safe fallback for mutations that have not yet
        // been assigned tags. Flashcard writes use targeted invalidation.
        clearGetCaches();
      }
    }
    if (
      response?.config?.meta?.refreshUsageLimitsOnSuccess === true &&
      typeof window !== "undefined"
    ) {
      window.dispatchEvent(new CustomEvent("skillcase:usage-limit-refresh"));
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
    if (invalidationTags.length) {
      invalidateGetCacheTags(invalidationTags);
    }

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
