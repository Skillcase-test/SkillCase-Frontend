import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import svgr from '@svgr/rollup'

// Opens the API connection while the app's JS is still parsing
function apiPreconnectPlugin(backendUrl) {
  return {
    name: "api-preconnect",
    transformIndexHtml() {
      let origin;
      try {
        origin = new URL(backendUrl).origin;
      } catch {
        return [];
      }
      return [{ tag: "link", attrs: { rel: "preconnect", href: origin, crossorigin: "" }, injectTo: "head" }];
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const buildId = String(
    env.VITE_APP_BUILD ||
    process.env.VERCEL_GIT_COMMIT_SHA ||
    process.env.GITHUB_SHA ||
    process.env.CODEBUILD_RESOLVED_SOURCE_VERSION ||
    new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14)
  ).slice(0, 40);

  return {
    define: {
      "import.meta.env.VITE_BUILD_ID": JSON.stringify(buildId),
    },
    plugins: [
      react(),
      tailwindcss(),
      svgr({
        exportType: "default",
        jsxRuntime: "automatic",
      }),
      apiPreconnectPlugin(env.VITE_BACKEND_URL),
    ],
  build: {
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
