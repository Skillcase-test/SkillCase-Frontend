import axios from "axios";
import { store } from "../redux/store";
import * as Sentry from "@sentry/react";
import { setMaintenanceStatus } from "../utils/maintenanceSignal";

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
  const ttl = GET_CACHE_TTLS[cacheProfile] ?? 0;
  if (!ttl) return api.get(url, config);

  const key = getCacheKey(url, config?.params, authScope);
  const now = Date.now();
  const existing = getCache.get(key);
  if (existing && now < existing.expiresAt) {
    return existing.response;
  }

  if (!inFlightGet.has(key)) {
    inFlightGet.set(
      key,
      api.get(url, config).then((response) => {
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

    // Only treat an explicit 503 as a maintenance signal.
    // Cancelled requests, CORS errors, timeouts, and other network
    // blips must NOT trigger the maintenance modal — the periodic
    // health-check in App.jsx owns that responsibility.
    if (statusCode === 503) {
      setMaintenanceStatus(true);
    }

    // Do not report cancelled/aborted requests to Sentry — they are
    // intentional (e.g. component unmount, route change).
    if (!axios.isCancel(error) && error?.code !== "ERR_CANCELED") {
      Sentry.captureException(error);
    }

    return Promise.reject(error);
  },
);

export default api;
