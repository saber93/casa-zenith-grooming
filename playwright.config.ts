import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: ".",
  timeout: 90_000,
  expect: {
    timeout: 10_000,
  },
  fullyParallel: false,
  workers: 1,
  reporter: "line",
  use: {
    baseURL: "http://127.0.0.1:8080",
    trace: "retain-on-failure",
  },
  webServer: process.env.PLAYWRIGHT_SKIP_WEB_SERVER
    ? undefined
    : {
        command:
          "mkdir -p .tmp/playwright-home .tmp/playwright-config && HOME=.tmp/playwright-home XDG_CONFIG_HOME=.tmp/playwright-config npm run dev -- --host 127.0.0.1",
        url: "http://127.0.0.1:8080",
        reuseExistingServer: true,
        timeout: 120_000,
      },
});
