import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';

// Library mode: everything (Preact included) is bundled into ONE self-contained
// IIFE file, so the host page only ever loads dist/widget.js and nothing else.
export default defineConfig({
  plugins: [preact()],
  build: {
    lib: {
      entry: 'src/index.tsx',
      name: 'ChatWidget',
      formats: ['iife'],
      fileName: () => 'widget.js',
    },
    // No separate CSS file - styles live in src/styles.ts and are injected
    // into the shadow root at runtime.
    cssCodeSplit: false,
    rollupOptions: {
      output: { entryFileNames: 'widget.js' },
    },
    // Keep the bundle readable while developing; flip to true for production.
    minify: true,
    target: 'es2019',
  },
});
