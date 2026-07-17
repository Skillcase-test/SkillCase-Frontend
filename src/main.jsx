const CHUNK_RELOAD_KEY = "chunk-load-error-timestamp";
const CHUNK_RELOAD_COOLDOWN_MS = 60_000;
const CHUNK_ERROR_PATTERNS = [
  "failed to fetch dynamically imported module",
  "error loading dynamically imported module",
  "importing a module script failed",
  "failed to load module script",
  "chunkloaderror",
  "loading chunk",
];

function errorMessage(error) {
  if (!error) return "";
  if (typeof error === "string") return error;
  return error.message || String(error);
}

function isChunkLoadError(error) {
  const message = errorMessage(error).toLowerCase();
  return CHUNK_ERROR_PATTERNS.some((pattern) => message.includes(pattern));
}

function reloadForChunkError(event, error, force = false) {
  if (!force && !isChunkLoadError(error)) return false;

  const now = Date.now();
  const lastReloadAt = Number(sessionStorage.getItem(CHUNK_RELOAD_KEY) || 0);
  if (now - lastReloadAt < CHUNK_RELOAD_COOLDOWN_MS) return false;

  event?.preventDefault?.();
  sessionStorage.setItem(CHUNK_RELOAD_KEY, String(now));
  window.location.reload();
  return true;
}

// Vite emits this event when a lazy-loaded asset from an older deployment is unavailable.
window.addEventListener("vite:preloadError", (event) => {
  reloadForChunkError(event, event.payload, true);
});

window.addEventListener(
  "error",
  (event) => reloadForChunkError(event, event.error || event.message),
  true,
);

window.addEventListener("unhandledrejection", (event) => {
  reloadForChunkError(event, event.reason);
});

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { PersistGate } from 'redux-persist/integration/react';
import { store,persistor} from './redux/store';
import { Provider } from 'react-redux';
import "./index.css"

import * as Sentry from "@sentry/react";
import { initSentry } from "./observability/sentry";
import AppErrorFallback from "./components/AppErrorFallback";
import { initializeTelemetry } from "./telemetry";

initializeTelemetry();
initSentry();

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <Sentry.ErrorBoundary
        fallback={({ error, resetError }) => (
          <AppErrorFallback
            staleChunk={isChunkLoadError(error)}
            resetError={resetError}
          />
        )}
      >
        <Provider store={store}>
          <PersistGate loading={null} persistor={persistor}>
              <App />
          </PersistGate>
        </Provider>
  </Sentry.ErrorBoundary>
);
