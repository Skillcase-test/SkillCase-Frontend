// Shared by main.jsx's global listeners and the route error boundary.
const CHUNK_RELOAD_KEY = "chunk-load-error-timestamp";
const CHUNK_RELOAD_COOLDOWN_MS = 60_000;
const CHUNK_ERROR_PATTERNS = [
  "failed to fetch dynamically imported module",
  "error loading dynamically imported module",
  "importing a module script failed",
  "is not a valid javascript mime type",
  "failed to load module script",
  "chunkloaderror",
  "loading chunk",
];

function errorMessage(error) {
  if (!error) return "";
  if (typeof error === "string") return error;
  return error.message || String(error);
}

export function isChunkLoadError(error) {
  const message = errorMessage(error).toLowerCase();
  return CHUNK_ERROR_PATTERNS.some((pattern) => message.includes(pattern));
}

export function reloadForChunkError(event, error, force = false) {
  if (!force && !isChunkLoadError(error)) return false;

  const now = Date.now();
  const lastReloadAt = Number(sessionStorage.getItem(CHUNK_RELOAD_KEY) || 0);
  if (now - lastReloadAt < CHUNK_RELOAD_COOLDOWN_MS) return false;

  event?.preventDefault?.();
  sessionStorage.setItem(CHUNK_RELOAD_KEY, String(now));
  window.location.reload();
  return true;
}
