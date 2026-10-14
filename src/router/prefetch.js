import { matchRoutes } from "react-router-dom";
import { Capacitor } from "@capacitor/core";

// Warms route chunks before the user needs them. Code only — data still loads
// on the screen itself, so nothing here can show stale content.
let flatRoutes = [];
const warmed = new WeakSet();

// Screens whose next step isn't simply "<path>/:id"
const EXTRA_NEXT = {
  "/video-courses/:courseId": ["/video-course/:videoId"],
};

function flatten(routes, out = []) {
  routes.forEach((route) => {
    if (route.path) out.push(route);
    if (route.children) flatten(route.children, out);
  });
  return out;
}

export function setPrefetchRoutes(routes) {
  flatRoutes = flatten(routes);
}

function warm(route) {
  if (typeof route?.lazy !== "function" || warmed.has(route.lazy)) return;
  warmed.add(route.lazy);
  route.lazy().catch(() => warmed.delete(route.lazy));
}

export function prefetchPath(pathname) {
  if (!pathname || !flatRoutes.length) return;
  (matchRoutes(flatRoutes, pathname) || []).forEach(({ route }) => warm(route));
}

const depth = (path) => path.split("/").filter(Boolean).length;

// Routes one step below the current screen: its detail pages, or the level's
// practice screens when on the home hub.
export function likelyNextRoutes(pathname, level) {
  if (!flatRoutes.length) return [];
  if (pathname === "/") {
    const prefix = `/${String(level || "a1").toLowerCase()}/`;
    return flatRoutes.filter(
      (r) => r.path.startsWith(prefix) && depth(r.path) === 2 && !r.path.includes(":"),
    );
  }
  const current = matchRoutes(flatRoutes, pathname)?.at(-1)?.route?.path;
  if (!current) return [];
  const extra = EXTRA_NEXT[current] || [];
  return flatRoutes.filter(
    (r) =>
      extra.includes(r.path) ||
      (r.path.startsWith(`${current}/:`) && depth(r.path) === depth(current) + 1),
  );
}

// Slow or metered connections only get tap-time prefetch. The app ships its
// chunks inside the APK, so there it is always worth it.
export function canIdlePrefetch() {
  if (Capacitor.isNativePlatform()) return true;
  const conn = typeof navigator !== "undefined" ? navigator.connection : null;
  if (!conn) return true;
  return !conn.saveData && !/(^|-)2g$/.test(conn.effectiveType || "");
}

export function warmRoutes(routes) {
  routes.forEach(warm);
}
