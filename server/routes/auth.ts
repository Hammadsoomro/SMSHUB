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

export const handleSignup: RequestHandler = (req, res) => {
  try {
    const { email, password, name } = req.body as SignupRequest;

    // Validation
    if (!email || !password || !name) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Check if user exists
    if (storage.getUserByEmail(email)) {
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

    storage.createUser(user);

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

export const handleLogin: RequestHandler = (req, res) => {
  try {
    const { email, password } = req.body as LoginRequest;

    // Validation
    if (!email || !password) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Find user
    const user = storage.getUserByEmail(email);
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
