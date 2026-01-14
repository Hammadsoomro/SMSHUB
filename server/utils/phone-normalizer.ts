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

  // Remove all whitespace and non-digit characters except +
  let cleaned = phoneNumber.trim().replace(/[\s\-().]/g, "");

  // Remove any leading + signs first
  cleaned = cleaned.replace(/^\+/, "");

  // Remove all remaining non-digit characters
  cleaned = cleaned.replace(/\D/g, "");

  // If the number is exactly 10 digits, assume it's a North American number without country code
  if (cleaned.length === 10) {
    cleaned = "1" + cleaned;
  }

  // Add + prefix to create E.164 format
  if (!cleaned.startsWith("+")) {
    cleaned = "+" + cleaned;
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
