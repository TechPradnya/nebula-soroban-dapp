import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    global: 'globalThis',
  },
  server: {
    port: 5173,
  },
  build: {
    rollupOptions: {
      output: {
        // Each of these is large and independently cacheable — a user who
        // never opens the Wallet page shouldn't have to download the
        // Stellar wallet kit, and a chart-library update shouldn't bust
        // the cache for the routing/animation vendor chunk.
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-motion': ['framer-motion'],
          'vendor-charts': ['recharts'],
          'vendor-stellar': ['@stellar/stellar-sdk', '@creit.tech/stellar-wallets-kit'],
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './tests/setup.js',
  },
});