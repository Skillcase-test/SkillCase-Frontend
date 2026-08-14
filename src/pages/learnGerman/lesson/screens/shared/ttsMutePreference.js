const STORAGE_KEY = "maya_tts_muted";

export function isTTSMuted() {
  try {
    return localStorage.getItem(STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

export function setTTSMuted(muted) {
  try {
    localStorage.setItem(STORAGE_KEY, String(muted));
  } catch {
    // ignore write failures (e.g. storage disabled)
  }
}
