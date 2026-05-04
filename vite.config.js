import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import svgr from '@svgr/rollup'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    svgr({
      exportType: "default",
      jsxRuntime: "automatic",
    }),
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
})
