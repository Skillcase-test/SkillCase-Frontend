import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Capacitor } from "@capacitor/core";

const PLAY_STORE_WEB_URL =
  "https://play.google.com/store/apps/details?id=com.skillcase.app";

function sanitizeRoute(rawRoute) {
  if (!rawRoute || typeof rawRoute !== "string") {
    return "/";
  }
  const trimmed = rawRoute.trim();
  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("//")
  ) {
    return "/";
  }
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

export default function DeepLinkRedirect() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const rawRoute =
      params.get("route") ||
      params.get("to") ||
      params.get("target") ||
      params.get("path") ||
      "/";

    const targetRoute = sanitizeRoute(rawRoute);

    // If already inside the native Capacitor app, route internally
    if (Capacitor.isNativePlatform()) {
      navigate(targetRoute, { replace: true });
      return;
    }

    const userAgent =
      navigator.userAgent || navigator.vendor || window.opera || "";
    const isAndroid = /android/i.test(userAgent);

    if (isAndroid) {
      const fallbackUrl = encodeURIComponent(PLAY_STORE_WEB_URL);
      const intentUrl = `intent://app${targetRoute}#Intent;scheme=skillcase;package=com.skillcase.app;S.browser_fallback_url=${fallbackUrl};end`;

      // Redirect via Android Intent
      window.location.replace(intentUrl);
    } else {
      // Desktop or iOS -> forward directly to target route on web app
      navigate(targetRoute, { replace: true });
    }
  }, [location.search, navigate]);

  return null;
}
