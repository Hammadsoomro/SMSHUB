import { defineConfig, Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { createServer } from "./server";
import { Server as IOServer } from "socket.io";
import { verifyToken, extractTokenFromHeader } from "./server/jwt";
import { storage } from "./server/storage";
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
  let io: IOServer | null = null;

  return {
    name: "express-plugin",
    apply: "serve", // Only apply during development (serve mode)
    async configureServer(server) {
      app = await createServer();

      // Initialize Socket.IO on Vite's HTTP server
      io = new IOServer(server.httpServer!, {
        cors: {
          origin: "*",
          methods: ["GET", "POST"],
        },
      });

      // Middleware for authentication
      io.use((socket: any, next) => {
        try {
          const token = extractTokenFromHeader(
            socket.handshake.auth.authorization,
          );

          if (!token) {
            return next(new Error("Missing authorization token"));
          }

          const payload = verifyToken(token);
          if (!payload) {
            return next(new Error("Invalid token"));
          }

          socket.userId = payload.userId;
          socket.userRole = payload.role;
          next();
        } catch (error) {
          next(new Error("Authentication failed"));
        }
      });

      // Connection handlers
      io.on("connection", (socket: any) => {
        // Join user-specific room
        socket.join(`user:${socket.userId}`);

        if (socket.userRole === "admin") {
          socket.join(`admin:${socket.userId}`);
        }

        // Handle new incoming SMS
        socket.on("incoming_sms", async (data: any) => {
          const { phoneNumberId, from, body } = data;

          try {
            // Emit to team member assigned to this number
            const phoneNumber = await storage.getPhoneNumberById(phoneNumberId);
            if (phoneNumber?.assignedTo) {
              io!.to(`user:${phoneNumber.assignedTo}`).emit("new_message", {
                phoneNumberId,
                from,
                body,
                direction: "inbound",
                timestamp: new Date().toISOString(),
              });
            }

            // Emit to admin
            io!
              .to(`admin:${phoneNumber?.adminId}`)
              .emit("incoming_sms_notification", {
                phoneNumberId,
                from,
                preview: body.substring(0, 50),
              });
          } catch (error) {
            console.error("Error handling incoming SMS:", error);
          }
        });

        // Handle message sent
        socket.on("message_sent", async (data: any) => {
          const { phoneNumberId, to, body } = data;

          try {
            // Update all connected clients for this user
            io!.to(`user:${socket.userId}`).emit("message_updated", {
              phoneNumberId,
              to,
              body,
              direction: "outbound",
              timestamp: new Date().toISOString(),
            });
          } catch (error) {
            console.error("Error handling message sent:", error);
          }
        });

        // Handle disconnect
        socket.on("disconnect", () => {});
      });

      setSocketIOInstance(io);

      // Add Express app as middleware to Vite dev server
      server.middlewares.use(app);
    },
  };
}
