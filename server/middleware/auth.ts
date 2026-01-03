import { RequestHandler } from "express";
import { verifyToken, extractTokenFromHeader } from "../jwt";
import { storage } from "../storage";

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      userRole?: "admin" | "team_member";
      user?: any;
    }
  }
}

export const authMiddleware: RequestHandler = async (req, res, next) => {
  try {
    const token = extractTokenFromHeader(req.headers.authorization);

    if (!token) {
      return res.status(401).json({
        error: "Missing authorization token. Please login again.",
        code: "NO_TOKEN",
      });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return res.status(401).json({
        error: "Your session has expired. Please login again.",
        code: "INVALID_TOKEN",
      });
    }

    // Get user from storage, but use token payload as fallback
    let user;
    try {
      user = await storage.getUserById(payload.userId);
    } catch (dbError) {
      console.warn(
        `Database lookup failed for user ${payload.userId}, using token data:`,
        dbError,
      );
      // Fall through to use token data as fallback
    }

    if (!user) {
      // If user not found in storage, create a minimal user object from token
      // This handles the case where server restarted but token is still valid
      user = {
        id: payload.userId,
        email: payload.email,
        name: payload.email.split("@")[0],
        role: payload.role,
        createdAt: new Date().toISOString(),
      } as any;
    }

    req.userId = payload.userId;
    req.userRole = payload.role;
    req.user = user;

    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    res.status(401).json({
      error: "Authentication failed. Please login again.",
      code: "AUTH_ERROR",
    });
  }
};

export const adminOnly: RequestHandler = (req, res, next) => {
  if (req.userRole !== "admin") {
    return res.status(403).json({ error: "Only admins can access this" });
  }
  next();
};

export const teamMemberOnly: RequestHandler = (req, res, next) => {
  if (req.userRole !== "team_member") {
    return res.status(403).json({ error: "Only team members can access this" });
  }
  next();
};
