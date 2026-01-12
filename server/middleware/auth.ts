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

    // Verify user exists in database
    let user;
    try {
      user = await storage.getUserById(payload.userId);
    } catch (dbError) {
      console.error(
        `[AUTH] Database error checking user ${payload.userId}:`,
        dbError,
      );
      return res.status(401).json({
        error: "Authentication service unavailable. Please try again.",
        code: "DB_ERROR",
      });
    }

    // User must exist in database - no fallback
    if (!user) {
      console.warn(
        `[AUTH] User ${payload.userId} not found in database (possibly deleted or revoked)`,
      );
      return res.status(401).json({
        error: "User account not found. Please login again.",
        code: "USER_NOT_FOUND",
      });
    }

    req.userId = payload.userId;
    req.userRole = user.role;
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
