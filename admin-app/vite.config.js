import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { fileURLToPath, URL } from "node:url";

// Replace the local development admin module with an inert stub in production
// builds. This keeps the hard-coded credentials out of the shipped bundle.
function stripDevAdmin() {
  return {
    name: "strip-dev-admin",
    apply: "build",
    enforce: "pre",
    transform(_code, id) {
      if (!id.includes("/src/services/devAdmin.js")) return null;
      return [
        "export const DEV_ADMIN_ENABLED = false;",
        'export const DEV_ADMIN_EMAIL = "";',
        'export const DEV_ADMIN_PASSWORD = "";',
        "export const devAdminUser = null;",
        "export const devAdminProfile = null;",
        "export function isDevAdminSession() { return false; }",
        "export function startDevAdminSession() { return false; }",
        "export function endDevAdminSession() {}",
        "export function isDevAdminCredentials() { return false; }",
        "export function getDevAdminSession() { return null; }",
      ].join("\n");
    },
  };
}

export default defineConfig({
  plugins: [vue(), stripDevAdmin()],
  define: { __INTLIFY_JIT_COMPILATION__: true },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    port: 3001,
    host: "127.0.0.1",
  },
  build: {
    outDir: "dist",
    sourcemap: false,
  },
});
