import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  canIdlePrefetch,
  likelyNextRoutes,
  prefetchPath,
  warmRoutes,
} from "./prefetch";

const idle = (fn) =>
  window.requestIdleCallback
    ? window.requestIdleCallback(fn, { timeout: 3000 })
    : setTimeout(fn, 600);

export default function RoutePrefetcher() {
  const { pathname } = useLocation();
  const { token, user } = useSelector((state) => state.auth);
  const level = user?.user_prof_level;

  // A link starts loading its screen on touch, ~100ms before the click lands
  useEffect(() => {
    const onPointerDown = (e) => {
      const link = e.target?.closest?.("a[href]");
      if (link && link.origin === window.location.origin) prefetchPath(link.pathname);
    };
    document.addEventListener("pointerdown", onPointerDown, { capture: true, passive: true });
    return () => document.removeEventListener("pointerdown", onPointerDown, { capture: true });
  }, []);

  // Once a screen settles, warm the ones it leads to, one per idle slot
  useEffect(() => {
    if (!token || !canIdlePrefetch()) return undefined;
    const queue = likelyNextRoutes(pathname, level).slice(0, 8);
    if (!queue.length) return undefined;
    let cancelled = false;
    const next = () =>
      idle(() => {
        const route = queue.shift();
        if (cancelled || !route) return;
        if (document.visibilityState === "visible") warmRoutes([route]);
        next();
      });
    const timer = setTimeout(next, 1200);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [pathname, token, level]);

  return null;
}
