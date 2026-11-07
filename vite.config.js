import { defineConfig } from 'vite';

export default defineConfig({
  // Relative assets keep the build portable (GitHub Pages, Obsidian, any host).
  base: './',
  server: {
    host: '127.0.0.1',
    port: 4173,
  },
  build: {
    outDir: 'dist',
    assetsInlineLimit: 0,
  },
});
