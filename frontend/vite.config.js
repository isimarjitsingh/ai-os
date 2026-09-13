import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    {
      name: "webcontainer-cross-origin-isolation",

      configureServer(server) {
        server.middlewares.use((_req, res, next) => {
          res.setHeader(
            "Cross-Origin-Opener-Policy",
            "same-origin"
          );

          res.setHeader(
            "Cross-Origin-Embedder-Policy",
            "require-corp"
          );

          res.setHeader(
            "Cross-Origin-Resource-Policy",
            "cross-origin"
          );

          next();
        });
      },
    },
  ],

  server: {
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "require-corp",
      "Cross-Origin-Resource-Policy": "cross-origin",
    },
  },
});