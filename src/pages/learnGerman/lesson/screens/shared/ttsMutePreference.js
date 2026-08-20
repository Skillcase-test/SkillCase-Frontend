const STORAGE_KEY = "maya_tts_muted";
export const TTS_MUTE_CHANGE_EVENT = "ttsMuteChange";

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
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(TTS_MUTE_CHANGE_EVENT, {
        detail: { isMuted: Boolean(muted) },
      }),
    );
  }
}

export function subscribeTTSMute(callback) {
  if (typeof window === "undefined") return () => {};
  const handler = (e) => {
    const isMuted =
      e?.detail?.isMuted !== undefined ? e.detail.isMuted : isTTSMuted();
    callback(isMuted);
  };
  window.addEventListener(TTS_MUTE_CHANGE_EVENT, handler);
  return () => window.removeEventListener(TTS_MUTE_CHANGE_EVENT, handler);
}
