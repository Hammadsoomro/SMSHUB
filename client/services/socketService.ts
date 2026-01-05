import { io, Socket } from "socket.io-client";

class SocketService {
  private socket: Socket | null = null;
  private isConnecting = false;
  private connectionTimeout: NodeJS.Timeout | null = null;
  private isProduction = false;
  private socketUrl: string | undefined;

  constructor() {
    // Detect if we're in production
    this.isProduction =
      typeof window !== "undefined" &&
      window.location.hostname !== "localhost" &&
      window.location.hostname !== "127.0.0.1" &&
      !window.location.hostname.startsWith("192.168") &&
      !window.location.hostname.startsWith("[::1]");

    // Determine socket URL based on environment
    this.socketUrl = this.getSocketUrl();
  }

  /**
   * Get the correct socket.io server URL based on environment
   */
  private getSocketUrl(): string | undefined {
    if (typeof window === "undefined") {
      return undefined;
    }

    const { protocol, hostname, port } = window.location;

    // In development, connect to local dev server
    if (!this.isProduction) {
      return `${protocol}//${hostname}:${port}`;
    }

    // In production, connect to same origin (works for Fly.io, etc)
    // Socket.io will use the same protocol and domain as the app
    return undefined; // Let socket.io use current domain
  }

  connect(token: string): Socket | null {
    // Return existing socket if already connected or connecting
    if (this.socket) {
      console.log("[SocketService] Socket already exists, reusing...");
      return this.socket;
    }

    if (this.isConnecting) {
      console.log(
        "[SocketService] Connection already in progress, waiting for socket...",
      );
      return null;
    }

    try {
      this.isConnecting = true;
      console.log(`[SocketService] Creating new socket connection...`, {
        production: this.isProduction,
        url: this.socketUrl || "same-origin",
        domain: window.location.hostname,
      });

      const socketOptions: any = {
        auth: {
          authorization: `Bearer ${token}`,
        },
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 10,
        transports: ["websocket", "polling"],
        // Don't force polling in production - let websocket try first
        path: "/socket.io",
      };

      // Only set URL if explicitly needed (dev environments)
      if (this.socketUrl) {
        socketOptions.url = this.socketUrl;
      }

      this.socket = io(socketOptions);

      // Set a longer connection timeout for slow networks
      this.connectionTimeout = setTimeout(() => {
        if (this.isConnecting && this.socket && !this.socket.connected) {
          console.warn(
            "[SocketService] Connection taking longer than expected, continuing to retry...",
          );
          // Don't disconnect, let it keep trying
          this.isConnecting = false;
        }
      }, 10000);

      // Attach base listeners that will always be there
      this.socket.on("connect", () => {
        console.log(
          "[SocketService] ✅ Socket connected successfully - real-time messaging enabled",
        );
        this.isConnecting = false;
        if (this.connectionTimeout) {
          clearTimeout(this.connectionTimeout);
        }
      });

      this.socket.on("disconnect", () => {
        console.log(
          "[SocketService] ❌ Socket disconnected - attempting to reconnect...",
        );
        this.isConnecting = false;
      });

      this.socket.on("connect_error", (error: any) => {
        console.error(
          "[SocketService] Connection error:",
          error?.message || error,
        );
        this.isConnecting = false;
      });

      return this.socket;
    } catch (error) {
      console.error("[SocketService] Error creating socket connection:", error);
      this.isConnecting = false;
      return null;
    }
  }

  disconnect(): void {
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
    }
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
