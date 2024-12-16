import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import svgr from 'vite-plugin-svgr';
import path from 'path';
import removeConsole from 'vite-plugin-remove-console';

export default defineConfig({
  plugins: [
    svgr({
      enforce: 'pre',
      svgrOptions: {
        // Add any additional SVGR options here
      },
    }),
	removeConsole({
      // Keep critical logs like warnings and errors
      exclude: ['error', 'warn'],
    }),

    react(),
  ],
  test: {
    globals: true, // Enable global test functions like `describe` and `it`
    environment: 'jsdom', // Use a browser-like environment for React testing
    setupFiles: './src/tests/setupTests.ts', // Load test setup file
  },
  root: '.', // Ensure the root is the directory containing index.html
  server: {
    port: 3000, // Development server port
  },
  build: {
    outDir: 'dist', // Output directory for the build
    rollupOptions: {
      input: 'index.html', // Ensure the entry point is set to index.html
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
    },
  },
});
