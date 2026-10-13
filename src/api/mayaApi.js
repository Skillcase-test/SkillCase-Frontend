import api from "./axios";

/*
 * Talk to Maya: live voice practice with Maya, Skillcase's AI German coach.
 * The call runs over a WebSocket relay on the API host; these endpoints cover everything
 * around it (start, report, progress, "Try it"). Each level has its own route prefix.
 */

const PREFIX = { A2: "/maya/a2", B1: "/maya/b1", B2: "/b2-maya" };

/**
 * The WebSocket URL for the call: the API host over ws/wss, no extra env needed.
 * One relay serves every level (the sealed ticket carries the level), so this has no level.
 * `ws` carries its own auth (the sealed ticket), so this works the same in the
 * Capacitor WebView as in a browser.
 */
export function mayaRelayUrl() {
  // VITE_BACKEND_URL already carries the /api prefix (same as every REST call below).
  // A relative base (e.g. "/api") resolves against the page, since older WebViews reject relative ws URLs.
  const base = new URL(String(import.meta.env.VITE_BACKEND_URL || ""), window.location.href).href.replace(/\/+$/, "");
  return `${base.replace(/^http/, "ws")}/b2-maya/live`;
}

export function mayaApi(level) {
  const p = PREFIX[level];
  return {
    /** Topics, modes and word-bank words for the room, plus the learner's name. */
    meta: () => api.get(`${p}/meta`).then((r) => r.data),

    /**
     * Starts a practice. `opts`: `{ consent: true, mode, topic?: string, focus?: {sessionId, index} }`.
     * Returns `{ sessionId, ticket, relayPath, mode, minutes }` — `ticket` seals the relay connection.
     */
    start: (opts) => api.post(`${p}/start`, opts).then((r) => r.data),

    /** One practice by id: `{ status, analysis, feedback, transcript, seconds, ... }` + `best`. */
    session: (id) => api.get(`${p}/sessions/${encodeURIComponent(id)}`).then((r) => r.data),

    /** The learner's practice history for My progress, newest first. */
    sessions: () => api.get(`${p}/sessions`).then((r) => r.data.sessions),

    /** Re-runs feedback after it failed; returns whether a retry was kicked off. */
    retryFeedback: (id) => api.post(`${p}/sessions/${encodeURIComponent(id)}/retry-feedback`).then((r) => r.data.ok),

    /** My progress: `{ progress }`. */
    progress: () => api.get(`${p}/progress`).then((r) => r.data),

    /** The corrected sentence in Maya's voice, for "Try it". Returns a playable blob URL. */
    sayAudio: async (sessionId, index) => {
      const r = await api.get(`${p}/say/audio`, { params: { session: sessionId, i: index }, responseType: "blob" });
      return URL.createObjectURL(r.data);
    },

    /** The learner's recorded sentence (16 kHz WAV blob), scored word by word. */
    sayAttempt: async (sessionId, index, wav) => {
      const r = await api.post(`${p}/say/attempt`, wav, {
        params: { session: sessionId, i: index },
        headers: { "Content-Type": "audio/wav" },
      });
      return r.data;
    },
  };
}
