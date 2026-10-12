import { useSyncExternalStore } from "react";

// Download progress ticks every 400ms. Kept out of AppLayout state so only the
// avatar ring re-renders, not the whole app shell.
let progress = 0;
const listeners = new Set();

export function setOtaProgress(next) {
  const value = typeof next === "function" ? next(progress) : next;
  if (value === progress) return;
  progress = value;
  listeners.forEach((listener) => listener());
}

function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useOtaProgress() {
  return useSyncExternalStore(subscribe, () => progress);
}
