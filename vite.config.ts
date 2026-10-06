import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// `vite build --mode offline` produces one self-contained HTML file
// that runs from disk (file://) without a server or internet.
export default defineConfig(({ mode }) => ({
  base: './',
  plugins: mode === 'offline' ? [viteSingleFile()] : [],
  build: {
    outDir: mode === 'offline' ? 'dist-offline' : 'dist',
    chunkSizeWarningLimit: 2000,
  },
}));
