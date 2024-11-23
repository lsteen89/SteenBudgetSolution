import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import svgr from 'vite-plugin-svgr';

export default defineConfig({
  plugins: [
	svgr({
	  enforce: 'pre',
	  svgrOptions: {
		// options
	  },
	}),
    react(),
  ],
  server: {
    port: 3000,
  },
});