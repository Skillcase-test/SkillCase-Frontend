import { useCallback } from "react";
import { useNavigate } from "react-router-dom";

// navigate(-1) does nothing (or exits the app on Android) when the page was
// opened cold from a deep link or push. React Router tracks its own history
// index in history.state.idx — 0 means there is nothing in-app to go back to.
export function canGoBackInApp() {
  return (window.history.state?.idx ?? 0) > 0;
}

export function useGoBack(fallback = "/") {
  const navigate = useNavigate();
  return useCallback(() => {
    if (canGoBackInApp()) navigate(-1);
    else navigate(fallback, { replace: true });
  }, [navigate, fallback]);
}
