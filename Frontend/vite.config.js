/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import svgr from 'vite-plugin-svgr';
import path from "node:path";
import removeConsole from 'vite-plugin-remove-console';
import dotenv from 'dotenv';
import { configDefaults } from 'vitest/config';
import { fileURLToPath } from 'node:url';
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
const dirname = typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.dirname(fileURLToPath(import.meta.url));
// More info at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon
dotenv.config();
export default defineConfig({
  plugins: [svgr({
    enforce: 'pre',
    svgrOptions: {
      // Add any additional SVGR options here
    }
  }),
  //removeConsole({
  //  exclude: ['error', 'warn', 'log'], // Keep critical logs
  //}),
  react()],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./src/tests/setupTests.ts",
    coverage: {
      reporter: ["text", "json", "html"],
      exclude: ["node_modules/", "src/tests/", "src/__mocks__/"],
    },
    exclude: [...configDefaults.exclude, "**/e2e/**"],

    projects: [
      // ✅ UNIT TESTS (React Testing Library)
      {
        extends: true,
        test: {
          name: "unit",
          include: ["src/**/*.{test,spec}.{ts,tsx}"],
          environment: "jsdom",
          setupFiles: "./src/tests/setupTests.ts",
        },
      },

      // ✅ STORYBOOK TESTS (browser/playwright)
      {
        extends: true,
        plugins: [
          storybookTest({
            configDir: path.join(dirname, ".storybook"),
          }),
        ],
        test: {
          name: "storybook",
          include: ["src/**/*.stories.@(ts|tsx|js|jsx|mdx)"],
          browser: {
            enabled: true,
            headless: true,
            provider: "playwright",
            instances: [{ browser: "chromium" }],
          },
          setupFiles: [".storybook/vitest.setup.ts"],
        },
      },
    ],
  },
  root: '.',
  server: {
    host: true,
    port: 5173,
    watch: {
      usePolling: true
    }
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: 'index.html'
    }
  },
  resolve: {
    dedupe: ["react", "react-dom"],
    alias: {
      // ✅ force ONE react instance (fixes Radix hooks crash)
      react: path.resolve(rootDir, "node_modules/react"),
      "react-dom": path.resolve(rootDir, "node_modules/react-dom"),
      "react-dom/client": path.resolve(rootDir, "node_modules/react-dom/client"),

      // your existing aliases
      "@": path.resolve(rootDir, "src"),
      "@utils": path.resolve(rootDir, "./src/utils"),
      "@pages": path.resolve(rootDir, "./src/Pages"),
      "@components": path.resolve(rootDir, "./src/components"),
      "@assets": path.resolve(rootDir, "./src/assets"),
      "@hooks": path.resolve(rootDir, "./src/hooks"),
      "@api": path.resolve(rootDir, "./src/api"),
      "@types": path.resolve(rootDir, "./src/types"),
      "@mocks": path.resolve(rootDir, "./src/__mocks__"),
      "@context": path.resolve(rootDir, "./src/context"),
      "@routes": path.resolve(rootDir, "./src/routes"),
      "@styles": path.resolve(rootDir, "./src/styles"),
      "@schemas": path.resolve(rootDir, "./src/schemas"),
      "@stores": path.resolve(rootDir, "./src/stores"),
      "@translations": path.resolve(rootDir, "./src/translations"),
    },
  },
});