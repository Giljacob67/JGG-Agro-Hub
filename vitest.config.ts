import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@shared": path.resolve(__dirname, "shared"),
    },
  },
  test: {
    // Node por padrão; testes de componente declaram jsdom via docblock
    // `// @vitest-environment jsdom` no topo do arquivo.
    environment: "node",
    setupFiles: ["src/test/setup.ts"],
    include: [
      "shared/**/*.test.ts",
      "src/**/*.test.ts",
      "src/**/*.test.tsx",
      "api/**/*.test.ts",
    ],
  },
});