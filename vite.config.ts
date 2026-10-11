import { defineConfig } from 'vite';

export default defineConfig({
  // GitHub Pages currently publishes the main branch root directly. Keep source
  // files intact while generating a static site beneath /docs.
  base: './',
  build: {
    outDir: 'docs',
    rollupOptions: { input: 'site.html' },
  },
  server: { host: '0.0.0.0' },
});
