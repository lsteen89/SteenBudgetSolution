import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["html"], ["list"]],

  use: {
    baseURL: "http://localhost:5173",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },

  webServer: {
    command: "npm run dev -- --host localhost --port 5173",
    url: "http://localhost:5173",
    reuseExistingServer: false,
    timeout: 120_000,
  },

  projects: [
    {
      name: "smoke",
      grep: /@smoke/,
      retries: 0,
      use: {
        ...devices["Desktop Chrome"],
      },
    },
    {
      name: "full",
      grepInvert: /@smoke/,
      retries: 1,
      use: {
        ...devices["Desktop Chrome"],
      },
    },
  ],
});
