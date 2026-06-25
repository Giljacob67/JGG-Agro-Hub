import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

const port = Number(process.env.PORT) || 3012;

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
    },
  },
  server: {
    port,
    host: "0.0.0.0",
  },
  preview: {
    port,
    host: "0.0.0.0",
  },
  build: {
    // Sourcemaps "hidden": gerados para upload a ferramentas de erro (ex.:
    // Sentry) sem referência no bundle servido ao cliente.
    sourcemap: "hidden",
    rollupOptions: {
      output: {
        // Rolldown (Vite 8) exige função. Isola vendors pesados em chunks
        // próprios para cache de longo prazo e melhor paralelismo de download.
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          if (id.includes("react-dom") || /[\\/]react[\\/]/.test(id))
            return "react-vendor";
          if (id.includes("@tanstack")) return "query";
          if (id.includes("framer-motion")) return "motion";
          // xlsx é pesado e usado só no import de leads.
          if (id.includes("xlsx")) return "xlsx";
          return undefined;
        },
      },
    },
  },
});