import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [["babel-plugin-react-compiler"]],
      },
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          "react-vendor": ["react", "react-dom"],
          "posthog-vendor": ["posthog-js", "@posthog/react"],
          "router-vendor": ["@tanstack/react-router"],
        },
      },
    },
  },
  base: "./", // use relative paths for Electron
});
