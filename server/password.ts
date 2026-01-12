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
 */
export function verifyPassword(password: string, hashedPassword: string): boolean {
  try {
    const [salt, originalHash] = hashedPassword.split(":");
    
    if (!salt || !originalHash) {
      return false;
    }
    
    const hash = crypto
      .pbkdf2Sync(password, salt, 100000, 64, "sha512")
      .toString("hex");
    
    // Use timing-safe comparison to prevent timing attacks
    return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(originalHash));
  } catch (error) {
    return false;
  }
}
