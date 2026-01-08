import { RequestHandler } from "express";
import { storage } from "../storage";
import { TwilioClient } from "../twilio";
import { decrypt } from "../crypto";
import { AvailablePhoneNumber, PhoneNumber } from "@shared/api";

// Country codes mapping for Twilio
const COUNTRY_CODES: Record<string, { code: string; name: string }> = {
  US: { code: "US", name: "United States" },
  CA: { code: "CA", name: "Canada" },
  GB: { code: "GB", name: "United Kingdom" },
  AU: { code: "AU", name: "Australia" },
  DE: { code: "DE", name: "Germany" },
  ES: { code: "ES", name: "Spain" },
  FR: { code: "FR", name: "France" },
};

export const handleGetTwilioBalance: RequestHandler = async (req, res) => {
  try {
    const adminId = req.userId!;

    // Prevent caching for this endpoint - balance changes dynamically
    res.set({
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      Pragma: "no-cache",
      Expires: "0",
      ETag: undefined,
    });

    // Get admin's Twilio credentials
    const credentials = await storage.getTwilioCredentialsByAdminId(adminId);
    if (!credentials) {
      return res
        .status(400)
        .json({ error: "Please connect your Twilio credentials first" });
    }

    // Validate that credentials have the required fields
    if (!credentials.accountSid || !credentials.authToken) {
      return res.status(400).json({
        error: "Incomplete Twilio credentials. Please reconnect your account.",
      });
    }

    // Decrypt the auth token
    const decryptedAuthToken = decrypt(credentials.authToken);

    // Additional validation for decrypted token
    if (!decryptedAuthToken || decryptedAuthToken.trim().length === 0) {
      return res.status(400).json({
        error: "Invalid Twilio auth token. Please reconnect your credentials.",
      });
    }

    // Fetch balance from Twilio
    const twilioClient = new TwilioClient(
      credentials.accountSid,
      decryptedAuthToken,
    );

    const balance = await twilioClient.getAccountBalance();

    // Validate balance is a positive number
    if (typeof balance !== "number" || isNaN(balance) || balance < 0) {
      return res.status(500).json({
        error: "Invalid balance value received from Twilio API",
      });
    }

    res.json({ balance });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("Get Twilio balance error:", errorMessage);

    res.status(500).json({
      error: `Failed to fetch Twilio balance: ${errorMessage}. Please verify your credentials are correct.`,
    });
  }
};

export const handleGetAvailableNumbers: RequestHandler = async (req, res) => {
  try {
    const adminId = req.userId!;
    const { countryCode, state } = req.query as {
      countryCode: string;
      state?: string;
    };

    if (!countryCode || !COUNTRY_CODES[countryCode]) {
      return res.status(400).json({ error: "Invalid country code" });
    }

    // Get admin's Twilio credentials
    const credentials = await storage.getTwilioCredentialsByAdminId(adminId);
    if (!credentials) {
      return res
        .status(400)
        .json({ error: "Please connect your Twilio credentials first" });
    }

    // Validate that credentials have the required fields
    if (!credentials.accountSid || !credentials.authToken) {
      return res.status(400).json({
        error: "Incomplete Twilio credentials. Please reconnect your account.",
      });
    }

    // Decrypt the auth token
    const decryptedAuthToken = decrypt(credentials.authToken);

    // Additional validation for decrypted token
    if (!decryptedAuthToken || decryptedAuthToken.trim().length === 0) {
      return res.status(400).json({
        error: "Invalid Twilio auth token. Please reconnect your credentials.",
      });
    }

    // Fetch available numbers from Twilio
    // Try multiple area codes if the first attempt doesn't return any numbers
    let availableNumbers: any = null;
    let areaCodeIndex = 0;
    const maxRetries = 5; // Try up to 5 different area codes

    for (areaCodeIndex = 0; areaCodeIndex < maxRetries; areaCodeIndex++) {
      const twilioClient = new TwilioClient(
        credentials.accountSid,
        decryptedAuthToken,
      );
      availableNumbers = await twilioClient.getAvailableNumbers(
        countryCode,
        areaCodeIndex,
        state,
      );

      // If we got numbers or got an actual error, stop retrying
      if (
        availableNumbers.available_phone_numbers &&
        availableNumbers.available_phone_numbers.length > 0
      ) {
        break;
      }

      // If we got an API error, don't retry
      if (availableNumbers.error || availableNumbers.error_message) {
        break;
      }
    }

    // Check for Twilio API errors
    if (availableNumbers.error || availableNumbers.error_message) {
      return res.status(400).json({
        error:
          availableNumbers.error_message ||
          availableNumbers.error ||
          "Failed to fetch numbers from Twilio",
      });
    }

    // Validate response structure
    if (
      !availableNumbers ||
      !availableNumbers.available_phone_numbers ||
      !Array.isArray(availableNumbers.available_phone_numbers)
    ) {
      return res.json({ numbers: [] });
    }

    // Twilio returns available_phone_numbers as an array of region objects
    // Each region object contains phone numbers
    const allNumbers: AvailablePhoneNumber[] = [];

    for (const region of availableNumbers.available_phone_numbers) {
      // Handle both structures:
      // 1. Direct phone numbers in the region object (newer API)
      // 2. Nested available_phone_numbers array (older API)

      const parseCapabilities = (caps: any) => {
        if (Array.isArray(caps)) {
          // Capabilities come as array of strings: ["SMS", "Voice", "MMS"]
          return {
            SMS: caps.includes("SMS"),
            MMS: caps.includes("MMS"),
            voice: caps.includes("Voice"),
            fax: caps.includes("Fax"),
          };
        } else if (typeof caps === "object" && caps !== null) {
          // Capabilities come as object properties
          return {
            SMS: caps.SMS === true,
            MMS: caps.MMS === true,
            voice: caps.voice === true || caps.Voice === true,
            fax: caps.fax === true || caps.Fax === true,
          };
        }
        // Default: no capabilities
        return { SMS: false, MMS: false, voice: false, fax: false };
      };

      if (region.phone_number) {
        // This is a direct phone number object
        const caps = parseCapabilities(region.capabilities);
        allNumbers.push({
          phoneNumber: region.phone_number,
          friendlyName: region.friendly_name || region.phone_number,
          locality: region.locality || "",
          region: region.region || "",
          postalCode: region.postal_code || "",
          countryCode: countryCode,
          cost: region.price || "1.00",
          capabilities: caps,
        });
      } else if (
        region.available_phone_numbers &&
        Array.isArray(region.available_phone_numbers)
      ) {
        // This is a region object with nested phone numbers
        const regionNumbers = region.available_phone_numbers.map((num: any) => {
          const caps = parseCapabilities(num.capabilities);
          return {
            phoneNumber: num.phone_number,
            friendlyName: num.friendly_name || num.phone_number,
            locality: num.locality || "",
            region: num.region || "",
            postalCode: num.postal_code || "",
            countryCode: countryCode,
            cost: num.price || "1.00",
            capabilities: caps,
          };
        });
        allNumbers.push(...regionNumbers);
      }
    }

    // Filter numbers by state/province if specified
    let filteredNumbers = allNumbers;
    if (state) {
      // Create a mapping of state codes to their region abbreviations
      const STATE_REGION_MAP: Record<string, string[]> = {
        // US states - use state abbreviation
        AL: ["AL"],
        AK: ["AK"],
        AZ: ["AZ"],
        AR: ["AR"],
        CA: ["CA"],
        CO: ["CO"],
        CT: ["CT"],
        DE: ["DE"],
        FL: ["FL"],
        GA: ["GA"],
        HI: ["HI"],
        ID: ["ID"],
        IL: ["IL"],
        IN: ["IN"],
        IA: ["IA"],
        KS: ["KS"],
        KY: ["KY"],
        LA: ["LA"],
        ME: ["ME"],
        MD: ["MD"],
        MA: ["MA"],
        MI: ["MI"],
        MN: ["MN"],
        MS: ["MS"],
        MO: ["MO"],
        MT: ["MT"],
        NE: ["NE"],
        NV: ["NV"],
        NH: ["NH"],
        NJ: ["NJ"],
        NM: ["NM"],
        NY: ["NY"],
        NC: ["NC"],
        ND: ["ND"],
        OH: ["OH"],
        OK: ["OK"],
        OR: ["OR"],
        PA: ["PA"],
        RI: ["RI"],
        SC: ["SC"],
        SD: ["SD"],
        TN: ["TN"],
        TX: ["TX"],
        UT: ["UT"],
        VT: ["VT"],
        VA: ["VA"],
        WA: ["WA"],
        WV: ["WV"],
        WI: ["WI"],
        WY: ["WY"],
        // Canadian provinces
        AB: ["AB", "Alberta"],
        BC: ["BC", "British Columbia"],
        MB: ["MB", "Manitoba"],
        NB: ["NB", "New Brunswick"],
        NL: ["NL", "Newfoundland and Labrador"],
        NS: ["NS", "Nova Scotia"],
        ON: ["ON", "Ontario"],
        PE: ["PE", "Prince Edward Island"],
        QC: ["QC", "Quebec"],
        SK: ["SK", "Saskatchewan"],
      };

      const regionCodes = STATE_REGION_MAP[state] || [state];
      filteredNumbers = allNumbers.filter((num) => {
        // For countries that use state codes, filter strictly
        if (countryCode === "US" || countryCode === "CA") {
          const numberRegion = num.region?.toUpperCase() || "";
          return regionCodes.some((code) => numberRegion.includes(code));
        }
        // For other countries (AU, GB, etc), return all numbers since they're already filtered by location
        return true;
      });

      console.log(
        `Filtered ${allNumbers.length} numbers to ${filteredNumbers.length} for state ${state}`,
      );
    }

    res.json({ numbers: filteredNumbers });
  } catch (error) {
    console.error("Get available numbers error:", error);
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Failed to fetch available numbers";
    res.status(500).json({
      error: errorMessage,
      details: "Please ensure your Twilio credentials are valid",
    });
  }
};

export const handlePurchaseNumber: RequestHandler = async (req, res) => {
  try {
    const adminId = req.userId!;
    const { phoneNumber, cost } = req.body as {
      phoneNumber: string;
      cost: number;
    };

    if (!phoneNumber || cost === undefined) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Check if number is already purchased in the system
    const numbers = await storage.getPhoneNumbersByAdminId(adminId);
    if (numbers.some((n) => n.phoneNumber === phoneNumber)) {
      return res
        .status(400)
        .json({ error: "This number is already purchased by you" });
    }

    // Get admin's Twilio credentials
    const credentials = await storage.getTwilioCredentialsByAdminId(adminId);
    if (!credentials) {
      return res
        .status(400)
        .json({ error: "Please connect your Twilio credentials first" });
    }

    // Validate that credentials have the required fields
    if (!credentials.accountSid || !credentials.authToken) {
      return res.status(400).json({
        error: "Incomplete Twilio credentials. Please reconnect your account.",
      });
    }

    // Decrypt the auth token
    const decryptedAuthToken = decrypt(credentials.authToken);

    // Additional validation for decrypted token
    if (!decryptedAuthToken || decryptedAuthToken.trim().length === 0) {
      return res.status(400).json({
        error: "Invalid Twilio auth token. Please reconnect your credentials.",
      });
    }

    // Purchase number from Twilio
    const twilioClient = new TwilioClient(
      credentials.accountSid,
      decryptedAuthToken,
    );
    const purchaseResponse =
      await twilioClient.purchasePhoneNumber(phoneNumber);

    if (purchaseResponse.error || purchaseResponse.error_message) {
      return res.status(400).json({
        error: purchaseResponse.error_message || purchaseResponse.error,
      });
    }

    // Store phone number in database
    const newPhoneNumber: PhoneNumber = {
      id: storage.generateId(),
      adminId,
      phoneNumber,
      purchasedAt: new Date().toISOString(),
      active: true,
    };

    await storage.addPhoneNumber(newPhoneNumber);

    res.json({ phoneNumber: newPhoneNumber });
  } catch (error) {
    console.error("Purchase number error:", error);
    res.status(500).json({ error: "Failed to purchase number" });
  }
};

/**
 * Add an existing phone number to the database
 * Used when you want to add a number that already exists in your Twilio account
 */
export const handleAddPhoneNumber: RequestHandler = async (req, res) => {
  try {
    const adminId = req.userId!;
    const { phoneNumber } = req.body as { phoneNumber: string };

    if (!phoneNumber) {
      return res.status(400).json({ error: "Phone number is required" });
    }

    // Check if number is already in the system
    const existingNumbers = await storage.getPhoneNumbersByAdminId(adminId);
    if (
      existingNumbers.some(
        (n) =>
          n.phoneNumber === phoneNumber || n.phoneNumber === phoneNumber.replace(/\D/g, ""),
      )
    ) {
      return res
        .status(400)
        .json({ error: "This number is already registered in your account" });
    }

    // Get admin's Twilio credentials
    const credentials = await storage.getTwilioCredentialsByAdminId(adminId);
    if (!credentials) {
      return res
        .status(400)
        .json({ error: "Please connect your Twilio credentials first" });
    }

    // Validate that credentials have the required fields
    if (!credentials.accountSid || !credentials.authToken) {
      return res.status(400).json({
        error: "Incomplete Twilio credentials. Please reconnect your account.",
      });
    }

    // Decrypt the auth token
    const decryptedAuthToken = decrypt(credentials.authToken);

    // Additional validation for decrypted token
    if (!decryptedAuthToken || decryptedAuthToken.trim().length === 0) {
      return res.status(400).json({
        error: "Invalid Twilio auth token. Please reconnect your credentials.",
      });
    }

    // Verify the number belongs to this Twilio account
    const twilioClient = new TwilioClient(
      credentials.accountSid,
      decryptedAuthToken,
    );

    const ownsNumber = await twilioClient.verifyPhoneNumberOwnership(
      phoneNumber,
    );
    if (!ownsNumber) {
      return res.status(400).json({
        error: "This phone number does not belong to your Twilio account",
      });
    }

    // Store phone number in database
    const newPhoneNumber: PhoneNumber = {
      id: storage.generateId(),
      adminId,
      phoneNumber,
      purchasedAt: new Date().toISOString(),
      active: true,
    };

    await storage.addPhoneNumber(newPhoneNumber);

    res.json({
      phoneNumber: newPhoneNumber,
      message: "Phone number added successfully",
    });
  } catch (error) {
    console.error("Add phone number error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to add phone number";
    res.status(500).json({ error: errorMessage });
  }
};

/**
 * Sync all existing phone numbers from Twilio account to the database
 * This adds all active numbers from your Twilio account that aren't already registered
 */
export const handleSyncPhoneNumbers: RequestHandler = async (req, res) => {
  try {
    const adminId = req.userId!;

    // Get admin's Twilio credentials
    const credentials = await storage.getTwilioCredentialsByAdminId(adminId);
    if (!credentials) {
      return res
        .status(400)
        .json({ error: "Please connect your Twilio credentials first" });
    }

    // Validate that credentials have the required fields
    if (!credentials.accountSid || !credentials.authToken) {
      return res.status(400).json({
        error: "Incomplete Twilio credentials. Please reconnect your account.",
      });
    }

    // Decrypt the auth token
    const decryptedAuthToken = decrypt(credentials.authToken);

    // Additional validation for decrypted token
    if (!decryptedAuthToken || decryptedAuthToken.trim().length === 0) {
      return res.status(400).json({
        error: "Invalid Twilio auth token. Please reconnect your credentials.",
      });
    }

    // Fetch all incoming phone numbers from Twilio
    const twilioClient = new TwilioClient(
      credentials.accountSid,
      decryptedAuthToken,
    );

    const incomingPhoneNumbers = await twilioClient.getAllIncomingPhoneNumbers();

    if (!incomingPhoneNumbers || incomingPhoneNumbers.length === 0) {
      return res.json({
        message: "No phone numbers found in your Twilio account",
        synced: [],
      });
    }

    // Get existing numbers
    const existingNumbers = await storage.getPhoneNumbersByAdminId(adminId);
    const existingPhoneStrings = existingNumbers.map((n) => n.phoneNumber);

    // Add new numbers
    const syncedNumbers: PhoneNumber[] = [];
    for (const twilioNumber of incomingPhoneNumbers) {
      if (!existingPhoneStrings.includes(twilioNumber)) {
        const newPhoneNumber: PhoneNumber = {
          id: storage.generateId(),
          adminId,
          phoneNumber: twilioNumber,
          purchasedAt: new Date().toISOString(),
          active: true,
        };

        await storage.addPhoneNumber(newPhoneNumber);
        syncedNumbers.push(newPhoneNumber);
        console.log(`[Sync] Added phone number: ${twilioNumber}`);
      }
    }

    res.json({
      message: `Synced ${syncedNumbers.length} new phone number(s)`,
      synced: syncedNumbers,
      total: existingNumbers.length + syncedNumbers.length,
    });
  } catch (error) {
    console.error("Sync phone numbers error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to sync phone numbers";
    res.status(500).json({ error: errorMessage });
  }
};
