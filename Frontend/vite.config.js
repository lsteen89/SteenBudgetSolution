import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import svgr from 'vite-plugin-svgr';

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
});
