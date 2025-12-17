import "dotenv/config";
import express from "express";
import cors from "cors";
import { connectDB } from "./db";

// Auth routes
import { handleSignup, handleLogin } from "./routes/auth";

// Admin routes
import {
  handleSaveCredentials,
  handleGetCredentials,
  handleRemoveCredentials,
  handleGetNumbers,
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
} from "./routes/phone-purchase";

// Messages routes
import {
  handleGetContacts,
  handleGetConversation,
  handleSendMessage,
  handleGetAssignedPhoneNumber,
} from "./routes/messages";

// Webhooks
import { handleInboundSMS, handleWebhookHealth } from "./routes/webhooks";

// Middleware
import { authMiddleware, adminOnly, teamMemberOnly } from "./middleware/auth";
import { handleDemo } from "./routes/demo";

export async function createServer() {
  // Connect to MongoDB BEFORE creating the app
  await connectDB();

  const app = express();

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
  app.get(
    "/api/messages/assigned-phone-number",
    authMiddleware,
    handleGetAssignedPhoneNumber,
  );

  // Wallet routes (requires authentication)
  app.get("/api/wallet", authMiddleware, handleGetWallet);
  app.post("/api/wallet/add-funds", authMiddleware, handleAddFunds);
  app.get("/api/wallet/transactions", authMiddleware, handleGetTransactions);

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

  return app;
}
