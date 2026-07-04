// index.js

// Catch global dynamic import/chunk loading failures and reload the page to get the latest build assets.
window.addEventListener('error', (event) => {
  const msg = event.message || "";
  if (msg.includes("Failed to fetch dynamically imported module")) {
    const chunkErrorKey = 'chunk-load-error-timestamp';
    const now = Date.now();
    const lastErrorTime = sessionStorage.getItem(chunkErrorKey);
    if (!lastErrorTime || now - Number(lastErrorTime) > 15000) {
      sessionStorage.setItem(chunkErrorKey, String(now));
      window.location.reload();
    }
  }
}, true);

window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason;
  const msg = (reason && (reason.message || String(reason))) || "";
  if (msg.includes("Failed to fetch dynamically imported module")) {
    const chunkErrorKey = 'chunk-load-error-timestamp';
    const now = Date.now();
    const lastErrorTime = sessionStorage.getItem(chunkErrorKey);
    if (!lastErrorTime || now - Number(lastErrorTime) > 15000) {
      sessionStorage.setItem(chunkErrorKey, String(now));
      window.location.reload();
    }
  }
});

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { PersistGate } from 'redux-persist/integration/react';
import { store,persistor} from './redux/store';
import { Provider } from 'react-redux';
import "./index.css"

import posthog from 'posthog-js';
import { PostHogProvider, PostHogErrorBoundary } from '@posthog/react';
import { Capacitor } from '@capacitor/core';
import * as Sentry from "@sentry/react";
import { initSentry } from "./observability/sentry";

initSentry();

posthog.init(import.meta.env.VITE_PUBLIC_POSTHOG_PROJECT_TOKEN, {
  api_host: import.meta.env.VITE_PUBLIC_POSTHOG_HOST,
  defaults: '2026-01-30',
  loaded: (posthog_instance) => {
    posthog_instance.register({
      client_platform: Capacitor.isNativePlatform() ? 'app' : 'web'
    });
  }
});

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <PostHogProvider client={posthog}>
    <PostHogErrorBoundary>
      <Sentry.ErrorBoundary fallback={<div>Something went wrong.</div>}>
        <Provider store={store}>
          <PersistGate loading={null} persistor={persistor}>
              <App />
          </PersistGate>
        </Provider>
      </Sentry.ErrorBoundary>
    </PostHogErrorBoundary>
  </PostHogProvider>
);
