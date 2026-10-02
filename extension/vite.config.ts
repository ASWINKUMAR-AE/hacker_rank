import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: resolve(__dirname, '../dist/extension'),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'popup.html'),
        content: resolve(__dirname, 'src/content/contentScript.tsx')
      },
      output: {
        entryFileNames: (chunkInfo) => {
          if (chunkInfo.name === 'content') return 'content.js';
          return '[name].js';
        },
        assetFileNames: (assetInfo) => {
          if (assetInfo.name?.endsWith('.css')) return 'content.css';
          return '[name].[ext]';
        }
      }
    }
  }
});
