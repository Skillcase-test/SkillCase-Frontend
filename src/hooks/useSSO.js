import { useEffect, useState, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { loginSuccess } from "../redux/auth/authSlice";
import api from "../api/axios";

import { Capacitor } from "@capacitor/core";
import { App as CapApp } from "@capacitor/app";

const PHP_API = "https://skillcase.in";
const MAIN_SITE_LOGIN = "https://skillcase.in/login";

export function useSSO() {
  const [checking, setChecking] = useState(true);
  const { isAuthenticated } = useSelector((state) => state.auth);
  const dispatch = useDispatch();

  const isAuthenticatedRef = useRef(isAuthenticated);
  useEffect(() => {
    isAuthenticatedRef.current = isAuthenticated;
  }, [isAuthenticated]);

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      // Listen for deep link with token
      CapApp.addListener("appUrlOpen", (data) => {
        const url = new URL(data.url);
        const token = url.searchParams.get("token");
        const userStr = url.searchParams.get("user");

        if (token && userStr) {
          const user = JSON.parse(decodeURIComponent(userStr));
          dispatch(loginSuccess({ token, user }));
        }
      });
    }
  }, [dispatch]);

  // Re-check auth when app becomes active (user returns from browser)
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      const checkOnResume = CapApp.addListener("appStateChange", (state) => {
        if (state.isActive && !isAuthenticated) {
          // Race condition
          // Small delay to let deep link token be processed first
          setTimeout(() => {
            if (!isAuthenticatedRef.current) {
              window.location.href = `${MAIN_SITE_LOGIN}?redirect=${getRedirectUrl()}`;
            }
          }, 1000);
        }
      });

      return () => {
        checkOnResume.remove();
      };
    }
  }, [isAuthenticated]);

  const getRedirectUrl = () => {
    if (Capacitor.isNativePlatform()) {
      // Mobile app → redirect to fallback page that triggers deep link
      return encodeURIComponent("https://learner.skillcase.in/open-app");
    }
    // Web → redirect back to current page
    return encodeURIComponent(window.location.href);
  };

  useEffect(() => {
    const checkSSO = async () => {
      // Skip SSO check for Nursing Landing page
      if (window.location.pathname === "/register") {
        setChecking(false);
        return;
      }

      if (Capacitor.isNativePlatform()) {
        if (!isAuthenticated) {
          // Redirect to login
          window.location.href = `${MAIN_SITE_LOGIN}?redirect=${getRedirectUrl()}`;
        }
        setChecking(false);
        return;
      }

      // if (window.location.hostname === "localhost") {
      //   if (isAuthenticated) {
      //     // Add this check
      //     setChecking(false);
      //     return;
      //   }

      //   // For local testing: Create a test user session
      //   const testUser = {
      //     phone: "1234567890",
      //     name: "Test User",
      //     email: "test@test.com",
      //   };

      //   try {
      //     const backendRes = await api.post("/sso/create-token", testUser);
      //     if (backendRes.data.success) {
      //       dispatch(
      //         loginSuccess({
      //           token: backendRes.data.token,
      //           user: backendRes.data.user,
      //         })
      //       );
      //     }
      //   } catch (err) {
      //     console.log("Local test login failed:", err);
      //   }
      //   setChecking(false);
      //   return;
      // }

      if (isAuthenticated) {
        setChecking(false);
        return;
      }
      try {
        const phpRes = await fetch(`${PHP_API}/api/validate-session`, {
          credentials: "include",
        });

        // If not authenticated, redirect to main site login
        if (!phpRes.ok) {
          const returnUrl = getRedirectUrl();
          window.location.href = `${MAIN_SITE_LOGIN}?redirect=${returnUrl}`;
          return;
        }
        const phpData = await phpRes.json();
        if (!phpData.success) {
          const returnUrl = getRedirectUrl();
          window.location.href = `${MAIN_SITE_LOGIN}?redirect=${returnUrl}`;
          return;
        }

        // Step 2: Send user data to our backend to get JWT
        const backendRes = await api.post("/sso/create-token", {
          phone: phpData.user.phone,
          name: phpData.user.name,
          email: phpData.user.email,
        });
        if (backendRes.data.success) {
          dispatch(
            loginSuccess({
              token: backendRes.data.token,
              user: backendRes.data.user,
            })
          );
        }
      } catch (err) {
        console.log("SSO check failed:", err);
        // On error, also redirect to login
        const returnUrl = getRedirectUrl();
        window.location.href = `${MAIN_SITE_LOGIN}?redirect=${returnUrl}`;
      } finally {
        setChecking(false);
      }
    };
    checkSSO();
  }, [isAuthenticated, dispatch]);
  return { checking };
}
