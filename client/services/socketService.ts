import { io, Socket } from "socket.io-client";
import { API_BASE_URL } from "@/config/api";

class SocketService {
  private socket: Socket | null = null;
  private isConnecting = false;

  connect(token: string): Socket | null {
    // Return existing socket if already connected or connecting
    if (this.socket) {
      console.log(
        "[SocketService] Socket already exists, reusing. Connected:",
        this.socket.connected,
      );
      return this.socket;
    }

    if (this.isConnecting) {
      console.log(
        "[SocketService] Connection in progress, returning existing socket...",
        { socketExists: !!this.socket },
      );
      // Even though connection is in progress, we should still have the socket instance
      return this.socket;
    }

    try {
      this.isConnecting = true;
      console.log(
        "[SocketService] Creating new socket connection to:",
        API_BASE_URL,
      );

      this.socket = io(API_BASE_URL, {
        auth: {
          authorization: `Bearer ${token}`,
        },
        path: "/socket.io/",
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 5,
        transports: ["websocket", "polling"],
        secure: window.location.protocol === "https:",
        rejectUnauthorized: false,
      });

      console.log("[SocketService] Socket instance created:", {
        id: this.socket?.id,
        connected: this.socket?.connected,
      });

      // Attach base listeners that will always be there
      this.socket.on("connect", () => {
        console.log("[SocketService] Socket connected successfully");
        this.isConnecting = false;
      });

      this.socket.on("disconnect", () => {
        console.log("[SocketService] Socket disconnected");
      });

      this.socket.on("connect_error", (error: any) => {
        console.error("[SocketService] Connection error:", error);
        this.isConnecting = false;
      });

      return this.socket;
    } catch (error) {
      console.error("[SocketService] Error creating socket connection:", {
        error,
        message: error instanceof Error ? error.message : String(error),
      });
      this.isConnecting = false;
      this.socket = null;
      return null;
    }
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  on(event: string, callback: (...args: any[]) => void): void {
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  off(event: string, callback?: (...args: any[]) => void): void {
    if (this.socket) {
      this.socket.off(event, callback);
    }
  }

  emit(event: string, data?: any): void {
    if (this.socket) {
      this.socket.emit(event, data);
    }
  }

  joinPhoneNumber(phoneNumber: string): void {
    if (this.socket) {
      this.socket.emit("join_phone_number", { phoneNumber });
    }
  }

  leavePhoneNumber(phoneNumber: string): void {
    if (this.socket) {
      this.socket.emit("leave_phone_number", { phoneNumber });
    }
  }

  get connected(): boolean {
    return this.socket?.connected || false;
  }

  getSocket(): Socket | null {
    return this.socket;
  }
}

export default new SocketService();
