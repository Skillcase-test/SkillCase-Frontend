import { reloadForChunkError } from "./utils/chunkErrors";
import { applyLiteMode } from "./utils/liteMode";

// Before the first paint, so lite styles never flash in
applyLiteMode();

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
import { LazyMotion } from "framer-motion";
import "./index.css"

import AppErrorBoundary from "./components/AppErrorBoundary";
import { initializeTelemetry } from "./telemetry";
import AppSplashScreen from "./components/common/AppSplashScreen";
import { UsageLimitProvider } from "./hooks/useUsageLimits";

initializeTelemetry();

// framer animation features load after first paint; startup chrome uses m.*
const loadMotionFeatures = () => import("./app/motionFeatures").then((mod) => mod.default);

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <AppErrorBoundary>
    <LazyMotion features={loadMotionFeatures}>
      <Provider store={store}>
        <PersistGate loading={<AppSplashScreen message="Hi, I am Maya." />} persistor={persistor}>
          <UsageLimitProvider>
            <App />
          </UsageLimitProvider>
        </PersistGate>
      </Provider>
    </LazyMotion>
  </AppErrorBoundary>
);
