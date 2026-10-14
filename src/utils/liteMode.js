// Lite mode trims GPU-heavy effects (backdrop blur, decorative loops) on
// phones that can't afford them. Decided once at startup so nothing visibly
// switches mid-session. Force it either way with localStorage "skillcase:lite" = "1" / "0".
export const LITE_KEY = "skillcase:lite";

function detect() {
  try {
    const forced = localStorage.getItem(LITE_KEY);
    if (forced === "1") return true;
    if (forced === "0") return false;
  } catch {
    // storage blocked; fall through to the device checks
  }
  // deviceMemory rounds down to a power of two, so <= 2 means under 4GB.
  // iOS doesn't expose it; treat unknown as a capable device.
  const memory = navigator.deviceMemory;
  if (typeof memory === "number" && memory <= 2) return true;
  if (navigator.connection?.saveData) return true;
  return !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

export const isLiteMode = typeof window !== "undefined" && detect();

export function applyLiteMode() {
  document.documentElement.classList.toggle("lite", isLiteMode);
}
