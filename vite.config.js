import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import svgr from '@svgr/rollup'
import { sentryVitePlugin } from "@sentry/vite-plugin";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const shouldUploadSourcemaps =
    mode === "production" &&
    !!env.SENTRY_AUTH_TOKEN &&
    !!env.SENTRY_ORG &&
    !!env.SENTRY_PROJECT;

  return {
    plugins: [
      react(),
      tailwindcss(),
      svgr({
        exportType: "default",
        jsxRuntime: "automatic",
      }),
      ...(shouldUploadSourcemaps
        ? [
            sentryVitePlugin({
              org: env.SENTRY_ORG,
              project: env.SENTRY_PROJECT,
              authToken: env.SENTRY_AUTH_TOKEN,
              telemetry: false,
            }),
          ]
        : []),
    ],
  build: {
    sourcemap: mode === "production",
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (
            id.includes("react-router") ||
            id.includes("@reduxjs/toolkit") ||
            id.includes("react-redux")
          ) {
            return "router-redux";
          }
          if (
            id.includes("chart.js") ||
            id.includes("chartjs-adapter-moment") ||
            id.includes("moment")
          ) {
            return "charts";
          }
          if (id.includes("@sentry") || id.includes("posthog")) {
            return "sentry-posthog";
          }
          if (id.includes("@capacitor") || id.includes("@capawesome")) {
            return "capacitor";
          }
          if (id.includes("@mui") || id.includes("@emotion")) {
            return "mui";
          }
        },
      },
    },
  },
  // server: {
  //   allowedHosts: true,
  //   proxy: {
  //     "/api": {
  //       target: "http://localhost:3000",
  //       changeOrigin: true,
  //       headers: {
  //         "ngrok-skip-browser-warning": "true",
  //       },
  //     },
  //   },
  // },
  };
})
