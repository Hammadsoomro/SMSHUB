import { RequestHandler } from "express";
import { storage } from "../storage";
import { TwilioClient } from "../twilio";
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

    // Fetch available numbers from Twilio
    const twilioClient = new TwilioClient(
      credentials.accountSid,
      credentials.authToken,
    );
    let availableNumbers = await twilioClient.getAvailableNumbers(countryCode, false, state);

    // If no numbers found and it's US/CA, try alternative area codes
    if (
      (!availableNumbers.available_phone_numbers ||
        availableNumbers.available_phone_numbers.length === 0) &&
      (countryCode === "US" || countryCode === "CA")
    ) {
      const fallbackClient = new TwilioClient(
        credentials.accountSid,
        credentials.authToken,
      );
      availableNumbers = await fallbackClient.getAvailableNumbers(
        countryCode,
        true,
        state,
      );
    }

    // Check for Twilio API errors
    if (availableNumbers.error || availableNumbers.error_message) {
      console.error("Twilio API error:", availableNumbers);
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
      console.warn(
        "No phone numbers available for country:",
        countryCode,
        "Response:",
        availableNumbers,
      );
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

    if (allNumbers.length === 0) {
      console.warn("No phone numbers found for country:", countryCode);
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
        // Check if the number's region matches the requested state
        const numberRegion = num.region?.toUpperCase() || "";
        return regionCodes.some((code) => numberRegion.includes(code));
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

    // Get wallet
    const wallet = await storage.getOrCreateWallet(adminId);
    if (wallet.balance < cost) {
      return res.status(400).json({ error: "Insufficient wallet balance" });
    }

    // Get admin's Twilio credentials
    const credentials = await storage.getTwilioCredentialsByAdminId(adminId);
    if (!credentials) {
      return res
        .status(400)
        .json({ error: "Please connect your Twilio credentials first" });
    }

    // Purchase number from Twilio
    const twilioClient = new TwilioClient(
      credentials.accountSid,
      credentials.authToken,
    );
    const purchaseResponse =
      await twilioClient.purchasePhoneNumber(phoneNumber);

    if (purchaseResponse.error || purchaseResponse.error_message) {
      return res.status(400).json({
        error: purchaseResponse.error_message || purchaseResponse.error,
      });
    }

    // Deduct from wallet
    const newBalance = wallet.balance - cost;
    await storage.updateWalletBalance(adminId, newBalance);

    // Add transaction record
    await storage.addWalletTransaction({
      id: storage.generateId(),
      adminId,
      type: "debit",
      amount: cost,
      description: `Phone number purchased: ${phoneNumber}`,
      reference: phoneNumber,
      createdAt: new Date().toISOString(),
    });

    // Store phone number in database
    const newPhoneNumber: PhoneNumber = {
      id: storage.generateId(),
      adminId,
      phoneNumber,
      purchasedAt: new Date().toISOString(),
      active: true,
    };

    await storage.addPhoneNumber(newPhoneNumber);

    res.json({ phoneNumber: newPhoneNumber, wallet: { balance: newBalance } });
  } catch (error) {
    console.error("Purchase number error:", error);
    res.status(500).json({ error: "Failed to purchase number" });
  }
};
