import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

// UI iframe bundle: everything inlined into a single dist/ui.html.
export default defineConfig({
  plugins: [react(), viteSingleFile()],
  root: 'src/ui',
  build: {
    target: 'es2019',
    outDir: resolve(process.cwd(), 'dist'),
    emptyOutDir: false,
    minify: true,
    rollupOptions: {
      input: resolve(process.cwd(), 'src/ui/ui.html'),
    },
  },
});
