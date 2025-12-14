import { RequestHandler } from "express";
import crypto from "crypto";
import { storage } from "../storage";
import { generateToken } from "../jwt";
import {
  TwilioCredentialsRequest,
  TwilioCredentials,
  PhoneNumber,
  TeamMember,
  User,
} from "@shared/api";

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

// Twilio Credentials
export const handleSaveCredentials: RequestHandler = (req, res) => {
  try {
    const adminId = req.userId!;
    const { accountSid, authToken } = req.body as TwilioCredentialsRequest;

    if (!accountSid || !authToken) {
      return res.status(400).json({ error: "Missing credentials" });
    }

    const credentialsId = storage.generateId();
    const credentials: TwilioCredentials = {
      id: credentialsId,
      adminId,
      accountSid,
      authToken,
      connectedAt: new Date().toISOString(),
    };

    storage.setTwilioCredentials(credentials);
    res.json({ credentials });
  } catch (error) {
    console.error("Save credentials error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const handleGetCredentials: RequestHandler = (req, res) => {
  try {
    const adminId = req.userId!;
    const credentials = storage.getTwilioCredentialsByAdminId(adminId);

    if (!credentials) {
      return res.json({ credentials: null });
    }

    res.json({ credentials });
  } catch (error) {
    console.error("Get credentials error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Phone Numbers
export const handleGetNumbers: RequestHandler = (req, res) => {
  try {
    const adminId = req.userId!;
    const numbers = storage.getPhoneNumbersByAdminId(adminId);
    res.json({ numbers });
  } catch (error) {
    console.error("Get numbers error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Team Management
export const handleGetTeamMembers: RequestHandler = (req, res) => {
  try {
    const adminId = req.userId!;
    const members = storage.getTeamMembersByAdminId(adminId);
    res.json({ members });
  } catch (error) {
    console.error("Get team members error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const handleInviteTeamMember: RequestHandler = (req, res) => {
  try {
    const adminId = req.userId!;
    const { email, name, password } = req.body;

    if (!email || !name || !password) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Check if email already exists
    const existingUser = storage.getUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: "User already exists" });
    }

    const userId = storage.generateId();
    const hashedPassword = hashPassword(password);

    // Create user as team member
    const user: User & { password: string } = {
      id: userId,
      email,
      name,
      password: hashedPassword,
      role: "team_member",
      adminId,
      createdAt: new Date().toISOString(),
    };

    storage.createUser(user);

    // Create team member record
    const teamMember: TeamMember & { password: string } = {
      id: userId,
      email,
      name,
      password: hashedPassword,
      adminId,
      status: "active",
      createdAt: new Date().toISOString(),
    };

    storage.addTeamMember(teamMember);

    const userResponse: User = {
      id: userId,
      email,
      name,
      role: "team_member",
      adminId,
      createdAt: user.createdAt,
    };

    res.json({ user: userResponse });
  } catch (error) {
    console.error("Invite team member error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const handleRemoveTeamMember: RequestHandler = (req, res) => {
  try {
    // TODO: Implement team member removal
    res.json({ success: true });
  } catch (error) {
    console.error("Remove team member error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
