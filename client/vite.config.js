import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true, // bind all interfaces (IPv4 + IPv6), not just the ::1 default
    proxy: {
      "/api": "http://localhost:4000",
    },
  },
});
