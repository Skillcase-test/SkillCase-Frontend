import { createBrowserRouter } from "react-router-dom";
import AppLayout from "../app/AppLayout";
import AppSplashScreen from "../components/common/AppSplashScreen";
import RouteErrorBoundary from "./RouteErrorBoundary";
import { appRoutes } from "./routes";
import { setAppRouter } from "./navigation";

// Created before redux-persist rehydrates, so no loaders — guards live in AppLayout.
export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    // Cold start on a lazy screen (e.g. a deep link) waits for its chunk here
    hydrateFallbackElement: <AppSplashScreen message="Hi, I am Maya." />,
    children: [
      {
        // Pathless so a failed screen keeps the app chrome around it
        errorElement: <RouteErrorBoundary />,
        children: appRoutes,
      },
    ],
  },
]);

setAppRouter(router);
