import { RequestHandler } from "express";
import crypto from "crypto";
import { storage } from "../storage";
import { generateToken } from "../jwt";
import { SignupRequest, LoginRequest, AuthResponse, User } from "@shared/api";

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}

export const handleSignup: RequestHandler = async (req, res) => {
  try {
    const { email, password, name } = req.body as SignupRequest;

    // Debug logging
    console.log("[handleSignup] Request body:", req.body);
    console.log("[handleSignup] Email:", email);
    console.log("[handleSignup] Name:", name);
    console.log("[handleSignup] Password:", password ? "***" : "undefined");

    // Validation
    if (!email || !password || !name) {
      console.error(
        "[handleSignup] Missing fields - Email:",
        !!email,
        "Password:",
        !!password,
        "Name:",
        !!name,
      );
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Check if user exists
    const existingUser = await storage.getUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: "User already exists" });
    }

    const userId = storage.generateId();
    const hashedPassword = hashPassword(password);

    // Create user as admin
    const user: User & { password: string } = {
      id: userId,
      email,
      name,
      password: hashedPassword,
      role: "admin",
      createdAt: new Date().toISOString(),
    };

    await storage.createUser(user);

    const token = generateToken({
      userId,
      email,
      role: "admin",
    });

    const userResponse: User = {
      id: userId,
      email,
      name,
      role: "admin",
      createdAt: user.createdAt,
    };

    const response: AuthResponse = {
      user: userResponse,
      token,
    };

    res.json(response);
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const handleLogin: RequestHandler = async (req, res) => {
  try {
    const { email, password } = req.body as LoginRequest;

    // Debug logging
    console.log("[handleLogin] Request body:", req.body);
    console.log("[handleLogin] Email:", email);
    console.log("[handleLogin] Password:", password ? "***" : "undefined");

    // Validation
    if (!email || !password) {
      console.error(
        "[handleLogin] Missing fields - Email:",
        !!email,
        "Password:",
        !!password,
      );
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Find user
    const user = await storage.getUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Verify password
    if (!verifyPassword(password, user.password)) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    const userResponse: User = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      adminId: user.adminId,
      createdAt: user.createdAt,
    };

    const response: AuthResponse = {
      user: userResponse,
      token,
    };

    res.json(response);
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const handleVerifySession: RequestHandler = async (req, res) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        error: "Session invalid",
        valid: false,
      });
    }

    res.json({
      valid: true,
      user,
    });
  } catch (error) {
    console.error("Session verification error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const handleGetProfile: RequestHandler = async (req, res) => {
  try {
    const userId = req.userId!;
    const user = await storage.getUserById(userId);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ user });
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const handleUpdateProfile: RequestHandler = async (req, res) => {
  try {
    const userId = req.userId!;
    const { name, email } = req.body as { name?: string; email?: string };

    const user = await storage.getUserById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Update user fields
    if (name) {
      user.name = name;
    }
    if (email) {
      user.email = email;
    }

    await storage.updateUser(user);

    const userResponse: User = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      adminId: user.adminId,
      createdAt: user.createdAt,
    };

    res.json({ user: userResponse });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
