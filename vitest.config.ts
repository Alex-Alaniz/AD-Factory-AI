import { defineConfig } from "vitest/config";
import path from "path";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    include: ["**/*.test.ts", "**/*.test.tsx"],
    exclude: ["node_modules", "dist", ".cache"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: [
        "node_modules/**",
        "dist/**",
        ".cache/**",
        "**/*.test.ts",
        "**/*.test.tsx",
        "**/__tests__/**",
        "script/**",
        "*.config.*",
        "drizzle.config.ts",
      ],
      include: ["server/**", "shared/**", "client/src/**"],
    },
    testTimeout: 30000,
    hookTimeout: 30000,
    // Use jsdom for .tsx tests, node for .ts tests
    environmentMatchGlobs: [
      ["client/**/*.test.tsx", "jsdom"],
      ["server/**/*.test.ts", "node"],
      ["shared/**/*.test.ts", "node"],
    ],
    // Default to node environment
    environment: "node",
    // Setup file is environment-safe
    setupFiles: ["./client/src/__tests__/setup.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "client", "src"),
      "@shared": path.resolve(__dirname, "shared"),
    },
  },
});
