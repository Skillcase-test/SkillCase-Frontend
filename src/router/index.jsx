import { createBrowserRouter } from "react-router-dom";
import AppLayout from "../app/AppLayout";
import AppSplashScreen from "../components/common/AppSplashScreen";
import RouteErrorBoundary from "./RouteErrorBoundary";
import { appRoutes } from "./routes";
import { canAnimateRoutes, setAppRouter, setNavMotion } from "./navigation";

// Registered before the router's own popstate listener so the slide direction
// is set before React Router starts the reverse transition.
if (canAnimateRoutes) window.addEventListener("popstate", () => setNavMotion("back"));

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

// Native-style slides app-wide without touching every navigate()/<Link>:
// pushes slide forward, Back reverses (React Router replays it on POP),
// replaces (redirects, tab switches) stay instant.
if (canAnimateRoutes) {
  const baseNavigate = router.navigate;
  router.navigate = (to, opts) => {
    if (typeof to === "number") {
      setNavMotion(to < 0 ? "back" : "forward");
      return baseNavigate(to, opts);
    }
    // Replaces only animate when the caller opts in (the top switcher does)
    if (opts?.replace) return baseNavigate(to, opts);
    setNavMotion("forward");
    return baseNavigate(to, { viewTransition: true, ...opts });
  };
}

setAppRouter(router);
