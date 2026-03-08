import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

// https://vitejs.dev/config/
// vite.config.js
export default defineConfig({
  plugins: [vue()],
  base: "./", // <--- CAMBIA ESTO A PUNTO-SLASH
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
