import "dotenv/config";
import express, { Express } from "express";
import cors from "cors";
import { connectDB } from "./db";
import { Server as IOServer } from "socket.io";
import { createPerformanceMiddleware } from "./utils/serverless";

// Auth routes
import {
  handleSignup,
  handleLogin,
  handleGetProfile,
  handleUpdateProfile,
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
  handleGetInsights,
  handleDeleteAccount,
} from "./routes/admin";

// Phone purchase routes
import {
  handleGetAvailableNumbers,
  handlePurchaseNumber,
  handleGetTwilioBalance,
  handleAddPhoneNumber,
  handleSyncPhoneNumbers,
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
import { validateTwilioSignature } from "./middleware/twilio-signature";
import { handleDemo } from "./routes/demo";

// Storage and utilities
import { storage } from "./storage";
import { TwilioClient } from "./twilio";
import ablyServer from "./ably";

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

  // Normalize all existing phone numbers to E.164 format (one-time migration)
  await storage.normalizeAllPhoneNumbers();

  // Initialize Ably for real-time messaging
  try {
    await ablyServer.initialize();
    console.log("✅ Ably initialized for real-time messaging");
  } catch (error) {
    console.warn(
      "⚠️  Ably initialization failed (optional for fallback):",
      error,
    );
    // Continue - Ably is optional, app will still work without it
  }

  const app = express() as Express;

  // Middleware
  app.use(cors());

  // ✅ For Twilio webhooks, capture raw body BEFORE parsing
  app.use(
    "/api/webhooks",
    express.raw({ type: "application/x-www-form-urlencoded", limit: "50mb" }),
  );

  // ✅ Parse JSON and URL-encoded bodies for regular requests
  app.use(
    express.json({
      limit: "50mb",
      strict: false,
    }),
  );
  app.use(
    express.urlencoded({
      extended: true,
      limit: "50mb",
    }),
  );

  // ✅ Middleware to convert raw body to string if needed (for webhook validation)
  app.use("/api/webhooks", (req, res, next) => {
    if (Buffer.isBuffer((req as any).body)) {
      (req as any).rawBody = (req as any).body.toString("utf-8");
      try {
        // Try to parse as form data
        const params = new URLSearchParams((req as any).rawBody);
        (req as any).body = Object.fromEntries(params);
      } catch (e) {
        console.error("[Webhook Parser] Failed to parse webhook body:", e);
        (req as any).body = {};
      }
    }
    next();
  });

  // Performance monitoring (for serverless optimization)
  app.use(createPerformanceMiddleware());

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

  // Webhook routes (public - for Twilio callbacks)
  // Note: Health check doesn't need signature validation
  app.get("/api/webhooks/inbound-sms", handleWebhookHealth);
  // Inbound SMS endpoint requires Twilio signature validation
  app.post(
    "/api/webhooks/inbound-sms",
    validateTwilioSignature,
    handleInboundSMS,
  );

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
  app.get("/api/admin/insights", authMiddleware, adminOnly, handleGetInsights);
  app.delete(
    "/api/admin/delete-account",
    authMiddleware,
    adminOnly,
    handleDeleteAccount,
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

  // Twilio balance route (requires authentication)
  app.get(
    "/api/admin/twilio-balance",
    authMiddleware,
    adminOnly,
    handleGetTwilioBalance,
  );

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
  app.post(
    "/api/admin/add-phone-number",
    authMiddleware,
    adminOnly,
    handleAddPhoneNumber,
  );
  app.post(
    "/api/admin/sync-phone-numbers",
    authMiddleware,
    adminOnly,
    handleSyncPhoneNumbers,
  );

  // Debug endpoint for Twilio credentials (dev only)
  app.get(
    "/api/admin/twilio-debug",
    authMiddleware,
    adminOnly,
    async (req, res) => {
      try {
        const adminId = req.userId!;
        const credentials =
          await storage.getTwilioCredentialsByAdminId(adminId);

        if (!credentials) {
          return res.json({
            hasCredentials: false,
            message: "No Twilio credentials found",
            steps: [
              "1. Go to Admin Settings",
              "2. Connect your Twilio credentials",
              "3. Verify Account SID and Auth Token are correct",
            ],
          });
        }

        console.log("🔍 Debug: Testing Twilio connection...");
        console.log(
          `Account SID: ${credentials.accountSid.substring(0, 6)}...`,
        );

        // Test if credentials are valid by making a test API call
        const twilioClient = new TwilioClient(
          credentials.accountSid,
          credentials.authToken,
        );

        try {
          const balance = await twilioClient.getAccountBalance();
          console.log("✅ Balance fetched successfully:", balance);

          return res.json({
            hasCredentials: true,
            accountSid: credentials.accountSid.substring(0, 6) + "...",
            balance: balance,
            connectedAt: credentials.connectedAt,
            status: "SUCCESS",
          });
        } catch (balanceError) {
          console.error("❌ Balance fetch failed:", balanceError);

          // Return detailed error information
          return res.json({
            hasCredentials: true,
            accountSid: credentials.accountSid.substring(0, 6) + "...",
            balance: null,
            connectedAt: credentials.connectedAt,
            status: "BALANCE_FETCH_FAILED",
            error:
              balanceError instanceof Error
                ? balanceError.message
                : "Unknown error",
            troubleshooting: [
              "1. Verify credentials are correct in Admin Settings",
              "2. Check Account SID starts with 'AC' and has 34 chars",
              "3. Check Auth Token is at least 32 characters",
              "4. Verify your Twilio account is active (not suspended)",
              "5. Try reconnecting credentials",
              "6. Check if your Twilio account type supports balance queries",
            ],
          });
        }
      } catch (error) {
        console.error("Debug endpoint error:", error);
        res.status(500).json({
          error: error instanceof Error ? error.message : "Unknown error",
          hasCredentials: "unknown",
        });
      }
    },
  );

  return app;
}

// Export Ably server instance for use in routes and webhooks
export { default as ablyServer } from "./ably";
