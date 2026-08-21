import { useEffect, useState, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Capacitor } from "@capacitor/core";

const PLAY_STORE_MARKET_URL = "market://details?id=com.skillcase.app";
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
    trimmed.startsWith("//") ||
    trimmed.startsWith("javascript:") ||
    trimmed.startsWith("data:")
  ) {
    return "/";
  }
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

export default function DeepLinkRedirect() {
  const location = useLocation();
  const navigate = useNavigate();
  const [targetRoute, setTargetRoute] = useState("/");

  const triggerAppOrStore = useCallback((route) => {
    const clean = sanitizeRoute(route);
    const schemeUrl = `skillcase://app${clean}`;

    const launchTime = Date.now();

    // 1. Attempt to open native app via custom scheme
    window.location.href = schemeUrl;

    // 2. If app is not installed, browser stays visible; fallback to Play Store app
    const timer1 = setTimeout(() => {
      // If user switched away to app, elapsed time is large or document is hidden
      if (document.hidden || Date.now() - launchTime > 3000) {
        return;
      }
      window.location.href = PLAY_STORE_MARKET_URL;

      // 3. Secondary fallback to web store in case market:// is unhandled
      const timer2 = setTimeout(() => {
        if (document.hidden) return;
        window.location.href = PLAY_STORE_WEB_URL;
      }, 1200);

      return () => clearTimeout(timer2);
    }, 1500);

    return () => clearTimeout(timer1);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const rawRoute =
      params.get("route") ||
      params.get("to") ||
      params.get("target") ||
      params.get("path") ||
      "/";

    const cleanRoute = sanitizeRoute(rawRoute);
    setTargetRoute(cleanRoute);

    // If already inside the native Capacitor container, route internally
    if (Capacitor.isNativePlatform()) {
      navigate(cleanRoute, { replace: true });
      return;
    }

    const userAgent =
      navigator.userAgent || navigator.vendor || window.opera || "";
    const isAndroid = /android/i.test(userAgent);

    if (isAndroid) {
      triggerAppOrStore(cleanRoute);
    } else {
      // Desktop or iOS -> stay on web and navigate directly to requested screen
      navigate(cleanRoute, { replace: true });
    }
  }, [location.search, navigate, triggerAppOrStore]);

  return (
    <div className="min-h-screen bg-[#001836] text-white flex flex-col items-center justify-center p-6 text-center select-none">
      <div className="size-12 border-4 border-[#F9C53D] border-t-transparent rounded-full animate-spin mb-6" />
      <h1 className="text-xl font-bold mb-2">Opening Skillcase...</h1>
      <p className="text-sm text-slate-400 max-w-xs mb-8">
        Redirecting you to the app. If nothing happens, tap the button below:
      </p>
      <button
        type="button"
        onClick={() => triggerAppOrStore(targetRoute)}
        className="bg-[#F9C53D] hover:bg-[#e0b02f] text-[#002856] font-extrabold py-3.5 px-8 rounded-2xl text-sm shadow-xl active:scale-95 transition-all duration-150 cursor-pointer"
      >
        Open in App / Play Store
      </button>
    </div>
  );
}
