import crypto from "crypto";

// ✅ SECURITY: Enforce JWT_SECRET in production - fail hard if not set
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error(
    "[FATAL] JWT_SECRET environment variable is REQUIRED and must be set. " +
      "Authentication cannot function without it. " +
      "Set it in your .env file or Netlify environment variables.",
  );
}

interface JWTPayload {
  userId: string;
  email: string;
  role: "admin" | "team_member";
  iat: number;
  exp: number;
}

function base64UrlEncode(str: string): string {
  return Buffer.from(str)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

function base64UrlDecode(str: string): string {
  str += new Array(5 - (str.length % 4)).join("=");
  return Buffer.from(
    str.replace(/-/g, "+").replace(/_/g, "/"),
    "base64",
  ).toString();
}

export function generateToken(
  payload: Omit<JWTPayload, "iat" | "exp">,
): string {
  const now = Math.floor(Date.now() / 1000);
  const jwtPayload: JWTPayload = {
    ...payload,
    iat: now,
    exp: now + 24 * 60 * 60, // 24 hours
  };

  const header = base64UrlEncode(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload64 = base64UrlEncode(JSON.stringify(jwtPayload));

  const signature = crypto
    .createHmac("sha256", JWT_SECRET)
    .update(`${header}.${payload64}`)
    .digest();
  const signature64 = base64UrlEncode(signature.toString("base64"));

  return `${header}.${payload64}.${signature64}`;
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    if (!JWT_SECRET) {
      console.error("[JWT] JWT_SECRET is not configured");
      return null;
    }

    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const [header64, payload64, signature64] = parts;

    // Verify signature
    const signature = crypto
      .createHmac("sha256", JWT_SECRET)
      .update(`${header64}.${payload64}`)
      .digest();
    const expectedSignature = base64UrlEncode(signature.toString("base64"));

    if (signature64 !== expectedSignature) return null;

    // Parse payload
    const payload = JSON.parse(base64UrlDecode(payload64)) as JWTPayload;

    // Check expiration
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;

    return payload;
  } catch {
    return null;
  }
}

export function extractTokenFromHeader(authHeader?: string): string | null {
  if (!authHeader) return null;
  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer") return null;
  return parts[1];
}
