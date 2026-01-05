/**
 * Socket.io setup for real-time messaging
 * This will handle real-time SMS notifications and updates
 */
import { Server as HTTPServer } from "http";
import { Server as IOServer, Socket } from "socket.io";
import { verifyToken, extractTokenFromHeader } from "./jwt";
import { storage } from "./storage";

/**
 * Get allowed origins based on environment
 */
function getAllowedOrigins(): string | string[] {
  const env = process.env.NODE_ENV || "development";
  const productionDomain = process.env.PRODUCTION_DOMAIN;
  const deployPreviewUrl = process.env.DEPLOY_PREVIEW_URL;

  // In development, allow localhost variations
  if (env === "development") {
    return [
      "http://localhost:3000",
      "http://localhost:8080",
      "http://127.0.0.1:3000",
      "http://127.0.0.1:8080",
      "http://[::1]:3000",
      "http://[::1]:8080",
    ];
  }

  // In production, allow the deployment domain
  const origins = [];

  // Add production domain if configured
  if (productionDomain) {
    origins.push(`https://${productionDomain}`);
    origins.push(`http://${productionDomain}`); // For internal requests
  }

  // Add Fly.io domain patterns
  origins.push(/\.fly\.dev$/);

  // Add Netlify domain patterns
  origins.push(/\.netlify\.app$/);

  // Add deploy preview URL if available (for Netlify previews)
  if (deployPreviewUrl) {
    origins.push(deployPreviewUrl);
  }

  // Fallback to all origins if none specified (not recommended for production)
  if (origins.length === 0) {
    console.warn(
      "[Socket.io] No production domain configured, allowing all origins",
    );
    return "*";
  }

  return origins;
}

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userRole?: "admin" | "team_member";
}

export function setupSocketIO(httpServer: HTTPServer): IOServer {
  // Configure CORS based on environment
  const allowedOrigins = getAllowedOrigins();

  const io = new IOServer(httpServer, {
    cors: {
      origin: allowedOrigins,
      methods: ["GET", "POST"],
      credentials: true,
    },
    // Transport configuration for better compatibility
    transports: ["websocket", "polling"],
    // Increase max size for large messages
    maxHttpBufferSize: 10 * 1024 * 1024, // 10 MB
    // Keep-alive settings
    pingInterval: 25000,
    pingTimeout: 10000,
  });

  // Middleware for authentication
  io.use((socket: AuthenticatedSocket, next) => {
    try {
      const token = extractTokenFromHeader(socket.handshake.auth.authorization);

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
  io.on("connection", (socket: AuthenticatedSocket) => {
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
          io.to(`user:${phoneNumber.assignedTo}`).emit("new_message", {
            phoneNumberId,
            from,
            body,
            direction: "inbound",
            timestamp: new Date().toISOString(),
          });
        }

        // Emit to admin
        io.to(`admin:${phoneNumber?.adminId}`).emit(
          "incoming_sms_notification",
          {
            phoneNumberId,
            from,
            preview: body.substring(0, 50),
          },
        );
      } catch (error) {
        console.error("Error handling incoming SMS:", error);
      }
    });

    // Handle message sent
    socket.on("message_sent", async (data: any) => {
      const { phoneNumberId, to, body } = data;

      try {
        // Update all connected clients for this user
        io.to(`user:${socket.userId}`).emit("message_updated", {
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

  return io;
}

// Export a function to emit messages from the API layer
export function emitNewMessage(io: IOServer, userId: string, data: any): void {
  io.to(`user:${userId}`).emit("new_message", data);
}

export function emitIncomingSMS(
  io: IOServer,
  adminId: string,
  data: any,
): void {
  io.to(`admin:${adminId}`).emit("incoming_sms_notification", data);
}
