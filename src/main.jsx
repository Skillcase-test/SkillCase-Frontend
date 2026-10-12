import { isChunkLoadError, reloadForChunkError } from "./utils/chunkErrors";

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

// Bundled instead of Google Fonts so first paint never waits on the network
import "@fontsource/poppins/400.css";
import "@fontsource/poppins/500.css";
import "@fontsource/poppins/600.css";
import "@fontsource/poppins/700.css";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
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
import AppSplashScreen from "./components/common/AppSplashScreen";
import { UsageLimitProvider } from "./hooks/useUsageLimits";

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
          <PersistGate loading={<AppSplashScreen message="Hi, I am Maya." />} persistor={persistor}>
              <UsageLimitProvider>
                <App />
              </UsageLimitProvider>
          </PersistGate>
        </Provider>
  </Sentry.ErrorBoundary>
);
