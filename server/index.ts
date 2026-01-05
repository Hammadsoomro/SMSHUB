import "dotenv/config";
import express, { Express } from "express";
import cors from "cors";
import { connectDB } from "./db";
import { initializeAbly } from "./ably";

// Auth routes
import {
  handleSignup,
  handleLogin,
  handleGetProfile,
  handleUpdateProfile,
  handleAblyToken,
} from "./routes/auth";

// Admin routes
import {
  handleSaveCredentials,
  handleGetCredentials,
  handleRemoveCredentials,
  handleGetNumbers,
  handleSetActiveNumber,
  handleGetTeamMembers,
  handleInviteTeamMember,
  handleRemoveTeamMember,
  handleAddExistingNumber,
  handleAssignNumber,
  handleUpdateNumberSettings,
  handleGetDashboardStats,
} from "./routes/admin";

// Wallet routes
import {
  handleGetWallet,
  handleAddFunds,
  handleGetTransactions,
} from "./routes/wallet";

// Phone purchase routes
import {
  handleGetAvailableNumbers,
  handlePurchaseNumber,
  handleGetTwilioBalance,
} from "./routes/phone-purchase";

// Messages routes
import {
  handleGetContacts,
  handleGetConversation,
  handleSendMessage,
  handleGetAssignedPhoneNumber,
  handleMarkAsRead,
  handleAddContact,
  handleUpdateContact,
  handleDeleteContact,
} from "./routes/messages";

// Webhooks
import { handleInboundSMS, handleWebhookHealth } from "./routes/webhooks";

// Middleware
import { authMiddleware, adminOnly, teamMemberOnly } from "./middleware/auth";
import { handleDemo } from "./routes/demo";

// Global socket.io instance for webhook access
let globalIO: IOServer | null = null;

export function setSocketIOInstance(io: IOServer) {
  globalIO = io;
}

export function getSocketIOInstance(): IOServer | null {
  return globalIO;
}

export async function createServer() {
  // Connect to MongoDB BEFORE creating the app
  await connectDB();

  const app = express() as Express;

  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Public API routes
  app.get("/api/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.json({ message: ping });
  });

  app.get("/api/demo", handleDemo);

  // Auth routes (public)
  app.post("/api/auth/signup", handleSignup);
  app.post("/api/auth/login", handleLogin);
  app.get("/api/auth/profile", authMiddleware, handleGetProfile);
  app.patch("/api/auth/update-profile", authMiddleware, handleUpdateProfile);
  app.get("/api/auth/ably-token", authMiddleware, handleAblyToken);

  // Webhook routes (public - for Twilio callbacks)
  app.get("/api/webhooks/inbound-sms", handleWebhookHealth); // Health check
  app.post("/api/webhooks/inbound-sms", handleInboundSMS);

  // Admin routes (requires admin role)
  app.post(
    "/api/admin/credentials",
    authMiddleware,
    adminOnly,
    handleSaveCredentials,
  );
  app.get(
    "/api/admin/credentials",
    authMiddleware,
    adminOnly,
    handleGetCredentials,
  );
  app.delete(
    "/api/admin/credentials",
    authMiddleware,
    adminOnly,
    handleRemoveCredentials,
  );
  app.get("/api/admin/numbers", authMiddleware, adminOnly, handleGetNumbers);
  app.post(
    "/api/admin/numbers/set-active",
    authMiddleware,
    adminOnly,
    handleSetActiveNumber,
  );
  app.post(
    "/api/admin/add-existing-number",
    authMiddleware,
    adminOnly,
    handleAddExistingNumber,
  );
  app.post(
    "/api/admin/assign-number",
    authMiddleware,
    adminOnly,
    handleAssignNumber,
  );
  app.patch(
    "/api/admin/number-settings",
    authMiddleware,
    adminOnly,
    handleUpdateNumberSettings,
  );
  app.get("/api/admin/team", authMiddleware, adminOnly, handleGetTeamMembers);
  app.post(
    "/api/admin/team/invite",
    authMiddleware,
    adminOnly,
    handleInviteTeamMember,
  );
  app.delete(
    "/api/admin/team/:memberId",
    authMiddleware,
    adminOnly,
    handleRemoveTeamMember,
  );
  app.get(
    "/api/admin/dashboard/stats",
    authMiddleware,
    adminOnly,
    handleGetDashboardStats,
  );

  // Messages routes (requires authentication)
  app.get("/api/messages/contacts", authMiddleware, handleGetContacts);
  app.get(
    "/api/messages/conversation/:contactId",
    authMiddleware,
    handleGetConversation,
  );
  app.post("/api/messages/send", authMiddleware, handleSendMessage);
  app.post(
    "/api/messages/mark-read/:contactId",
    authMiddleware,
    handleMarkAsRead,
  );
  app.post("/api/contacts", authMiddleware, handleAddContact);
  app.patch("/api/contacts/:contactId", authMiddleware, handleUpdateContact);
  app.delete("/api/contacts/:contactId", authMiddleware, handleDeleteContact);
  app.get(
    "/api/messages/assigned-phone-number",
    authMiddleware,
    handleGetAssignedPhoneNumber,
  );

  // Wallet routes (requires authentication)
  app.get("/api/wallet", authMiddleware, handleGetWallet);
  app.post("/api/wallet/add-funds", authMiddleware, handleAddFunds);
  app.get("/api/wallet/transactions", authMiddleware, handleGetTransactions);
  app.get("/api/wallet/twilio-balance", authMiddleware, handleGetTwilioBalance);

  // Phone purchase routes (requires authentication)
  app.get(
    "/api/admin/available-numbers",
    authMiddleware,
    adminOnly,
    handleGetAvailableNumbers,
  );
  app.post(
    "/api/admin/purchase-number",
    authMiddleware,
    adminOnly,
    handlePurchaseNumber,
  );
  app.get(
    "/api/admin/twilio-balance",
    authMiddleware,
    adminOnly,
    handleGetTwilioBalance,
  );

  return app;
}
