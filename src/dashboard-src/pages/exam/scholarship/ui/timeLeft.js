import { useEffect, useState } from "react";

/** Ticking clock for countdown displays; re-renders every intervalMs. */
export function useNowMs(intervalMs = 60000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}

/**
 * Compact countdown label for a millisecond delta: "3d 4h left", "22h 10m
 * left", "9m left", or "Expired". Returns null for unknown/invalid input.
 */
export function formatTimeLeft(ms) {
  if (ms == null || !Number.isFinite(ms)) return null;
  if (ms <= 0) return "Expired";
  const totalMins = Math.floor(ms / 60000);
  const days = Math.floor(totalMins / 1440);
  const hours = Math.floor((totalMins % 1440) / 60);
  const mins = totalMins % 60;
  if (days > 0) return `${days}d ${hours}h left`;
  if (hours > 0) return `${hours}h ${mins}m left`;
  return `${mins}m left`;
}

/** Countdown label from an ISO/timestamp deadline. */
export function timeLeftUntil(deadline, nowMs = Date.now()) {
  if (!deadline) return null;
  const end = new Date(deadline).getTime();
  if (!Number.isFinite(end)) return null;
  return formatTimeLeft(end - nowMs);
}
