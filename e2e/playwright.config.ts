import { defineConfig, devices } from "@playwright/test";

/**
 * The suite always runs against an already-deployed stack (never a dev server),
 * so BASE_URL points at the frontend container: nginx serves the built React app
 * and proxies /api to the backend, which talks to Postgres. Every assertion below
 * therefore exercises the full deployment, not a mock.
 */
const baseURL = process.env.BASE_URL ?? "http://localhost:3001";

export default defineConfig({
  testDir: "./tests",
  timeout: 30_000,
  expect: { timeout: 10_000 },

  // One worker against one shared database keeps the run deterministic.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,

  reporter: [
    ["list"],
    ["junit", { outputFile: "test-results/e2e-test-results.xml" }],
    ["html", { outputFolder: "test-results/html-report", open: "never" }],
  ],
  outputDir: "test-results/artifacts",

  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },

  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
