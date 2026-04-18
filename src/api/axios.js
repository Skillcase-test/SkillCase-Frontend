import axios from "axios";
import { store } from "../redux/store";
import * as Sentry from "@sentry/react";

const api = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_URL,
});

api.interceptors.request.use((config) => {
  const token = store.getState().auth.token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const isTermsAcceptanceRequired =
      error?.response?.status === 403 &&
      error?.response?.data?.code === "TERMS_ACCEPTANCE_REQUIRED";

    if (isTermsAcceptanceRequired) {
      if (typeof window !== "undefined") {
        const isTermsRoute = window.location.pathname === "/terms-required";
        if (!isTermsRoute) {
          const currentPath =
            `${window.location.pathname}${window.location.search}${window.location.hash}` ||
            "/";
          const redirectQuery = encodeURIComponent(currentPath);
          window.location.assign(`/terms-required?from=${redirectQuery}`);
        }
      }
      // This is an expected control-flow response; redirect handles it.
      return new Promise(() => {});
    }

    Sentry.captureException(error);
    return Promise.reject(error);
  },
);

export default api;
