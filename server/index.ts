import "dotenv/config";
import express from "express";
import cors from "cors";

// Auth routes
import { handleSignup, handleLogin } from "./routes/auth";

// Admin routes
import {
  handleSaveCredentials,
  handleGetCredentials,
  handleGetNumbers,
  handleGetTeamMembers,
  handleInviteTeamMember,
  handleRemoveTeamMember,
} from "./routes/admin";

// Messages routes
import {
  handleGetContacts,
  handleGetConversation,
  handleSendMessage,
} from "./routes/messages";

// Middleware
import { authMiddleware, adminOnly, teamMemberOnly } from "./middleware/auth";
import { handleDemo } from "./routes/demo";

export function createServer() {
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

  // Admin routes (requires admin role)
  app.post("/api/admin/credentials", authMiddleware, adminOnly, handleSaveCredentials);
  app.get("/api/admin/credentials", authMiddleware, adminOnly, handleGetCredentials);
  app.get("/api/admin/numbers", authMiddleware, adminOnly, handleGetNumbers);
  app.get("/api/admin/team", authMiddleware, adminOnly, handleGetTeamMembers);
  app.post("/api/admin/team/invite", authMiddleware, adminOnly, handleInviteTeamMember);
  app.delete("/api/admin/team/:memberId", authMiddleware, adminOnly, handleRemoveTeamMember);

  // Messages routes (requires authentication)
  app.get("/api/messages/contacts", authMiddleware, handleGetContacts);
  app.get("/api/messages/conversation/:contactId", authMiddleware, handleGetConversation);
  app.post("/api/messages/send", authMiddleware, handleSendMessage);

  return app;
}
