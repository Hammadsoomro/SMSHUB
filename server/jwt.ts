import crypto from "crypto";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";

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
  return Buffer.from(str.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString();
}

export function generateToken(payload: Omit<JWTPayload, "iat" | "exp">): string {
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
    console.log("[JWT] Verifying token...");
    const parts = token.split(".");
    console.log(`[JWT] Token parts count: ${parts.length}`);

    if (parts.length !== 3) {
      console.warn("[JWT] Invalid token format: wrong number of parts");
      return null;
    }

    const [header64, payload64, signature64] = parts;
    console.log("[JWT] Token structure valid");

    // Verify signature
    const signature = crypto
      .createHmac("sha256", JWT_SECRET)
      .update(`${header64}.${payload64}`)
      .digest();
    const expectedSignature = base64UrlEncode(signature.toString("base64"));

    console.log("[JWT] Signature check:", {
      providedSig: signature64.substring(0, 10) + "...",
      expectedSig: expectedSignature.substring(0, 10) + "...",
      match: signature64 === expectedSignature,
    });

    if (signature64 !== expectedSignature) {
      console.warn("[JWT] Invalid token signature");
      return null;
    }

    // Parse payload
    const decodedPayloadStr = base64UrlDecode(payload64);
    console.log("[JWT] Decoded payload string:", decodedPayloadStr);

    const payload = JSON.parse(decodedPayloadStr) as any;
    console.log("[JWT] Parsed payload object:", JSON.stringify(payload));
    console.log("[JWT] Payload userId field:", payload.userId);
    console.log("[JWT] Payload email field:", payload.email);
    console.log("[JWT] Payload role field:", payload.role);

    // Check expiration
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp < now) {
      console.warn("[JWT] Token expired:", { exp: payload.exp, now });
      return null;
    }

    console.log("[JWT] Token verification successful");
    return payload as JWTPayload;
  } catch (error) {
    console.error("[JWT] Error verifying token:", error);
    return null;
  }
}

export function extractTokenFromHeader(authHeader?: string): string | null {
  if (!authHeader) return null;
  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer") return null;
  return parts[1];
}
