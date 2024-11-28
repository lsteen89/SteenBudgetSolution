import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import svgr from 'vite-plugin-svgr';
import path from 'path';

export default defineConfig({
  plugins: [
    svgr({
      enforce: 'pre',
      svgrOptions: {
        // Add any additional SVGR options here
      },
    }),
    react(),
  ],
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
    },
  },
});
