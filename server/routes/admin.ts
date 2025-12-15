import { RequestHandler } from "express";
import crypto from "crypto";
import https from "https";
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

// Validate Twilio credentials by making a test API call
async function validateTwilioCredentials(
  accountSid: string,
  authToken: string,
): Promise<{ valid: boolean; error?: string }> {
  return new Promise((resolve) => {
    try {
      // Validate format first
      if (!accountSid.startsWith("AC") || accountSid.length !== 34) {
        return resolve({
          valid: false,
          error:
            "Invalid Account SID format (should start with AC and be 34 characters)",
        });
      }

      if (authToken.length < 32) {
        return resolve({
          valid: false,
          error: "Invalid Auth Token format (should be at least 32 characters)",
        });
      }

      // Make a test API call to Twilio
      const auth = Buffer.from(`${accountSid}:${authToken}`).toString("base64");

      const options = {
        hostname: "api.twilio.com",
        path: `/2010-04-01/Accounts/${accountSid}/Calls.json?PageSize=1`,
        method: "GET",
        headers: {
          Authorization: `Basic ${auth}`,
        },
      };

      const req = https.request(options, (res) => {
        // If we get 401, credentials are invalid
        if (res.statusCode === 401) {
          return resolve({
            valid: false,
            error:
              "Invalid Twilio credentials (401 Unauthorized). Please check your Account SID and Auth Token.",
          });
        }

        // If we get 403, account might be suspended
        if (res.statusCode === 403) {
          return resolve({
            valid: false,
            error:
              "Access forbidden (403). Your Twilio account may be suspended or restricted.",
          });
        }

        // If we get 200 or 429 (rate limited), credentials are valid
        if (res.statusCode === 200 || res.statusCode === 429) {
          return resolve({ valid: true });
        }

        // Any other status code might indicate an issue
        if (res.statusCode && res.statusCode >= 500) {
          return resolve({
            valid: false,
            error: "Twilio API error. Please try again later.",
          });
        }

        return resolve({ valid: true });
      });

      req.on("error", (error) => {
        console.error("Twilio validation error:", error);
        return resolve({
          valid: false,
          error:
            "Failed to connect to Twilio API. Please check your internet connection.",
        });
      });

      req.end();
    } catch (error) {
      console.error("Credential validation error:", error);
      return resolve({
        valid: false,
        error: "Failed to validate credentials",
      });
    }
  });
}

// Twilio Credentials
export const handleSaveCredentials: RequestHandler = async (req, res) => {
  try {
    const adminId = req.userId!;
    const { accountSid, authToken } = req.body as TwilioCredentialsRequest;

    if (!accountSid || !authToken) {
      return res
        .status(400)
        .json({ error: "Please enter both Account SID and Auth Token" });
    }

    // Validate credentials format and connectivity
    const validation = await validateTwilioCredentials(accountSid, authToken);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
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

export const handleGetCredentials: RequestHandler = async (req, res) => {
  try {
    const adminId = req.userId!;
    const credentials = await storage.getTwilioCredentialsByAdminId(adminId);

    if (!credentials) {
      return res.json({ credentials: null });
    }

    res.json({ credentials });
  } catch (error) {
    console.error("Get credentials error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const handleRemoveCredentials: RequestHandler = async (req, res) => {
  try {
    const adminId = req.userId!;
    await storage.removeTwilioCredentials(adminId);
    res.json({ success: true });
  } catch (error) {
    console.error("Remove credentials error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Phone Numbers
export const handleGetNumbers: RequestHandler = async (req, res) => {
  try {
    const adminId = req.userId!;
    const numbers = await storage.getPhoneNumbersByAdminId(adminId);
    res.json({ numbers });
  } catch (error) {
    console.error("Get numbers error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Team Management
export const handleGetTeamMembers: RequestHandler = async (req, res) => {
  try {
    const adminId = req.userId!;
    const members = await storage.getTeamMembersByAdminId(adminId);
    res.json({ members });
  } catch (error) {
    console.error("Get team members error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const handleInviteTeamMember: RequestHandler = async (req, res) => {
  try {
    const adminId = req.userId!;
    const { email, name, password } = req.body;

    if (!email || !name || !password) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Check if this admin already has a team member with this email
    const existingTeamMembers = await storage.getTeamMembersByAdminId(adminId);
    if (existingTeamMembers.some(member => member.email.toLowerCase() === email.toLowerCase())) {
      return res.status(400).json({ error: "This team member already exists in your team" });
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

    await storage.createUser(user);

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

    await storage.addTeamMember(teamMember);

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

// Add existing phone number to account
export const handleAddExistingNumber: RequestHandler = async (req, res) => {
  try {
    const adminId = req.userId!;
    const { phoneNumber } = req.body as { phoneNumber: string };

    if (!phoneNumber) {
      return res.status(400).json({ error: "Phone number is required" });
    }

    // Validate phone number format (basic validation)
    const cleanNumber = phoneNumber.replace(/\D/g, "");
    if (cleanNumber.length < 10) {
      return res.status(400).json({
        error: "Invalid phone number format",
      });
    }

    // Check if number already exists
    const existingNumbers = await storage.getPhoneNumbersByAdminId(adminId);
    if (existingNumbers.some((n) => n.phoneNumber === phoneNumber)) {
      return res.status(400).json({
        error: "This number is already in your account",
      });
    }

    // Add the phone number
    const newPhoneNumber: PhoneNumber = {
      id: storage.generateId(),
      adminId,
      phoneNumber,
      purchasedAt: new Date().toISOString(),
      active: true,
    };

    await storage.addPhoneNumber(newPhoneNumber);

    res.json({ phoneNumber: newPhoneNumber });
  } catch (error) {
    console.error("Add existing number error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
