import { useCallback, useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { getMyFeatureFlags } from "../api/featureFlagApi";

// In-memory module cache keyed by userId
let cachedUserId = null;
let cachedFlags = null;
let isFetching = false;
let lastFetchAt = 0;
const listeners = new Set();

// focus/visibilitychange fire per mounted consumer and can storm on quick
// tab switches — forced refreshes within this window reuse the fresh cache.
const FORCED_REFRESH_MIN_INTERVAL_MS = 15000;

function notifyListeners() {
  listeners.forEach((listener) => listener(cachedFlags));
}

export function _resetFlagsCache() {
  cachedUserId = null;
  cachedFlags = null;
  isFetching = false;
  lastFetchAt = 0;
}

export function triggerFeatureFlagsRefresh() {
  window.dispatchEvent(new CustomEvent("featureFlagsRefresh"));
}

export function useFeatureFlags() {
  const { user } = useSelector((state) => state.auth);
  const [flags, setFlags] = useState(
    cachedUserId === user?.user_id && cachedFlags ? cachedFlags : {}
  );
  const [loading, setLoading] = useState(
    !(cachedUserId === user?.user_id && cachedFlags)
  );

  const fetchFlags = useCallback(
    async (force = false) => {
      if (!user?.user_id) {
        cachedUserId = null;
        cachedFlags = {};
        setFlags({});
        setLoading(false);
        return;
      }

      // One in-flight fetch max, forced or not — a forced refresh during an
      // active fetch gets the fresh result when it lands anyway.
      if (isFetching && cachedUserId === user.user_id) return;
      if (
        force &&
        cachedUserId === user.user_id &&
        cachedFlags &&
        Date.now() - lastFetchAt < FORCED_REFRESH_MIN_INTERVAL_MS
      ) {
        setFlags(cachedFlags);
        setLoading(false);
        return;
      }

      try {
        isFetching = true;
        lastFetchAt = Date.now();
        const res = await getMyFeatureFlags();
        const resolved = res?.data?.flags || {};
        cachedUserId = user.user_id;
        cachedFlags = resolved;
        setFlags(resolved);
        notifyListeners();
      } catch (err) {
        console.warn("[useFeatureFlags] Failed to fetch feature flags:", err.message);
      } finally {
        isFetching = false;
        setLoading(false);
      }
    },
    [user?.user_id]
  );

  useEffect(() => {
    const handleUpdate = (updatedFlags) => {
      if (updatedFlags) setFlags(updatedFlags);
    };

    listeners.add(handleUpdate);

    if (cachedUserId !== user?.user_id || !cachedFlags) {
      fetchFlags(true);
    } else {
      setFlags(cachedFlags);
      setLoading(false);
    }

    const handleRefresh = () => fetchFlags(true);
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        fetchFlags(true);
      }
    };

    window.addEventListener("featureFlagsRefresh", handleRefresh);
    window.addEventListener("focus", handleRefresh);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      listeners.delete(handleUpdate);
      window.removeEventListener("featureFlagsRefresh", handleRefresh);
      window.removeEventListener("focus", handleRefresh);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [fetchFlags, user?.user_id]);

  const isFeatureEnabled = useCallback(
    (featureKey) => {
      if (!featureKey) return false;
      return Boolean(flags[featureKey]);
    },
    [flags]
  );

  return {
    flags,
    loading,
    isFeatureEnabled,
    refreshFlags: () => fetchFlags(true),
  };
}
