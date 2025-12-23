import { io, Socket } from "socket.io-client";

class SocketService {
  private socket: Socket | null = null;

  connect(token: string): Socket | null {
    if (this.socket?.connected) {
      return this.socket;
    }

    try {
      this.socket = io({
        auth: {
          authorization: `Bearer ${token}`,
        },
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5,
      });

      return this.socket;
    } catch (error) {
      console.error("Error creating socket connection:", error);
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
