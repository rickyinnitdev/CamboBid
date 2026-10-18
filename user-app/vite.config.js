import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  plugins: [vue()],
  define: { __INTLIFY_JIT_COMPILATION__: true },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    port: 3000,
    host: "127.0.0.1",
  },
  build: {
    outDir: "dist",
    sourcemap: false,
  },
});
