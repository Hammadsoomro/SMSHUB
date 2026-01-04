import crypto from "crypto";

// Use environment variable for encryption key, fallback to a default for development
// In production, this should be a strong, unique key stored securely
const ENCRYPTION_KEY =
  process.env.ENCRYPTION_KEY ||
  "your-secret-encryption-key-change-in-production";

// Ensure key is 32 bytes (256 bits) for AES-256
const getEncryptionKey = (): Buffer => {
  const key = ENCRYPTION_KEY.padEnd(32, "0").substring(0, 32);
  return Buffer.from(key);
};

/**
 * Encrypt sensitive data (e.g., Twilio auth token)
 */
export function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-cbc", getEncryptionKey(), iv);

  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");

  // Return IV + encrypted data concatenated
  return iv.toString("hex") + ":" + encrypted;
}

/**
 * Decrypt sensitive data
 * Falls back to returning the original text if decryption fails
 * (for backward compatibility with unencrypted data)
 */
export function decrypt(encryptedText: string): string {
  try {
    const parts = encryptedText.split(":");
    if (parts.length !== 2) {
      // If not in encrypted format, return as-is (backward compatibility)
      console.warn(
        "Warning: Data appears to be unencrypted. Consider re-saving credentials.",
      );
      return encryptedText;
    }

    const iv = Buffer.from(parts[0], "hex");
    const decipher = crypto.createDecipheriv(
      "aes-256-cbc",
      getEncryptionKey(),
      iv,
    );

    let decrypted = decipher.update(parts[1], "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  } catch (error) {
    // If decryption fails for any reason, try to return the original text
    // This handles cases where the encryption key may have changed
    console.error(
      "Decryption failed:",
      error instanceof Error ? error.message : "Unknown error",
    );
    console.warn(
      "Returning unencrypted text. Please re-save your Twilio credentials.",
    );
    return encryptedText;
  }
}
