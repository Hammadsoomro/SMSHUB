/**
 * Socket.io setup for real-time messaging
 * This will handle real-time SMS notifications and updates
 */
import { Server as HTTPServer } from "http";
import { Server as IOServer, Socket } from "socket.io";
import { verifyToken, extractTokenFromHeader } from "./jwt";
import { storage } from "./storage";

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userRole?: "admin" | "team_member";
}

export function setupSocketIO(httpServer: HTTPServer): IOServer {
  const io = new IOServer(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
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
    console.log(`User ${socket.userId} connected`);

    // Join user-specific room
    socket.join(`user:${socket.userId}`);

    if (socket.userRole === "admin") {
      socket.join(`admin:${socket.userId}`);
    }

    // Handle new incoming SMS
    socket.on("incoming_sms", (data: any) => {
      const { phoneNumberId, from, body } = data;

      // Emit to team member assigned to this number
      const phoneNumber = storage.getPhoneNumberById(phoneNumberId);
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
      io.to(`admin:${phoneNumber?.adminId}`).emit("incoming_sms_notification", {
        phoneNumberId,
        from,
        preview: body.substring(0, 50),
      });
    });

    // Handle message sent
    socket.on("message_sent", (data: any) => {
      const { phoneNumberId, to, body } = data;

      // Update all connected clients for this user
      io.to(`user:${socket.userId}`).emit("message_updated", {
        phoneNumberId,
        to,
        body,
        direction: "outbound",
        timestamp: new Date().toISOString(),
      });
    });

    // Handle disconnect
    socket.on("disconnect", () => {
      console.log(`User ${socket.userId} disconnected`);
    });
  });

  return io;
}

// Export a function to emit messages from the API layer
export function emitNewMessage(
  io: IOServer,
  userId: string,
  data: any
): void {
  io.to(`user:${userId}`).emit("new_message", data);
}

export function emitIncomingSMS(
  io: IOServer,
  adminId: string,
  data: any
): void {
  io.to(`admin:${adminId}`).emit("incoming_sms_notification", data);
}
