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
