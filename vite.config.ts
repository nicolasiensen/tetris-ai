import { defineConfig } from 'vite';

export default defineConfig({
  base: '/tetris-ai/',
  server: {
    allowedHosts: ['.ngrok-free.app'],
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
});
