import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

export function initializeSocket(): Socket {
  if (socket?.connected) {
    return socket;
  }

  const token = localStorage.getItem("token");

  socket = io({
    auth: {
      authorization: `Bearer ${token}`,
    },
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 5,
  });

  socket.on("connect", () => {});

  socket.on("disconnect", () => {});

  socket.on("connect_error", () => {});

  return socket;
}

export function getSocket(): Socket | null {
  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function onNewMessage(callback: (data: any) => void): () => void {
  const sock = initializeSocket();
  sock.on("new_message", callback);
  return () => sock.off("new_message", callback);
}

export function onIncomingSMS(callback: (data: any) => void): () => void {
  const sock = initializeSocket();
  sock.on("incoming_sms_notification", callback);
  return () => sock.off("incoming_sms_notification", callback);
}

export function emitMessageSent(data: any): void {
  const sock = initializeSocket();
  sock.emit("message_sent", data);
}

export function emitIncomingSMS(data: any): void {
  const sock = initializeSocket();
  sock.emit("incoming_sms", data);
}
