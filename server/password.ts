import crypto from "crypto";

/**
 * Hash a password using PBKDF2 (much more secure than SHA256)
 * PBKDF2 is intentionally slow, making brute force attacks much harder
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(32).toString("hex");
  const hash = crypto
    .pbkdf2Sync(password, salt, 100000, 64, "sha512")
    .toString("hex");

  // Return salt and hash together (separated by :)
  return `${salt}:${hash}`;
}

/**
 * Verify a password against a previously hashed password
 * Supports both new PBKDF2 format (salt:hash) and old SHA256 format for backward compatibility
 */
export function verifyPassword(
  password: string,
  hashedPassword: string,
): boolean {
  try {
    // Try new PBKDF2 format first (salt:hash)
    if (hashedPassword.includes(":")) {
      const [salt, originalHash] = hashedPassword.split(":");

      if (!salt || !originalHash) {
        console.warn("[verifyPassword] PBKDF2 format error - invalid split");
        return false;
      }

      const hash = crypto
        .pbkdf2Sync(password, salt, 100000, 64, "sha512")
        .toString("hex");

      // Use timing-safe comparison to prevent timing attacks
      return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(originalHash));
    }

    // Fallback: Try old SHA256 format for backward compatibility with legacy accounts
    console.log("[verifyPassword] Hash doesn't contain ':', trying SHA256 fallback");
    const sha256Hash = crypto.createHash("sha256").update(password).digest("hex");

    // Compare with timing-safe comparison
    try {
      return crypto.timingSafeEqual(Buffer.from(sha256Hash), Buffer.from(hashedPassword));
    } catch {
      return false;
    }
  } catch (error) {
    console.error("[verifyPassword] Error:", error);
    return false;
  }
}
