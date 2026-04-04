import { defineConfig } from 'vite';

export default defineConfig({
  root: 'src',
  base: process.env.GITHUB_ACTIONS ? '/realm-wave/' : '/',
  build: {
    outDir: '../dist',
  },
  server: {
    port: 5173,
  },
});
