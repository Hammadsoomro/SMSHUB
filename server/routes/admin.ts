import { RequestHandler } from "express";
import crypto from "crypto";
import https from "https";
import { storage } from "../storage";
import { generateToken } from "../jwt";
import { emitPhoneNumberAssigned } from "../ably";
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

export const handleSetActiveNumber: RequestHandler = async (req, res) => {
  try {
    const adminId = req.userId!;
    const { phoneNumberId } = req.body;

    if (!phoneNumberId) {
      return res.status(400).json({ error: "Phone number ID is required" });
    }

    // Get the phone number and verify it belongs to this admin
    const numbers = await storage.getPhoneNumbersByAdminId(adminId);
    const phoneNumber = numbers.find((n) => n.id === phoneNumberId);

    if (!phoneNumber) {
      return res.status(404).json({ error: "Phone number not found" });
    }

    // Update all numbers to set active: false, then set the selected one to true
    for (const number of numbers) {
      await storage.updatePhoneNumber({
        ...number,
        active: number.id === phoneNumberId,
      });
    }

    res.json({ number: { ...phoneNumber, active: true } });
  } catch (error) {
    console.error("Set active number error:", error);
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
    if (
      existingTeamMembers.some(
        (member) => member.email.toLowerCase() === email.toLowerCase(),
      )
    ) {
      return res
        .status(400)
        .json({ error: "This team member already exists in your team" });
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

export const handleRemoveTeamMember: RequestHandler = async (req, res) => {
  try {
    const adminId = req.userId!;
    const { memberId } = req.params;

    if (!memberId) {
      return res.status(400).json({ error: "Member ID is required" });
    }

    // Verify the member belongs to this admin
    const member = await storage.getTeamMemberById(memberId);
    if (!member || member.adminId !== adminId) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    // Remove from both UserModel and TeamMemberModel
    await storage.removeTeamMember(memberId);

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

// Assign phone number to team member
export const handleAssignNumber: RequestHandler = async (req, res) => {
  try {
    const adminId = req.userId!;
    const { phoneNumberId, teamMemberId } = req.body;

    if (!phoneNumberId) {
      return res.status(400).json({ error: "Phone number ID is required" });
    }

    // Get the phone number and verify it belongs to this admin
    const numbers = await storage.getPhoneNumbersByAdminId(adminId);
    const phoneNumber = numbers.find((n) => n.id === phoneNumberId);

    if (!phoneNumber) {
      return res.status(404).json({ error: "Phone number not found" });
    }

    // If assigning to a team member, verify they exist and belong to this admin
    if (teamMemberId) {
      const members = await storage.getTeamMembersByAdminId(adminId);
      const member = members.find((m) => m.id === teamMemberId);

      if (!member) {
        return res.status(404).json({ error: "Team member not found" });
      }
    }

    // Update the phone number with assignment or unassignment
    const updatedNumber: PhoneNumber = {
      ...phoneNumber,
      assignedTo: teamMemberId || undefined,
    };

    await storage.updatePhoneNumberWithAssignment(phoneNumberId, teamMemberId);

    // Emit socket event to notify team member of assignment
    try {
      const io = getSocketIOInstance();
      if (io) {
        if (teamMemberId) {
          // Notify team member that a phone number has been assigned to them
          console.log(
            `📡 Emitting phone number assignment event to team member ${teamMemberId}`,
          );
          io.to(`user:${teamMemberId}`).emit("phone_number_assigned", {
            phoneNumberId,
            phoneNumber: updatedNumber.phoneNumber,
            action: "assigned",
          });
        } else if (phoneNumber.assignedTo) {
          // Notify team member that their phone number has been unassigned
          console.log(
            `📡 Emitting phone number unassignment event to team member ${phoneNumber.assignedTo}`,
          );
          io.to(`user:${phoneNumber.assignedTo}`).emit(
            "phone_number_assigned",
            {
              phoneNumberId,
              phoneNumber: updatedNumber.phoneNumber,
              action: "unassigned",
            },
          );
        }
      } else {
        console.warn(
          "⚠️ Socket.IO instance not available for real-time notification",
        );
      }
    } catch (socketError) {
      console.error("Error emitting socket event:", socketError);
      // Continue without socket event - assignment still succeeds
    }

    res.json({ phoneNumber: updatedNumber });
  } catch (error) {
    console.error("Assign number error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Update phone number settings (active/inactive)
export const handleUpdateNumberSettings: RequestHandler = async (req, res) => {
  try {
    const adminId = req.userId!;
    const { phoneNumberId, active } = req.body;

    if (!phoneNumberId) {
      return res.status(400).json({ error: "Phone number ID is required" });
    }

    if (typeof active !== "boolean") {
      return res.status(400).json({ error: "Active status is required" });
    }

    // Get the phone number and verify it belongs to this admin
    const numbers = await storage.getPhoneNumbersByAdminId(adminId);
    const phoneNumber = numbers.find((n) => n.id === phoneNumberId);

    if (!phoneNumber) {
      return res.status(404).json({ error: "Phone number not found" });
    }

    // Update the phone number settings
    const updatedNumber: PhoneNumber = {
      ...phoneNumber,
      active,
    };

    await storage.updatePhoneNumber(updatedNumber);

    res.json({ phoneNumber: updatedNumber });
  } catch (error) {
    console.error("Update number settings error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Dashboard Statistics
export const handleGetDashboardStats: RequestHandler = async (req, res) => {
  try {
    const adminId = req.userId!;

    const [numbers, teamMembers] = await Promise.all([
      storage.getPhoneNumbersByAdminId(adminId),
      storage.getTeamMembersByAdminId(adminId),
    ]);

    const activeNumbers = numbers.filter((n) => n.active).length;

    res.json({
      stats: {
        activeNumbers,
        teamMembersCount: teamMembers.length,
        teamMembers: teamMembers.map((member) => ({
          id: member.id,
          name: member.name,
          email: member.email,
          createdAt: member.createdAt,
          status: member.status,
        })),
      },
    });
  } catch (error) {
    console.error("Get dashboard stats error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
