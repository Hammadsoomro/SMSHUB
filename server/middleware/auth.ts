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

export const authMiddleware: RequestHandler = (req, res, next) => {
  try {
    const token = extractTokenFromHeader(req.headers.authorization);

    if (!token) {
      return res.status(401).json({ error: "Missing authorization token" });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return res.status(401).json({ error: "Invalid token" });
    }

    const user = storage.getUserById(payload.userId);
    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

    req.userId = payload.userId;
    req.userRole = payload.role;
    req.user = user;

    next();
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
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
