import api from "./axios";

// The app bootstrap and the tab bar both pull /user/me on launch; they share
// one request, and the tab bar uses the time to skip its next sync.
let lastMeSyncAt = 0;
let inflight = null;

export const getLastMeSyncAt = () => lastMeSyncAt;

export function fetchMe() {
  // A write since the request started may have changed the user, so don't reuse it
  if (inflight && (api.getLastWriteAt?.() || 0) < lastMeSyncAt) return inflight;
  lastMeSyncAt = Date.now();
  const req = api.post("/user/me").finally(() => {
    if (inflight === req) inflight = null;
  });
  inflight = req;
  return req;
}
