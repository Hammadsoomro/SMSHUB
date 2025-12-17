import path from "path";
import { createServer } from "http";
import {
  createServer as createExpressServer,
  setSocketIOInstance,
} from "./index";
import { setupSocketIO } from "./socket";
import * as express from "express";

async function startServer() {
  try {
    const app = await createExpressServer();
    const httpServer = createServer(app);
    const io = setupSocketIO(httpServer);
    setSocketIOInstance(io);

    const port = process.env.PORT || 3000;

    // In production, serve the built SPA files
    const __dirname = import.meta.dirname;
    const distPath = path.join(__dirname, "../spa");

    // Serve static files
    app.use(express.static(distPath));

    // Handle React Router - serve index.html for all non-API routes
    app.get("*", (req, res) => {
      // Don't serve index.html for API routes
      if (req.path.startsWith("/api/") || req.path.startsWith("/health")) {
        return res.status(404).json({ error: "API endpoint not found" });
      }

      res.sendFile(path.join(distPath, "index.html"));
    });

    httpServer.listen(port, () => {
      console.log(`🚀 SMSHub server running on port ${port}`);
      console.log(`📱 Frontend: http://localhost:${port}`);
      console.log(`🔧 API: http://localhost:${port}/api`);
      console.log(`⚡ WebSocket: ws://localhost:${port}`);
    });

    // Graceful shutdown
    process.on("SIGTERM", () => {
      console.log("🛑 Received SIGTERM, shutting down gracefully");
      httpServer.close(() => {
        process.exit(0);
      });
    });

    process.on("SIGINT", () => {
      console.log("🛑 Received SIGINT, shutting down gracefully");
      httpServer.close(() => {
        process.exit(0);
      });
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

startServer();
