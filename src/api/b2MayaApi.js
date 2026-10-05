import api from "./axios";

/*
 * Talk to Maya (B2): live voice practice with Maya, Skillcase's AI German coach.
 * The call runs over a WebSocket relay on the API host; these endpoints cover everything
 * around it (start, report, progress, "Try it").
 */

/**
 * The WebSocket URL for the call: the API host over ws/wss, no extra env needed.
 * `ws` carries its own auth (the sealed ticket), so this works the same in the
 * Capacitor WebView as in a browser.
 */
export function b2MayaRelayUrl() {
  // VITE_BACKEND_URL already carries the /api prefix (same as every REST call below).
  // A relative base (e.g. "/api") resolves against the page, since older WebViews reject relative ws URLs.
  const base = new URL(String(import.meta.env.VITE_BACKEND_URL || ""), window.location.href).href.replace(/\/+$/, "");
  return `${base.replace(/^http/, "ws")}/b2-maya/live`;
}

/** Topics, modes and word-bank words for the room, plus the learner's name. */
export const getB2MayaMeta = () => api.get("/b2-maya/meta").then((r) => r.data);

/**
 * Starts a practice. `opts`: `{ consent: true, mode: "talk"|"exam", topic?: string, focus?: {sessionId, index} }`.
 * Returns `{ sessionId, ticket, relayPath, mode, minutes }` — `ticket` seals the relay connection.
 */
export const startB2Maya = (opts) => api.post("/b2-maya/start", opts).then((r) => r.data);

/** One practice by id: `{ status, analysis, feedback, transcript, seconds, ... }` + `best`. */
export const getB2MayaSession = (id) => api.get(`/b2-maya/sessions/${encodeURIComponent(id)}`).then((r) => r.data);

/** The learner's practice history for My progress, newest first. */
export const getB2MayaSessions = () => api.get("/b2-maya/sessions").then((r) => r.data.sessions);

/** Re-runs feedback after it failed; returns whether a retry was kicked off. */
export const retryB2MayaFeedback = (id) => api.post(`/b2-maya/sessions/${encodeURIComponent(id)}/retry-feedback`).then((r) => r.data.ok);

/** My progress: `{ rows, progress }`. */
export const getB2MayaProgress = () => api.get("/b2-maya/progress").then((r) => r.data);

/** The corrected sentence in Maya's voice, for "Try it". Returns a playable blob URL. */
export const getB2MayaSayAudio = async (sessionId, index) => {
  const r = await api.get("/b2-maya/say/audio", {
    params: { session: sessionId, i: index },
    responseType: "blob",
  });
  return URL.createObjectURL(r.data);
};

/** The learner's recorded sentence (16 kHz WAV blob), scored word by word. */
export const postB2MayaSayAttempt = async (sessionId, index, wav) => {
  const r = await api.post("/b2-maya/say/attempt", wav, {
    params: { session: sessionId, i: index },
    headers: { "Content-Type": "audio/wav" },
  });
  return r.data;
};
