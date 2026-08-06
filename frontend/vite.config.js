import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    target: "es2020",
    cssCodeSplit: true,
    sourcemap: false,
    minify: "esbuild",
    rollupOptions: {
      output: {
        // Granular manual chunks — each is only loaded when its route is visited
        manualChunks: (id) => {
          // Core React runtime — tiny, always needed
          if (id.includes("node_modules/react/") ||
              id.includes("node_modules/react-dom/") ||
              id.includes("node_modules/react-router") ||
              id.includes("node_modules/scheduler/")) {
            return "react-core";
          }
          // Heavy charting library — only loaded on analytics/reports pages
          if (id.includes("node_modules/recharts") ||
              id.includes("node_modules/d3") ||
              id.includes("node_modules/victory") ||
              id.includes("node_modules/chart.js") ||
              id.includes("node_modules/react-chartjs-2")) {
            return "charts";
          }
          // Animation library
          if (id.includes("node_modules/framer-motion")) {
            return "framer-motion";
          }
          // Radix UI primitives
          if (id.includes("node_modules/@radix-ui")) {
            return "radix-ui";
          }
          // Icons — large library, isolated chunk
          if (id.includes("node_modules/lucide-react") ||
              id.includes("node_modules/react-icons")) {
            return "icons";
          }
          // Firebase — loaded lazily via dynamic import, keep isolated
          if (id.includes("node_modules/firebase")) {
            return "firebase";
          }
          // Notifications toast
          if (id.includes("node_modules/sonner")) {
            return "sonner";
          }
          // Tanstack query
          if (id.includes("node_modules/@tanstack")) {
            return "tanstack";
          }
          // Axios + other small utilities
          if (id.includes("node_modules/axios") ||
              id.includes("node_modules/clsx") ||
              id.includes("node_modules/tailwind-merge") ||
              id.includes("node_modules/class-variance-authority")) {
            return "utils";
          }
        },
      },
    },
    chunkSizeWarningLimit: 800,
  },
  server: {
    host: "0.0.0.0",
    port: 5173,
    hmr: {
      host: "localhost",
    },
  },
});
