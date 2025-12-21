import { defineConfig, Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { createServer } from "./server";
import { createServer as createHttpServer } from "http";
import { setupSocketIO } from "./server/socket";
import { setSocketIOInstance } from "./server/index";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    fs: {
      allow: ["./client", "./shared"],
      deny: [".env", ".env.*", "*.{crt,pem}", "**/.git/**", "server/**"],
    },
  },
  build: {
    outDir: "dist/spa",
  },
  plugins: [react(), expressPlugin()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./client"),
      "@shared": path.resolve(__dirname, "./shared"),
    },
  },
}));

function expressPlugin(): Plugin {
  let app: any;
  let httpServer: any;

  return {
    name: "express-plugin",
    apply: "serve", // Only apply during development (serve mode)
    async configureServer(server) {
      app = await createServer();

      // Create HTTP server for Socket.IO
      httpServer = createHttpServer(app);
      const io = setupSocketIO(httpServer);
      setSocketIOInstance(io);

      // Add Express app as middleware to Vite dev server
      server.middlewares.use(app);
    },
  };
}
