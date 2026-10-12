// Lets non-React code (push taps, native listeners) navigate in-app without
// importing the router itself, which would be a circular import.
let appRouter = null;

export function setAppRouter(router) {
  appRouter = router;
}

export function appNavigate(to, options) {
  if (!appRouter) return false;
  appRouter.navigate(to, options);
  return true;
}

export const canAnimateRoutes =
  typeof document !== "undefined" &&
  typeof document.startViewTransition === "function" &&
  !window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

// Read by the view-transition CSS in index.css. kind "stack" = push/back,
// "tab" = switching hubs (chrome stays put, only content slides).
export function setNavMotion(direction, kind = "stack") {
  const { dataset } = document.documentElement;
  dataset.navDirection = direction;
  dataset.navKind = kind;
}

// Set while the top switcher's hub navigation is in flight, so screens that
// redirect on mode changes (LandingPage) don't interrupt it and kill the slide.
let hubSwitchPending = false;

export function runHubSwitch(navigation) {
  hubSwitchPending = true;
  return Promise.resolve(navigation).finally(() => {
    hubSwitchPending = false;
  });
}

export const isHubSwitchPending = () => hubSwitchPending;
