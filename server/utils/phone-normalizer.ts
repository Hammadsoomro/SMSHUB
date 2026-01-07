/**
 * Phone number normalization utilities
 * Ensures consistent E.164 format for phone number comparisons and storage
 */

/**
 * Normalize phone number to E.164 format
 * E.164 format: +<country code><number> (e.g., +18254351943)
 *
 * @param phoneNumber - The phone number to normalize (can be in various formats)
 * @returns Normalized phone number in E.164 format
 */
export function normalizePhoneNumber(phoneNumber: string): string {
  if (!phoneNumber) return "";

  // Remove all non-digit characters except leading +
  let cleaned = phoneNumber.replace(/\D/g, "");

  // If the number doesn't start with country code, assume North America (1)
  // North American numbers are 10 digits
  if (cleaned.length === 10) {
    cleaned = "1" + cleaned;
  }

  // Add + prefix if not present
  if (!cleaned.startsWith("+")) {
    cleaned = "+" + cleaned;
  } else if (cleaned.startsWith("++")) {
    // Handle double plus
    cleaned = "+" + cleaned.replace(/\+/g, "");
  }

  return cleaned;
}

/**
 * Compare two phone numbers by normalizing both and checking equality
 *
 * @param phoneNumber1 - First phone number
 * @param phoneNumber2 - Second phone number
 * @returns true if both numbers are the same when normalized
 */
export function phoneNumbersMatch(
  phoneNumber1: string,
  phoneNumber2: string,
): boolean {
  return normalizePhoneNumber(phoneNumber1) === normalizePhoneNumber(phoneNumber2);
}
