import "dotenv/config";
import mongoose from "mongoose";
import serverless from "serverless-http";
import express, { Express, RequestHandler } from "express";
import cors from "cors";
import crypto from "crypto";
import https from "https";

// ============================================================================
// MONGODB CONNECTION AND MODELS
// ============================================================================

const mongodbUri = process.env.MONGODB_URI;
if (!mongodbUri) {
  throw new Error("MONGODB_URI environment variable is not set");
}

// Initialize mongoose connection
let dbConnected = false;

async function connectDB() {
  if (dbConnected && mongoose.connection.readyState === 1) {
    return;
  }

  try {
    await mongoose.connect(mongodbUri);
    dbConnected = true;
    console.log("✅ Connected to MongoDB");
  } catch (error) {
    console.error("❌ Failed to connect to MongoDB:", error);
    throw error;
  }
}

// ============================================================================
// MONGOOSE SCHEMAS AND MODELS
// ============================================================================

const userSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    name: { type: String, required: true },
    password: { type: String, required: true },
    role: { type: String, enum: ["admin", "team_member"], required: true },
    adminId: { type: String, sparse: true },
    createdAt: { type: String, required: true },
  },
  { collection: "users" },
);

const twilioCredentialsSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    adminId: { type: String, required: true, unique: true },
    accountSid: { type: String, required: true },
    authToken: { type: String, required: true },
    connectedAt: { type: String, required: true },
  },
  { collection: "twilio_credentials" },
);

const phoneNumberSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    adminId: { type: String, required: true },
    phoneNumber: { type: String, required: true },
    assignedTo: { type: String, sparse: true },
    purchasedAt: { type: String, required: true },
    active: { type: Boolean, default: true },
    updatedAt: { type: String, default: () => new Date().toISOString() },
  },
  { collection: "phone_numbers" },
);

const teamMemberSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    name: { type: String, required: true },
    password: { type: String, required: true },
    adminId: { type: String, required: true },
    status: { type: String, enum: ["pending", "active"], default: "active" },
    createdAt: { type: String, required: true },
  },
  { collection: "team_members" },
);

const messageSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    phoneNumberId: { type: String, required: true },
    from: { type: String, required: true },
    to: { type: String, required: true },
    body: { type: String, required: true },
    direction: { type: String, enum: ["inbound", "outbound"], required: true },
    timestamp: { type: String, required: true },
    sid: { type: String, sparse: true },
  },
  { collection: "messages" },
);

const contactSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    phoneNumberId: { type: String, required: true },
    phoneNumber: { type: String, required: true },
    name: { type: String, sparse: true },
    lastMessage: { type: String, sparse: true },
    lastMessageTime: { type: String, sparse: true },
    unreadCount: { type: Number, default: 0 },
  },
  { collection: "contacts" },
);

const walletSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    adminId: { type: String, required: true, unique: true },
    balance: { type: Number, required: true, default: 0 },
    currency: { type: String, required: true, default: "USD" },
    createdAt: { type: String, required: true },
    updatedAt: { type: String, required: true },
  },
  { collection: "wallets" },
);

// Create models
const UserModel = mongoose.model("User", userSchema);
const TwilioCredentialsModel = mongoose.model(
  "TwilioCredentials",
  twilioCredentialsSchema,
);
const PhoneNumberModel = mongoose.model("PhoneNumber", phoneNumberSchema);
const TeamMemberModel = mongoose.model("TeamMember", teamMemberSchema);
const MessageModel = mongoose.model("Message", messageSchema);
const ContactModel = mongoose.model("Contact", contactSchema);
const WalletModel = mongoose.model("Wallet", walletSchema);

// ============================================================================
// JWT AND AUTHENTICATION
// ============================================================================

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

function generateToken(userId: string): string {
  const header = { alg: "HS256", typ: "JWT" };
  const payload = {
    userId,
    iat: Math.floor(Date.now() / 1000),
  };

  const headerEncoded = Buffer.from(JSON.stringify(header)).toString("base64url");
  const payloadEncoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto
    .createHmac("sha256", JWT_SECRET)
    .update(`${headerEncoded}.${payloadEncoded}`)
    .digest("base64url");

  return `${headerEncoded}.${payloadEncoded}.${signature}`;
}

function verifyToken(token: string): { userId: string } | null {
  try {
    const [headerEncoded, payloadEncoded, signature] = token.split(".");
    const expectedSignature = crypto
      .createHmac("sha256", JWT_SECRET)
      .update(`${headerEncoded}.${payloadEncoded}`)
      .digest("base64url");

    if (signature !== expectedSignature) {
      return null;
    }

    const payload = JSON.parse(Buffer.from(payloadEncoded, "base64url").toString());
    return { userId: payload.userId };
  } catch {
    return null;
  }
}

// ============================================================================
// MIDDLEWARE
// ============================================================================

const authMiddleware: RequestHandler = (req, res, next) => {
  const token = req.headers.authorization?.replace("Bearer ", "");

  if (!token) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ error: "Invalid token" });
  }

  (req as any).userId = decoded.userId;
  next();
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function generateId(): string {
  return uuidv4();
}

async function validateTwilioCredentials(
  accountSid: string,
  authToken: string,
): Promise<{ valid: boolean; error?: string }> {
  return new Promise((resolve) => {
    try {
      if (!accountSid.startsWith("AC") || accountSid.length !== 34) {
        return resolve({
          valid: false,
          error: "Invalid Account SID format (should start with AC and be 34 characters)",
        });
      }

      if (authToken.length < 32) {
        return resolve({
          valid: false,
          error: "Invalid Auth Token format (should be at least 32 characters)",
        });
      }

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
        if (res.statusCode === 401) {
          return resolve({
            valid: false,
            error: "Invalid Twilio credentials (401 Unauthorized)",
          });
        }
        if (res.statusCode === 403) {
          return resolve({
            valid: false,
            error: "Access forbidden (403). Your Twilio account may be suspended",
          });
        }
        if (res.statusCode === 200 || res.statusCode === 429) {
          return resolve({ valid: true });
        }
        if (res.statusCode && res.statusCode >= 500) {
          return resolve({
            valid: false,
            error: "Twilio API error. Please try again later.",
          });
        }
        return resolve({ valid: true });
      });

      req.on("error", () => {
        resolve({
          valid: false,
          error: "Failed to connect to Twilio API",
        });
      });

      req.end();
    } catch (error) {
      return resolve({
        valid: false,
        error: "Failed to validate credentials",
      });
    }
  });
}

// ============================================================================
// AUTH HANDLERS
// ============================================================================

const handleSignup: RequestHandler = async (req, res) => {
  try {
    const { email, name, password } = req.body;

    if (!email || !name || !password) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const existingUser = await UserModel.findOne({
      email: email.toLowerCase(),
    });
    if (existingUser) {
      return res.status(400).json({ error: "Email already registered" });
    }

    const userId = generateId();
    const hashedPassword = hashPassword(password);

    const user = new UserModel({
      id: userId,
      email: email.toLowerCase(),
      name,
      password: hashedPassword,
      role: "admin",
      createdAt: new Date().toISOString(),
    });

    await user.save();

    const wallet = new WalletModel({
      id: generateId(),
      adminId: userId,
      balance: 0,
      currency: "USD",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    await wallet.save();

    const token = generateToken(userId);
    res.json({
      user: {
        id: userId,
        email: user.email,
        name: user.name,
        role: "admin",
        createdAt: user.createdAt,
      },
      token,
    });
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const handleLogin: RequestHandler = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Missing email or password" });
    }

    const user = await UserModel.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const hashedPassword = hashPassword(password);
    if (user.password !== hashedPassword) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = generateToken(user.id);
    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        createdAt: user.createdAt,
      },
      token,
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const handleGetProfile: RequestHandler = async (req, res) => {
  try {
    const userId = (req as any).userId;
    const user = await UserModel.findOne({ id: userId });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// ============================================================================
// ADMIN HANDLERS - CREDENTIALS
// ============================================================================

const handleSaveCredentials: RequestHandler = async (req, res) => {
  try {
    const adminId = (req as any).userId;
    const { accountSid, authToken } = req.body;

    if (!accountSid || !authToken) {
      return res.status(400).json({ error: "Please enter both Account SID and Auth Token" });
    }

    const validation = await validateTwilioCredentials(accountSid, authToken);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    const credentialsId = generateId();
    const credentials = {
      id: credentialsId,
      adminId,
      accountSid,
      authToken,
      connectedAt: new Date().toISOString(),
    };

    await TwilioCredentialsModel.updateOne({ adminId }, credentials, {
      upsert: true,
    });

    res.json({ credentials });
  } catch (error) {
    console.error("Save credentials error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const handleGetCredentials: RequestHandler = async (req, res) => {
  try {
    const adminId = (req as any).userId;
    const credentials = await TwilioCredentialsModel.findOne({ adminId });

    res.json({ credentials: credentials || null });
  } catch (error) {
    console.error("Get credentials error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const handleRemoveCredentials: RequestHandler = async (req, res) => {
  try {
    const adminId = (req as any).userId;
    await TwilioCredentialsModel.deleteOne({ adminId });
    res.json({ success: true });
  } catch (error) {
    console.error("Remove credentials error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// ============================================================================
// ADMIN HANDLERS - PHONE NUMBERS
// ============================================================================

const handleGetNumbers: RequestHandler = async (req, res) => {
  try {
    const adminId = (req as any).userId;
    const numbers = await PhoneNumberModel.find({ adminId });
    res.json({
      numbers: numbers.map((doc: any) => {
        const data = doc.toObject();
        if (!data.id && data._id) {
          data.id = data._id.toString();
        }
        return data;
      }),
    });
  } catch (error) {
    console.error("Get numbers error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const handleAddExistingNumber: RequestHandler = async (req, res) => {
  try {
    const adminId = (req as any).userId;
    const { phoneNumber } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({ error: "Phone number is required" });
    }

    const cleanNumber = phoneNumber.replace(/\D/g, "");
    if (cleanNumber.length < 10) {
      return res.status(400).json({ error: "Invalid phone number format" });
    }

    const existing = await PhoneNumberModel.findOne({ phoneNumber, adminId });
    if (existing) {
      return res.status(400).json({
        error: "This number is already in your account",
      });
    }

    const newPhoneNumber = {
      id: generateId(),
      adminId,
      phoneNumber,
      purchasedAt: new Date().toISOString(),
      active: true,
      updatedAt: new Date().toISOString(),
    };

    const savedNumber = new PhoneNumberModel(newPhoneNumber);
    await savedNumber.save();

    res.json({ phoneNumber: newPhoneNumber });
  } catch (error) {
    console.error("Add existing number error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const handleAssignNumber: RequestHandler = async (req, res) => {
  try {
    const adminId = (req as any).userId;
    const { phoneNumberId, teamMemberId } = req.body;

    if (!phoneNumberId) {
      return res.status(400).json({ error: "Phone number ID is required" });
    }

    const phoneNumber = await PhoneNumberModel.findOne({
      id: phoneNumberId,
      adminId,
    });

    if (!phoneNumber) {
      return res.status(404).json({ error: "Phone number not found" });
    }

    // If assigning to a team member, verify they exist and belong to this admin
    if (teamMemberId && teamMemberId !== null) {
      const member = await TeamMemberModel.findOne({
        id: teamMemberId,
        adminId,
      });

      if (!member) {
        return res.status(404).json({ error: "Team member not found" });
      }
    }

    // If teamMemberId is null or undefined, unassign it
    const updateData: any = {
      updatedAt: new Date().toISOString(),
    };

    if (teamMemberId && teamMemberId !== null) {
      updateData.assignedTo = teamMemberId;
    } else {
      // Unset the assignedTo field to properly remove the assignment
      updateData.$unset = { assignedTo: 1 };
    }

    const updatedNumber = await PhoneNumberModel.findOneAndUpdate(
      { id: phoneNumberId },
      updateData,
      { new: true },
    );

    if (!updatedNumber) {
      return res.status(500).json({ error: "Failed to update number" });
    }

    const data = updatedNumber.toObject() as any;
    if (!data.id && data._id) {
      data.id = data._id.toString();
    }

    res.json({
      phoneNumber: data,
    });
  } catch (error) {
    console.error("Assign number error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const handleUpdateNumberSettings: RequestHandler = async (req, res) => {
  try {
    const adminId = (req as any).userId;
    const { phoneNumberId, active } = req.body;

    if (!phoneNumberId) {
      return res.status(400).json({ error: "Phone number ID is required" });
    }

    if (typeof active !== "boolean") {
      return res.status(400).json({ error: "Active status is required" });
    }

    const phoneNumber = await PhoneNumberModel.findOne({
      id: phoneNumberId,
      adminId,
    });

    if (!phoneNumber) {
      return res.status(404).json({ error: "Phone number not found" });
    }

    const updatedNumber = await PhoneNumberModel.findOneAndUpdate(
      { id: phoneNumberId },
      {
        active,
        updatedAt: new Date().toISOString(),
      },
      { new: true },
    );

    if (!updatedNumber) {
      return res.status(500).json({ error: "Failed to update number" });
    }

    const data = updatedNumber.toObject() as any;
    if (!data.id && data._id) {
      data.id = data._id.toString();
    }

    res.json({
      phoneNumber: data,
    });
  } catch (error) {
    console.error("Update number settings error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// ============================================================================
// ADMIN HANDLERS - TEAM MEMBERS
// ============================================================================

const handleGetTeamMembers: RequestHandler = async (req, res) => {
  try {
    const adminId = (req as any).userId;
    const members = await TeamMemberModel.find({ adminId });

    res.json({
      members: members.map((member: any) => {
        const { password, ...memberWithoutPassword } = member.toObject();
        return memberWithoutPassword;
      }),
    });
  } catch (error) {
    console.error("Get team members error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const handleInviteTeamMember: RequestHandler = async (req, res) => {
  try {
    const adminId = (req as any).userId;
    const { email, name, password } = req.body;

    if (!email || !name || !password) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const existingMember = await TeamMemberModel.findOne({
      email: email.toLowerCase(),
      adminId,
    });

    if (existingMember) {
      return res
        .status(400)
        .json({ error: "This team member already exists in your team" });
    }

    const userId = generateId();
    const hashedPassword = hashPassword(password);

    const teamMember = new TeamMemberModel({
      id: userId,
      email: email.toLowerCase(),
      name,
      password: hashedPassword,
      adminId,
      status: "active",
      createdAt: new Date().toISOString(),
    });

    await teamMember.save();

    const user = new UserModel({
      id: userId,
      email: email.toLowerCase(),
      name,
      password: hashedPassword,
      role: "team_member",
      adminId,
      createdAt: new Date().toISOString(),
    });

    await user.save();

    res.json({
      user: {
        id: userId,
        email,
        name,
        role: "team_member",
        adminId,
        createdAt: teamMember.createdAt,
      },
    });
  } catch (error) {
    console.error("Invite team member error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const handleRemoveTeamMember: RequestHandler = async (req, res) => {
  try {
    const adminId = (req as any).userId;
    const { memberId } = req.params;

    if (!memberId) {
      return res.status(400).json({ error: "Member ID is required" });
    }

    const member = await TeamMemberModel.findOne({ id: memberId });

    if (!member || member.adminId !== adminId) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    await TeamMemberModel.deleteOne({ id: memberId });
    await UserModel.deleteOne({ id: memberId, role: "team_member" });

    res.json({ success: true });
  } catch (error) {
    console.error("Remove team member error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// ============================================================================
// DASHBOARD HANDLERS
// ============================================================================

const handleGetDashboardStats: RequestHandler = async (req, res) => {
  try {
    const adminId = (req as any).userId;

    const [numbers, teamMembers] = await Promise.all([
      PhoneNumberModel.find({ adminId }),
      TeamMemberModel.find({ adminId }),
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

// ============================================================================
// EXPRESS APP SETUP
// ============================================================================

const createApp = async (): Promise<Express> => {
  const app = express();

  app.use(cors());
  app.use(express.json());

  // Connect to MongoDB on first request
  app.use(async (req, res, next) => {
    try {
      await connectDB();
      next();
    } catch (error) {
      console.error("Database connection error:", error);
      res.status(500).json({ error: "Database connection failed" });
    }
  });

  // =========================================================================
  // PUBLIC ROUTES
  // =========================================================================

  // Auth routes
  app.post("/api/auth/signup", handleSignup);
  app.post("/api/auth/login", handleLogin);

  // =========================================================================
  // PROTECTED ROUTES
  // =========================================================================

  app.get("/api/auth/profile", authMiddleware, handleGetProfile);

  // Admin routes - Credentials
  app.post("/api/admin/credentials", authMiddleware, handleSaveCredentials);
  app.get("/api/admin/credentials", authMiddleware, handleGetCredentials);
  app.delete("/api/admin/credentials", authMiddleware, handleRemoveCredentials);

  // Admin routes - Numbers
  app.get("/api/admin/numbers", authMiddleware, handleGetNumbers);
  app.post("/api/admin/add-existing-number", authMiddleware, handleAddExistingNumber);
  app.post("/api/admin/assign-number", authMiddleware, handleAssignNumber);
  app.patch(
    "/api/admin/number-settings",
    authMiddleware,
    handleUpdateNumberSettings,
  );

  // Admin routes - Team
  app.get("/api/admin/team", authMiddleware, handleGetTeamMembers);
  app.post("/api/admin/team/invite", authMiddleware, handleInviteTeamMember);
  app.delete("/api/admin/team/:memberId", authMiddleware, handleRemoveTeamMember);

  // Admin routes - Dashboard
  app.get("/api/admin/dashboard/stats", authMiddleware, handleGetDashboardStats);

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  return app;
};

// ============================================================================
// NETLIFY HANDLER
// ============================================================================

let cachedApp: Express | null = null;

export const handler = async (event: any, context: any) => {
  if (!cachedApp) {
    cachedApp = await createApp();
  }

  context.callbackWaitsForEmptyEventLoop = false;
  return serverless(cachedApp)(event, context);
};
