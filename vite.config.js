import { defineConfig } from 'vite';

// base './' faz o build funcionar em qualquer subpasta (ex.: GitHub Pages)
export default defineConfig({
  base: './',
  server: { open: true },
  build: { chunkSizeWarningLimit: 1000 },
});
