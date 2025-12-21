/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import svgr from 'vite-plugin-svgr';
import path from 'path';
import removeConsole from 'vite-plugin-remove-console';
import dotenv from 'dotenv';
import { configDefaults } from 'vitest/config';
import { fileURLToPath } from 'node:url';
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
const dirname = typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url));

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
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@utils': path.resolve(__dirname, './src/utils'),
      '@pages': path.resolve(__dirname, './src/Pages'),
      '@components': path.resolve(__dirname, './src/components'),
      '@assets': path.resolve(__dirname, './src/assets'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@api': path.resolve(__dirname, './src/api'),
      '@types': path.resolve(__dirname, './src/types'),
      '@mocks': path.resolve(__dirname, './src/__mocks__'),
      '@context': path.resolve(__dirname, './src/context'),
      '@routes': path.resolve(__dirname, './src/routes'),
      '@styles': path.resolve(__dirname, './src/styles'),
      '@schemas': path.resolve(__dirname, './src/schemas'),
      '@stores': path.resolve(__dirname, './src/stores'),
      '@translations': path.resolve(__dirname, './src/translations')
    }
  }
});