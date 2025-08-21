import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    target: ['es2022', 'chrome89', 'firefox89', 'safari15'],
    rollupOptions: {
      output: {
        manualChunks: {
          pdfjs: ['pdfjs-dist']
        }
      }
    }
  },
  optimizeDeps: {
    include: ['pdfjs-dist/build/pdf.min.js'],
    exclude: ['pdfjs-dist/build/pdf.worker.js'],
    force: true
  },
  assetsInclude: ['**/*.worker.js'],
  define: {
    global: 'globalThis',
  },
}));
