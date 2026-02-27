import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  plugins: [vue()],
  base: "/Lilliana-Tracker/", // <--- OJO: Debe coincidir exactamente con el nombre del repo
});
