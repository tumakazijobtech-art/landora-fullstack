import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:4000',
      // Live chat's realtime transport — proxied alongside /api so `npm run dev`
      // needs no extra configuration to talk to the Socket.io server in
      // backend/server.js.
      '/socket.io': { target: 'http://localhost:4000', ws: true },
    },
  },
  build: {
    // Split rarely-changing vendor code (React, the router) into its own chunk, apart
    // from app code, so a deploy that only touches app code doesn't force browsers to
    // re-download React too — repeat visits after an update stay mostly cache hits.
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
        },
      },
    },
    // Silence the default 500kb warning for the vendor chunk — React itself accounts
    // for most of it and splitting further wouldn't reduce actual bytes shipped.
    chunkSizeWarningLimit: 600,
  },
});
