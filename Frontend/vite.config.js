import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import svgr from 'vite-plugin-svgr';
import path from 'path';
import removeConsole from 'vite-plugin-remove-console';
import dotenv from 'dotenv';
import { configDefaults } from 'vitest/config';

dotenv.config();

export default defineConfig({
  plugins: [
    svgr({
      enforce: 'pre',
      svgrOptions: {
        // Add any additional SVGR options here
      },
    }),
    //removeConsole({
    //  exclude: ['error', 'warn', 'log'], // Keep critical logs
    //}),
    react(),
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/tests/setupTests.ts',
    coverage: {
      reporter: ['text', 'json', 'html'], // Code coverage reports
      exclude: ['node_modules/', 'src/tests/', 'src/__mocks__/'],
    },
    exclude: [...configDefaults.exclude, '**/e2e/**'],
  },
  root: '.',
  server: {
    port: 3000,
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: 'index.html',
    },
  },
  resolve: {
    alias: {
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
    },
  },
});
