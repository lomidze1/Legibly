import { defineConfig } from 'vite';

// Sandbox bundle: single IIFE file, no DOM, no code-splitting.
export default defineConfig({
  build: {
    target: 'es2017',
    outDir: 'dist',
    emptyOutDir: false,
    minify: false,
    lib: {
      entry: 'src/main/index.ts',
      formats: ['iife'],
      name: 'legibly',
      fileName: () => 'main.js',
    },
  },
});
