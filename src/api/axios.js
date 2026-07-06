import axios from "axios";
import { store } from "../redux/store";
import { setUser } from "../redux/auth/authSlice";
import { setMaintenanceStatus } from "../utils/maintenanceSignal";
import { addSentryBreadcrumb, captureApiError } from "../observability/sentry";

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
  ensureAuthScopeFresh();
  config.meta = { ...(config.meta || {}), startedAt: Date.now() };

  const token = store.getState().auth.token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => {
    setMaintenanceStatus(false);
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

    if (!axios.isCancel(error) && error?.code !== "ERR_CANCELED") {
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
