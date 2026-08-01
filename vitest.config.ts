import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@tender-baron/game-domain": new URL(
        "./packages/game-domain/src/index.ts",
        import.meta.url
      ).pathname,
      "@tender-baron/game-content": new URL(
        "./packages/game-content/src/index.ts",
        import.meta.url
      ).pathname
    }
  },
  test: {
    environment: "node",
    include: ["packages/game-testing/tests/**/*.test.ts"],
    pool: "forks",
    coverage: {
      provider: "v8",
      include: [
        "packages/game-domain/src/**/*.ts",
        "packages/game-content/src/**/*.ts"
      ],
      exclude: ["**/index.ts"],
      reporter: ["text", "json-summary"],
      thresholds: {
        lines: 85,
        functions: 95,
        statements: 85,
        branches: 74
      }
    }
  }
});
